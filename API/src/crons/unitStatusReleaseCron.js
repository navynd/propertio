const cron = require('node-cron')
const mongoose = require('mongoose')
const ProjectUnit = require('../models/projectUnitModel')
const Inquirys = require('../models/inquirysModel')
const Agents = require('../models/agentsModel')
const Newprojects = require('../models/newprojectsModel')
const { logger } = require('../utils/logger')
const {
  sendUnitExpiryWarningEmail,
  sendUnitAutoReleasedEmail
} = require('../services/emailService')

// Statuses that are time-bound and can auto-expire.
const EXPIRABLE_STATUSES = ['reserved', 'in-progress', 'follow-up']

// Grace window (in days) after first expiry warning.
// During grace, unit remains in same status.
const GRACE_PERIOD_DAYS = {
  reserved: 1,
  'in-progress': 2,
  'follow-up': 5
}

// Human labels used in emails/logs.
const STATUS_LABELS = {
  reserved: 'Reserved',
  'in-progress': 'In-Progress',
  'follow-up': 'Follow Up'
}

const DAY_IN_MS = 24 * 60 * 60 * 1000
// In-process overlap guard. Prevents the same cron from running twice
// concurrently in one Node process (e.g., if one run takes > 1 hour).
let isUnitStatusCronRunning = false

/**
 * PHASE 1 - Atomic claim helper
 * Claims exactly one expired unit that has not yet been notified.
 *
 * Why `findOneAndUpdate` instead of find + update:
 * - Avoids duplicate handling when multiple app instances run the same cron.
 * - The first worker that flips `statusExpiryNotificationSent` wins the claim.
 *
 * Returns:
 * - The document BEFORE update (`new: false`), so we can still read old
 *   status and old `statusExpiresAt` to compute grace correctly.
 */
const processNextExpiredUnit = async (now) => {
  // Atomic claim: once this flips to true, parallel workers cannot claim same unit.
  const unit = await ProjectUnit.findOneAndUpdate(
    {
      status: { $in: EXPIRABLE_STATUSES },
      statusExpiresAt: { $lte: now },
      statusExpiryNotificationSent: false,
      isActive: true
    },
    {
      $set: {
        statusExpiryNotificationSent: true
      }
    },
    {
      new: false,
      sort: { statusExpiresAt: 1 },
      projection: {
        _id: 1,
        status: 1,
        statusExpiresAt: 1,
        statusUpdatedBy: 1,
        unitNumber: 1,
        unitId: 1,
        project: 1
      }
    }
  ).lean()

  return unit
}

/**
 * PHASE 1 - Send expiry warning and move unit into grace period.
 *
 * Flow:
 * 1) Claim one eligible unit atomically.
 * 2) Extend `statusExpiresAt` by grace days (based on ORIGINAL expiry).
 * 3) Mirror new expiry to linked open project inquiry.
 * 4) Send warning email to the responsible agent (if available).
 * 5) Repeat until no claimable unit remains.
 */
const notifyExpiredUnits = async () => {
  const now = new Date()
  let processed = 0

  try {
    // "Pull" loop pattern:
    // continue claiming one record at a time until queue is empty.
    while (true) {
      const unit = await processNextExpiredUnit(now)
      if (!unit) break

      try {
        // Grace extension is based on previous expiry timestamp, not on `now`.
        // This prevents accidental extra grace if cron runs late.
        const graceDays = GRACE_PERIOD_DAYS[unit.status]
        const newExpiresAt = new Date(
          new Date(unit.statusExpiresAt).getTime() + graceDays * DAY_IN_MS
        )

        // Persist extended expiry on unit.
        await ProjectUnit.findByIdAndUpdate(unit._id, {
          $set: { statusExpiresAt: newExpiresAt }
        })

        // Keep inquiry expiry aligned with unit expiry for consistent lead state.
        await Inquirys.findOneAndUpdate(
          {
            unit: unit._id,
            inquiryCategory: 'project',
            status: { $ne: 'closed' }
          },
          {
            $set: {
              statusExpiresAt: newExpiresAt
            }
          }
        )

        if (unit.statusUpdatedBy) {
          // Fetch agent and project in parallel to reduce latency.
          const [agent, project] = await Promise.all([
            Agents.findById(unit.statusUpdatedBy).select('fullName email').lean(),
            Newprojects.findById(unit.project).select('projectName').lean()
          ])

          if (agent?.email) {
            // Warning email communicates grace window before auto-release.
            await sendUnitExpiryWarningEmail(
              agent.email,
              agent.fullName,
              unit.unitNumber || unit.unitId,
              STATUS_LABELS[unit.status],
              graceDays,
              project?.projectName || 'N/A',
              newExpiresAt.toDateString()
            )
          }
        }

        processed += 1
      } catch (unitError) {
        // Unit-level isolation:
        // one bad document should not abort processing of remaining units.
        logger.error('Failed to notify unit expiry', {
          error: unitError.message,
          unitId: unit._id
        })
      }
    }

    logger.info(`Notified ${processed} expired units`)
  } catch (err) {
    logger.error('notifyExpiredUnits failed', {
      error: err.message
    })
  }
}

/**
 * PHASE 2 - Atomic release helper
 * Claims exactly one grace-expired unit and immediately flips it to available.
 *
 * Returns the PREVIOUS document (`new: false`) to retain:
 * - previous status (reserved/in-progress/follow-up)
 * - previous responsible agent
 * which are needed for counters and notification email.
 */
const processNextGraceExpiredUnit = async (now) => {
  // Atomic release claim: update happens here, returned doc preserves previous values.
  const unit = await ProjectUnit.findOneAndUpdate(
    {
      status: { $in: EXPIRABLE_STATUSES },
      statusExpiresAt: { $lte: now },
      statusExpiryNotificationSent: true,
      isActive: true
    },
    {
      $set: {
        status: 'available',
        statusExpiresAt: null,
        statusUpdatedAt: now,
        statusUpdatedBy: null,
        statusUpdatedByAgency: null,
        statusNote: null,
        statusExpiryNotificationSent: false,
        'statusNoteVisibleTo.agent': null,
        'statusNoteVisibleTo.agency': null
      },
      $push: {
        statusHistory: {
          status: 'available',
          changedAt: now,
          // Human-readable trace for audit and support.
          note: 'Auto-released after grace period expiry'
        }
      }
    },
    {
      new: false,
      sort: { statusExpiresAt: 1 },
      projection: {
        _id: 1,
        status: 1,
        project: 1,
        unitNumber: 1,
        unitId: 1,
        statusUpdatedBy: 1
      }
    }
  ).lean()

  return unit
}

/**
 * PHASE 2 - Release units whose grace also expired.
 *
 * For each claimed unit:
 * - Unit is already switched to `available` atomically.
 * - Then we transactionally update dependent data:
 *   a) linked inquiry state
 *   b) cached project unit counters
 *
 * Email is intentionally sent OUTSIDE DB transaction:
 * - DB consistency should not depend on external email provider.
 */
const releaseExpiredUnits = async () => {
  const now = new Date()
  let released = 0

  try {
    // Claim/release queue loop.
    while (true) {
      const unit = await processNextGraceExpiredUnit(now)
      if (!unit) break

      const previousStatus = unit.status
      const session = await mongoose.startSession()

      try {
        // Keep inquiry + project counter updates in one transaction.
        await session.withTransaction(async () => {
          const inquiry = await Inquirys.findOne({
            unit: unit._id,
            inquiryCategory: 'project',
            status: { $ne: 'closed' }
          })
            .select('_id')
            .session(session)
            .lean()

          if (inquiry) {
            await Inquirys.findByIdAndUpdate(
              inquiry._id,
              {
                $set: {
                  projectLeadStatus: 'available',
                  status: 'new',
                  unit: null,
                  statusExpiresAt: null,
                  attendedAt: null
                },
                $push: {
                  statusHistory: {
                    status: 'available',
                    changedAt: now,
                    // Inquiry has `notes` field (not `note`) in status history schema.
                    notes: `Auto-released - ${previousStatus} period expired`
                  }
                }
              },
              { session }
            )
          }

          const projectCountUpdate = {
            $inc: { availableUnits: 1 }
          }
          // Only `reserved` has dedicated counter on Newprojects.
          // in-progress/follow-up are transient and not separately cached.
          if (previousStatus === 'reserved') {
            projectCountUpdate.$inc.reservedUnits = -1
          }

          await Newprojects.findByIdAndUpdate(
            unit.project,
            projectCountUpdate,
            { session }
          )
        })

        if (unit.statusUpdatedBy) {
          // Fetch in parallel to minimize time before cron continues.
          const [agent, project] = await Promise.all([
            Agents.findById(unit.statusUpdatedBy).select('fullName email').lean(),
            Newprojects.findById(unit.project).select('projectName').lean()
          ])

          if (agent?.email) {
            await sendUnitAutoReleasedEmail(
              agent.email,
              agent.fullName,
              unit.unitNumber || unit.unitId,
              STATUS_LABELS[previousStatus] || previousStatus,
              project?.projectName || 'N/A',
              now.toDateString()
            ).catch((emailErr) => {
              // Email failures are logged but do not rollback successful DB updates.
              logger.error('Release email failed', {
                error: emailErr.message,
                unitId: unit._id
              })
            })
          }
        }

        released += 1
        logger.info('Unit auto-released', {
          unitId: unit._id,
          previousStatus,
          releasedAt: now
        })
      } catch (err) {
        // Per-unit isolation to continue releasing other units.
        logger.error('Failed to release unit', {
          error: err.message,
          unitId: unit._id
        })
      } finally {
        // Always release server session resources.
        session.endSession()
      }
    }

    logger.info(`Released ${released} units`)
  } catch (err) {
    logger.error('releaseExpiredUnits failed', {
      error: err.message
    })
  }
}

// Runs every hour at minute 0 in UAE time.
// Cron expression: minute hour day month dayOfWeek
// '0 * * * *' => 00th minute of every hour.
const startUnitStatusReleaseCron = () => {
  cron.schedule(
    '0 * * * *',
    async () => {
      // Guard against overlapping runs in same process.
      if (isUnitStatusCronRunning) {
        logger.warn('Unit status release cron skipped - previous run still active')
        return
      }

      isUnitStatusCronRunning = true

      logger.info('Unit status release cron started', {
        timestamp: new Date()
      })

      try {
        // Strict order matters:
        // 1) notify + start grace
        // 2) release units whose grace had already ended
        await notifyExpiredUnits()
        await releaseExpiredUnits()
      } catch (err) {
        logger.error('Unit status release cron failed', {
          error: err.message
        })
      } finally {
        isUnitStatusCronRunning = false
      }

      logger.info('Unit status release cron completed', {
        timestamp: new Date()
      })
    },
    {
      timezone: 'Asia/Dubai'
    }
  )

  logger.info('Unit status release cron registered', {
    schedule: '0 * * * *',
    timezone: 'Asia/Dubai'
  })
}

module.exports = { startUnitStatusReleaseCron }
