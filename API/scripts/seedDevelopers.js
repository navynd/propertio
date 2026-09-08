const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectToDatabase } = require('../src/config/db');
const Developer = require('../src/models/developersModel');

async function seedDevelopers(count = 10) {
  try {
    await connectToDatabase();

    const passwordPlain = 'Password123';
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    const developers = [];

    for (let i = 1; i <= count; i += 1) {
      const name = `Test Developer ${i}`;
      const email = `dev${i}@example.com`;
      const slug = `test-developer-${i}`;

      developers.push({
        name,
        email,
        slug,
        phoneNumber: `+9715000000${String(i).padStart(2, '0')}`,
        foundedYear: 2000 + i,
        shortDescription: `Short description for ${name}`,
        longDescription: `Long description for ${name}. This is sample seeded data for testing purposes.`,
        description: `Profile description for ${name}`,
        address: {
          fullAddress: `Test Address ${i}, Dubai, UAE`,
          street: `Street ${i}`,
          city: 'Dubai',
          state: 'Dubai',
          country: 'UAE',
          zipCode: '00000',
        },
        password: passwordHash,
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true,
        invitationStatus: 'accepted',
        isActive: true,
      });
    }

    const result = await Developer.insertMany(developers);

    // eslint-disable-next-line no-console
    console.log(`Successfully seeded ${result.length} developers.`);
    // eslint-disable-next-line no-console
    console.log('Login credentials (all use the same password):');
    // eslint-disable-next-line no-console
    result.forEach((dev) => {
      console.log(`- ${dev.name}: ${dev.email} / ${passwordPlain}`);
    });

    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to seed developers:', err);
    process.exit(1);
  }
}

seedDevelopers(10);

