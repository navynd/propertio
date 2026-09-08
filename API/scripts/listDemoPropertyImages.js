/* eslint-disable no-console */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { connectToDatabase } = require('../src/config/db');
const Properties = require('../src/models/propertiesModal');

async function main() {
  await connectToDatabase();

  // Adjust this filter if needed; seed script sets dldPermitNumber starting with "DEMO-"
  const props = await Properties.find({ dldPermitNumber: /^DEMO-/ })
    .select('title slug images floorPlan')
    .lean();

  console.log(`Found ${props.length} demo properties\n`);

  props.forEach((p) => {
    console.log(`Title: ${p.title}`);
    console.log(`Slug : ${p.slug}`);
    console.log('Images:');
    (p.images || []).forEach((img) => {
      console.log(`  - ${img.url}`);
    });
    if (p.floorPlan && p.floorPlan.length) {
      console.log('Floorplans:');
      p.floorPlan.forEach((fp) => console.log(`  - ${fp}`));
    }
    console.log('----------------------------------------');
  });

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to list images', err);
  mongoose.connection.close().then(() => process.exit(1));
});