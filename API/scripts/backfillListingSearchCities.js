/**
 * One-time backfill: rebuild `listing_search_cities` from existing listings.
 * Uses the same normalization as listingSearchCityService (cityKey + displayName).
 *
 * Run (from repo root, with MONGODB_URI in .env):
 *   node scripts/backfillListingSearchCities.js
 *
 * Optional: wipe index first then rebuild (recommended if you had test bumps):
 *   node scripts/backfillListingSearchCities.js --reset
 *
 * ---
 * Approximate mongosh-only alternative (does NOT match NFKC / multi-space collapse):
 *
 * // Property counts (active listings with a city)
 * db.properties.aggregate([
 *   { $match: { status: "active", "location.city": { $type: "string", $ne: "" } } },
 *   { $project: { c: { $trim: { input: "$location.city" } } } },
 *   { $match: { c: { $ne: "" } } },
 *   { $group: { _id: { $toLower: "$c" }, n: { $sum: 1 }, label: { $first: "$c" } } }
 * ]);
 *
 * // Project counts (published + active)
 * db.newprojects.aggregate([
 *   { $match: { isActive: true, publishStatus: "published",
 *       "location.city": { $type: "string", $ne: "" } } },
 *   { $project: { c: { $trim: { input: "$location.city" } } } },
 *   { $match: { c: { $ne: "" } } },
 *   { $group: { _id: { $toLower: "$c" }, n: { $sum: 1 }, label: { $first: "$c" } } }
 * ]);
 *
 * Merge those two result sets in application code or $merge into listing_search_cities
 * with $set on propertyCount / projectCount. The Node script below is authoritative.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { connectToDatabase } = require('../src/config/db');
const Properties = require('../src/models/propertiesModal');
const Newprojects = require('../src/models/newprojectsModel');
const ListingSearchCity = require('../src/models/listingSearchCityModel');
const {
  normalizeCityKey,
  toDisplayName,
} = require('../src/services/listingSearchCityService');

async function countPropertyCities() {
  const map = new Map();
  const cursor = Properties.find({ status: 'active' })
    .select('location.city')
    .lean()
    .cursor();

  for await (const doc of cursor) {
    const raw = doc.location?.city;
    if (raw == null || typeof raw !== 'string') continue;
    const key = normalizeCityKey(raw);
    if (!key) continue;
    const label = toDisplayName(raw) || key;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { count: 1, displayName: label });
    } else {
      prev.count += 1;
    }
  }
  return map;
}

async function countProjectCities() {
  const map = new Map();
  const cursor = Newprojects.find({
    isActive: true,
    publishStatus: 'published',
  })
    .select('location.city')
    .lean()
    .cursor();

  for await (const doc of cursor) {
    const raw = doc.location?.city;
    if (raw == null || typeof raw !== 'string') continue;
    const key = normalizeCityKey(raw);
    if (!key) continue;
    const label = toDisplayName(raw) || key;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { count: 1, displayName: label });
    } else {
      prev.count += 1;
    }
  }
  return map;
}

async function main() {
  const reset = process.argv.includes('--reset');

  await connectToDatabase();

  if (reset) {
    await ListingSearchCity.deleteMany({});
    // eslint-disable-next-line no-console
    console.log('Cleared listing_search_cities.');
  }

  const propertyMap = await countPropertyCities();
  const projectMap = await countProjectCities();

  const keys = new Set([...propertyMap.keys(), ...projectMap.keys()]);
  let upserts = 0;

  for (const cityKey of keys) {
    const p = propertyMap.get(cityKey);
    const j = projectMap.get(cityKey);
    const displayName =
      (p && p.displayName) || (j && j.displayName) || cityKey;

    await ListingSearchCity.updateOne(
      { cityKey },
      {
        $set: {
          displayName,
          propertyCount: p ? p.count : 0,
          projectCount: j ? j.count : 0,
        },
      },
      { upsert: true },
    );
    upserts += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    `Done. Upserted ${upserts} city rows (${propertyMap.size} with properties, ${projectMap.size} with projects).`,
  );

  await mongoose.connection.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
