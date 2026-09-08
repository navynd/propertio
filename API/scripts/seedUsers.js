const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectToDatabase } = require('../src/config/db');
const Users = require('../src/models/usersModel');

async function seedUsers(count = 10) {
  try {
    await connectToDatabase();

    const passwordPlain = 'Password123';
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    const users = [];

    for (let i = 1; i <= count; i += 1) {
      const firstName = `Test`;
      const lastName = `User ${i}`;
      const email = `user${i}@example.com`;

      users.push({
        firstName,
        lastName,
        email,
        phoneNumber: `+9715300000${String(i).padStart(2, '0')}`,
        password: passwordHash,
        authProvider: 'email',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        isBanned: false,
        location: {
          city: 'Dubai',
          state: 'Dubai',
          country: 'UAE',
        },
      });
    }

    const result = await Users.insertMany(users);

    // eslint-disable-next-line no-console
    console.log(`Successfully seeded ${result.length} users.`);
    // eslint-disable-next-line no-console
    console.log('Login credentials (all use the same password):');
    result.forEach((u) => {
      console.log(`- ${u.firstName} ${u.lastName}: ${u.email} / ${passwordPlain}`);
    });

    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to seed users:', err);
    process.exit(1);
  }
}

seedUsers(10);
