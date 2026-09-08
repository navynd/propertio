const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

// Load environment variables from .env file manually or via dotenv
let mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^MONGODB_URI\s*=\s*(.+)$/m);
    if (match) {
      mongoUri = match[1].trim();
    }
  }
}

if (!mongoUri) {
  console.error('Error: MONGODB_URI is not defined in process.env or local .env file.');
  process.exit(1);
}

const email = 'propertioadmin@yopmail.com';
const plainPassword = 'admin@123';

async function seed() {
  const client = new MongoClient(mongoUri);

  try {
    console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]+)@/, ':***@')}...`);
    await client.connect();
    console.log('Connected successfully to database.');

    const db = client.db();
    const adminsCollection = db.collection('admins');

    // Hash the password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    // Look for existing admin with this email
    const existingAdmin = await adminsCollection.findOne({ email });

    if (existingAdmin) {
      console.log(`Admin user with email ${email} already exists. Updating credentials...`);
      await adminsCollection.updateOne(
        { _id: existingAdmin._id },
        {
          $set: {
            password: passwordHash,
            isActive: true,
            isSuperAdmin: true,
            updatedAt: new Date()
          }
        }
      );
      console.log('Admin user credentials updated successfully.');
    } else {
      console.log(`Creating new admin user with email ${email}...`);
      const newAdmin = {
        firstName: 'Propertio',
        lastName: 'Admin',
        email,
        phoneNumber: '+971501234567',
        password: passwordHash,
        avatar: 'https://example.com/avatar.png',
        isActive: true,
        isSuperAdmin: true,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        profilePicture: 'profileless.png'
      };

      await adminsCollection.insertOne(newAdmin);
      console.log('Admin user created successfully.');
    }

  } catch (error) {
    console.error('Seeding failed with error:', error);
  } finally {
    await client.close();
    console.log('Database connection closed.');
  }
}

seed();
