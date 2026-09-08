/**
 * Assigns rotated UAE cities/zones to existing projects so master-data
 * `projectlocations` (and search filters) show more than one city.
 *
 * Usage (repo root, MONGODB_URI in .env):
 *   node scripts/diversifyProjectLocations.js
 *   node scripts/diversifyProjectLocations.js --dry-run
 *   node scripts/diversifyProjectLocations.js --all-active   # any isActive, not only published
 *
 * After running, refresh the index:
 *   node scripts/backfillListingSearchCities.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const { connectToDatabase } = require('../src/config/db');
const Newprojects = require('../src/models/newprojectsModel');
const { UAE_PROJECT_LOCATIONS } = require('./uaeDemoLocations');

function buildLocationPatch(loc) {
  return {
    'location.city': loc.city,
    'location.zone': loc.zone,
    'location.address': `${loc.zone}, ${loc.city}, UAE`,
    'location.coordinates': {
      type: 'Point',
      coordinates: [loc.lng, loc.lat],
    },
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const allActive = process.argv.includes('--all-active');

  await connectToDatabase();

  const filter = allActive ? { isActive: true } : { isActive: true, publishStatus: 'published' };

  const projects = await Newprojects.find(filter).sort({ _id: 1 }).select('projectName location').lean();

  if (!projects.length) {
    // eslint-disable-next-line no-console
    console.log('No projects matched filter. Try --all-active to include unpublished.');
    await mongoose.connection.close();
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`Updating ${projects.length} project(s)${dryRun ? ' (dry-run)' : ''}…`);

  for (let i = 0; i < projects.length; i += 1) {
    const loc = UAE_PROJECT_LOCATIONS[i % UAE_PROJECT_LOCATIONS.length];
    const patch = buildLocationPatch(loc);
    const metaPatch = {
      metaTitle: `${projects[i].projectName || 'Project'} in ${loc.city}`,
      metaDescription: `Discover ${projects[i].projectName || 'this project'} in ${loc.zone}, ${loc.city}.`,
      metaKeywords: ['seed', 'test', 'project', loc.city.toLowerCase().replace(/\s+/g, '-')],
    };

    // eslint-disable-next-line no-console
    console.log(
      `  [${i + 1}] ${projects[i]._id} → ${loc.city} / ${loc.zone}${dryRun ? '' : ''}`,
    );

    if (!dryRun) {
      await Newprojects.updateOne(
        { _id: projects[i]._id },
        { $set: { ...patch, ...metaPatch, lastModifiedAt: new Date() } },
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    dryRun
      ? 'Dry-run only; no writes. Remove --dry-run to apply.'
      : 'Done. Run: node scripts/backfillListingSearchCities.js',
  );

  await mongoose.connection.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
