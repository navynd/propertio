/* eslint-disable no-console */
// Load env from project root `.env` (one level up from scripts/)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const { connectToDatabase } = require('../src/config/db');
const Properties = require('../src/models/propertiesModal');
const ListingType = require('../src/models/listingTypeModel');
const PropertyType = require('../src/models/propertyTypeModel');
const Amenities = require('../src/models/amenitiesModel');
const Agencies = require('../src/models/agenciesModel');
const Agents = require('../src/models/agentsModel');
const { generateSlug } = require('../src/utils/helpers');

const SAMPLE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'];
const SAMPLE_ZONES = ['Downtown', 'Marina', 'Business Bay', 'JVC', 'Palm Jumeirah'];
const SAMPLE_BUILDINGS = ['Tower A', 'Tower B', 'Residences 1', 'Residences 2', 'Plaza'];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBool(probabilityTrue = 0.5) {
  return Math.random() < probabilityTrue;
}

function buildImagesForSeedIndex(seedIndex) {
  const images = [];
  for (let i = 1; i <= 5; i += 1) {
    const index = String(i).padStart(2, '0');
    images.push({
      url: `demo-property-${String(seedIndex).padStart(4, '0')}-image${index}.webp`,
      isPrimary: i === 1,
      order: i,
      caption: `Image ${i} for demo property ${seedIndex}`,
    });
  }
  return images;
}

async function main() {
  await connectToDatabase();

  const [listingTypes, propertyTypes, amenities, agencies, agents] = await Promise.all([
    ListingType.find({ isActive: true }).lean(),
    PropertyType.find({ isActive: true }).lean(),
    Amenities.find({ isActive: true }).lean(),
    Agencies.find({ isActive: true }).limit(10).lean(),
    Agents.find({ isActive: true }).limit(50).lean(),
  ]);

  // Exclude specific listingType that should not be used for properties
  const excludedListingTypeId = '6981b609f4c4cdca1ad38cd8';
  const allowedListingTypes = listingTypes.filter(
    (lt) => lt._id.toString() !== excludedListingTypeId,
  );

  if (!allowedListingTypes.length || !propertyTypes.length) {
    console.error('ListingType or PropertyType data missing; cannot seed properties.');
    process.exit(1);
  }

  if (!agencies.length || !agents.length) {
    console.error('Agencies or Agents not found; create some first before seeding properties.');
    process.exit(1);
  }

  const docs = [];
  const totalToCreate = 50;

  for (let i = 0; i < totalToCreate; i += 1) {
    const seedIndex = i + 1;
    const listingType = pickRandom(allowedListingTypes);
    const propertyType = pickRandom(propertyTypes);
    const agency = pickRandom(agencies);

    // pick agent belonging to this agency if possible, else any
    const agentsForAgency = agents.filter((a) => a.agency && a.agency.toString() === agency._id.toString());
    const agent = agentsForAgency.length ? pickRandom(agentsForAgency) : pickRandom(agents);

    const bedrooms = randomInt(0, 5);
    const bathrooms = randomInt(1, 5);
    const areaSqm = randomInt(40, 400);
    const price = listingType.transaction === 'rent'
      ? randomInt(3000, 30000)
      : randomInt(300000, 5000000);

    const city = pickRandom(SAMPLE_CITIES);
    const zone = pickRandom(SAMPLE_ZONES);
    const building = pickRandom(SAMPLE_BUILDINGS);

    const title = `${bedrooms || 0}BR ${propertyType.name} in ${zone}, ${city} (${listingType.transaction})`;
    const baseSlug = generateSlug(title);
    const slug = `${baseSlug}-${Date.now()}-${i}`;

    // IMPORTANT: image filenames must be stable across seed runs so they match what you upload to S3.
    // We intentionally do NOT include slug/timestamps in the filenames.
    const images = buildImagesForSeedIndex(seedIndex);

    // pick a random subset of amenities (0–6 per property)
    let amenityIds = [];
    if (amenities.length) {
      const shuffledAmenities = [...amenities].sort(() => Math.random() - 0.5);
      const count = randomInt(0, Math.min(6, shuffledAmenities.length));
      amenityIds = shuffledAmenities.slice(0, count).map((a) => a._id);
    }

    // Optional tours & floorplans
    const hasVirtualTour = randomBool(0.3);
    const hasVideoTour = randomBool(0.4);
    const floorPlanCount = randomInt(0, 3);
    const floorPlan = [];
    for (let fp = 1; fp <= floorPlanCount; fp += 1) {
      // We only need placeholder filenames for floorplans; images will be uploaded later if needed.
      floorPlan.push(`demo-property-${String(seedIndex).padStart(4, '0')}-floorplan-${fp}.webp`);
    }

    const lat = 25 + Math.random(); // rough UAE-ish region
    const lng = 55 + Math.random();

    docs.push({
      title,
      description: `Demo listing ${i + 1} - ${propertyType.name} for ${listingType.transaction} in ${zone}, ${city}.`,
      listingType: listingType._id,
      propertyType: propertyType._id,
      agent: agent._id,
      agency: agency._id,
      bedrooms,
      maidBedroom: randomBool(0.2),
      bathrooms,
      area: {
        sqm: areaSqm,
        sqft: Math.round(areaSqm * 10.7639),
      },
      amenities: amenityIds,
      price,
      maintenanceFees: listingType.transaction === 'rent' ? randomInt(0, 2000) : undefined,
      serviceCharges: listingType.transaction === 'buy' ? randomInt(0, 5000) : undefined,
      currency: 'AED',
      images,
      virtualTour360: hasVirtualTour ? `https://virtual.example.com/${slug}` : null,
      videoTour: hasVideoTour ? `https://video.example.com/${slug}.mp4` : null,
      floorPlan,
      location: {
        fullAddress: `${building}, ${zone}, ${city}`,
        city,
        zone,
        building,
        googlePlaceId: randomBool(0.5) ? `demo-place-id-${i}` : undefined,
        coordinates: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      },
      dldPermitNumber: `DEMO-${i + 1}`.padEnd(10, '0'),
      dldPermitUrl: `https://dld.example.com/permit/DEMO-${i + 1}`,
      referenceId: `REF-${i + 1}`,
      isActive: true,
      status: 'active',
      completionStatus: randomBool(0.5) ? 'ready' : 'off-plan',
      furnishedStatus: pickRandom(['fully', 'partially', 'unfurnished']),
      isPetFriendly: randomBool(0.5),
      isWaterfront: randomBool(0.2),
      isFeatured: randomBool(0.3),
      isVerified: randomBool(0.4),
      isSuperagentListing: agent.agentType === 'superagent',
      featured: {
        isFeatured: randomBool(0.3),
        priority: randomInt(0, 10),
      },
      views: randomInt(0, 500),
      likes: randomInt(0, 100),
      inquiries: randomInt(0, 50),
      shares: randomInt(0, 20),
      slug,
      publishedAt: new Date(Date.now() - randomInt(0, 60) * 24 * 60 * 60 * 1000),
      metaTitle: `${title} | Demo Property`,
      metaDescription: `Demo SEO description for ${title}.`,
      metaKeywords: ['demo', propertyType.slug, listingType.slug, city, zone],
    });
  }

  const inserted = await Properties.insertMany(docs, { ordered: false });
  console.log(`Inserted ${inserted.length} demo properties.`);

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed', err);
  mongoose.connection.close().then(() => process.exit(1));
});

