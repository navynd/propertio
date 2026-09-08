const ListingSearchCity = require('../models/listingSearchCityModel');

function normalizeCityKey(city) {
  if (city == null || typeof city !== 'string') return null;
  const t = city.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!t) return null;
  return t.toLowerCase();
}

function toDisplayName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
}

async function bumpPropertyCity(cityRaw) {
  const cityKey = normalizeCityKey(cityRaw);
  if (!cityKey) return;
  const displayName = toDisplayName(cityRaw) || cityKey;
  await ListingSearchCity.findOneAndUpdate(
    { cityKey },
    {
      $setOnInsert: { displayName },
      $inc: { propertyCount: 1 },
    },
    { upsert: true },
  );
}

async function bumpProjectCity(cityRaw) {
  const cityKey = normalizeCityKey(cityRaw);
  if (!cityKey) return;
  const displayName = toDisplayName(cityRaw) || cityKey;
  await ListingSearchCity.findOneAndUpdate(
    { cityKey },
    {
      $setOnInsert: { displayName },
      $inc: { projectCount: 1 },
    },
    { upsert: true },
  );
}

/** Decrement propertyCount, floored at 0 (no-op if row missing). */
async function decrementPropertyCountByKey(cityKey) {
  if (!cityKey) return;
  await ListingSearchCity.updateOne(
    { cityKey },
    [
      {
        $set: {
          propertyCount: {
            $max: [{ $subtract: [{ $ifNull: ['$propertyCount', 0] }, 1] }, 0],
          },
        },
      },
    ],
  );
}

/** Decrement projectCount, floored at 0 (no-op if row missing). */
async function decrementProjectCountByKey(cityKey) {
  if (!cityKey) return;
  await ListingSearchCity.updateOne(
    { cityKey },
    [
      {
        $set: {
          projectCount: {
            $max: [{ $subtract: [{ $ifNull: ['$projectCount', 0] }, 1] }, 0],
          },
        },
      },
    ],
  );
}

/**
 * Keep listing_search_cities in sync when a property's city or active status changes.
 * Counted in search when status === 'active' (same as backfill / public search).
 */
async function reconcilePropertyListingCity({ prevCityRaw, nextCityRaw, prevStatus, nextStatus }) {
  const prevCounted = prevStatus === 'active';
  const nextCounted = nextStatus === 'active';
  const prevKey = normalizeCityKey(prevCityRaw);
  const nextKey = normalizeCityKey(nextCityRaw);

  if (prevCounted && !nextCounted && prevKey) {
    await decrementPropertyCountByKey(prevKey);
    return;
  }
  if (!prevCounted && nextCounted && nextKey) {
    await bumpPropertyCity(nextCityRaw);
    return;
  }
  if (prevCounted && nextCounted && prevKey !== nextKey) {
    if (prevKey) await decrementPropertyCountByKey(prevKey);
    if (nextKey) await bumpPropertyCity(nextCityRaw);
  }
}

/**
 * Keep listing_search_cities in sync when a published project's city changes.
 * Only projects with publishStatus === 'published' are counted (same as public search).
 */
async function reconcilePublishedProjectCity({ prevCityRaw, nextCityRaw, wasPublished, isPublished }) {
  const prevKey = normalizeCityKey(prevCityRaw);
  const nextKey = normalizeCityKey(nextCityRaw);

  if (wasPublished && isPublished && prevKey !== nextKey) {
    if (prevKey) await decrementProjectCountByKey(prevKey);
    if (nextKey) await bumpProjectCity(nextCityRaw);
  }
}

/** After hard-delete or when a counted listing is removed from public search. */
async function onPropertyRemovedFromSearch(cityRaw, wasActive) {
  if (!wasActive) return;
  const key = normalizeCityKey(cityRaw);
  if (key) await decrementPropertyCountByKey(key);
}

/** When a published project is removed from the catalogue (delete or future flows). */
async function onProjectRemovedFromSearch(cityRaw, wasPublished) {
  if (!wasPublished) return;
  const key = normalizeCityKey(cityRaw);
  if (key) await decrementProjectCountByKey(key);
}

module.exports = {
  normalizeCityKey,
  toDisplayName,
  bumpPropertyCity,
  bumpProjectCity,
  decrementPropertyCountByKey,
  decrementProjectCountByKey,
  reconcilePropertyListingCity,
  reconcilePublishedProjectCity,
  onPropertyRemovedFromSearch,
  onProjectRemovedFromSearch,
};
