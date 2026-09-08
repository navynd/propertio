const cron = require('node-cron')
const ProjectUnit = require('../models/projectUnitModel')
const Newprojects = require('../models/newprojectsModel')
const { logger } = require('../utils/logger')

/**
 * Daily safety-net reconciliation for cached unit counters on Newprojects.
 *
 * Why this exists:
 * - Runtime flows update counters using incremental `$inc`.
 * - If a write fails mid-flow (or due to race conditions), cached counts may drift.
 * - This job recalculates truth from ProjectUnit and corrects drift.
 */
const reconcileUnitCounts = async () => {
  const now = new Date()
  logger.info('Unit counts reconciliation started', {
    timestamp: now
  })

  try {
    // Only active projects are reconciled; inactive projects are ignored by design.
    const projects = await Newprojects.find({
      isActive: true
    })
      .select(
        `projectName totalUnits
         availableUnits reservedUnits soldUnits`
      )
      .lean()

    if (!projects.length) {
      logger.info('No projects to reconcile')
      return
    }

    logger.info(`Reconciling ${projects.length} projects`)

    let updatedCount = 0
    let skippedCount = 0

    // Process each project independently so one failure does not stop the batch.
    for (const project of projects) {
      try {
        // Compute actual counts directly from ProjectUnit as source of truth.
        // Running these in parallel keeps per-project runtime low.
        const [
          actualTotal,
          actualAvailable,
          actualReserved,
          actualSold
        ] = await Promise.all([
          ProjectUnit.countDocuments({
            project: project._id,
            isActive: true
          }),
          ProjectUnit.countDocuments({
            project: project._id,
            status: 'available',
            isActive: true
          }),
          ProjectUnit.countDocuments({
            project: project._id,
            status: 'reserved',
            isActive: true
          }),
          ProjectUnit.countDocuments({
            project: project._id,
            status: 'closed',
            isActive: true
          })
        ])

        // Compare cached values on project document vs actual unit counts.
        const hasMismatch =
          project.totalUnits !== actualTotal ||
          project.availableUnits !== actualAvailable ||
          project.reservedUnits !== actualReserved ||
          project.soldUnits !== actualSold

        if (!hasMismatch) {
          // No repair required for this project.
          skippedCount += 1
          continue
        }

        // Repair cached counters in one update.
        await Newprojects.findByIdAndUpdate(project._id, {
          $set: {
            totalUnits: actualTotal,
            availableUnits: actualAvailable,
            reservedUnits: actualReserved,
            soldUnits: actualSold
          }
        })

        updatedCount += 1

        // Keep before/after in logs to support audit and incident investigation.
        logger.info('Project counts reconciled', {
          projectId: project._id,
          projectName: project.projectName,
          before: {
            totalUnits: project.totalUnits,
            availableUnits: project.availableUnits,
            reservedUnits: project.reservedUnits,
            soldUnits: project.soldUnits
          },
          after: {
            totalUnits: actualTotal,
            availableUnits: actualAvailable,
            reservedUnits: actualReserved,
            soldUnits: actualSold
          }
        })
      } catch (projectError) {
        // Project-level isolation:
        // continue with remaining projects even if one fails.
        logger.error('Failed to reconcile project', {
          error: projectError.message,
          projectId: project._id
        })
      }
    }

    logger.info('Unit counts reconciliation completed', {
      totalProjects: projects.length,
      updated: updatedCount,
      skipped: skippedCount,
      timestamp: new Date()
    })
  } catch (err) {
    logger.error('reconcileUnitCounts failed', {
      error: err.message
    })
  }
}

// Runs once daily at 00:00 UAE time.
// Cron expression: minute hour day month dayOfWeek
// '0 0 * * *' => every day at midnight.
const startUnitCountsReconciliationCron = () => {
  cron.schedule(
    '0 0 * * *', 
    async () => {
      // Single entry point for daily repair cycle.
      await reconcileUnitCounts()
    },
    {
      // Explicit timezone avoids server-local timezone surprises.
      timezone: 'Asia/Dubai'
    }
  )

  logger.info('Unit counts reconciliation cron registered', {
    schedule: '0 0 * * *',
    timezone: 'Asia/Dubai'
  })
}

module.exports = { startUnitCountsReconciliationCron }
