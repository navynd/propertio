const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectToDatabase } = require('../src/config/db');
const Agencies = require('../src/models/agenciesModel');
const Agents = require('../src/models/agentsModel');

async function seedAgenciesAndAgents(agencyCount = 10, agentsPerAgency = 5) {
  try {
    await connectToDatabase();

    const passwordPlain = 'Password123';
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    const agencies = [];

    for (let i = 1; i <= agencyCount; i += 1) {
      const agencyName = `Test Agency ${i}`;
      const email = `agency${i}@example.com`;
      const orn = `ORN-${1000 + i}`;

      agencies.push({
        agencyName,
        email,
        phoneNumber: `+9715100000${String(i).padStart(2, '0')}`,
        password: passwordHash,
        orn,
        address: {
          fullAddress: `Test Agency Address ${i}, Dubai, UAE`,
          street: `Agency Street ${i}`,
          city: 'Dubai',
          state: 'Dubai',
          country: 'UAE',
          zipCode: '00000',
        },
        foundedYear: 2000 + i,
        description: `Test seeded agency ${i} for development/testing purposes.`,
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true,
        invitationStatus: 'accepted',
        isActive: true,
      });
    }

    const createdAgencies = await Agencies.insertMany(agencies);

    const agents = [];

    createdAgencies.forEach((agency, agencyIndex) => {
      for (let j = 1; j <= agentsPerAgency; j += 1) {
        const agentNumber = agencyIndex * agentsPerAgency + j;
        const fullName = `Agent ${agentNumber} of ${agency.agencyName}`;
        const email = `agent${agentNumber}@example.com`;

        agents.push({
          fullName,
          email,
          phoneNumber: `+9715200${String(agentNumber).padStart(4, '0')}`,
          whatsappNumber: `+9715200${String(agentNumber).padStart(4, '0')}`,
          isWhatsappPrimary: true,
          password: passwordHash,
          agentType: 'agent',
          specialization: 'Residential Sales',
          experience: 1 + (agentNumber % 5),
          responseTime: 'within 24 hours',
          agency: agency._id,
          position: 'Agent',
          isEmailVerified: true,
          isPhoneVerified: true,
          isVerified: true,
          invitationStatus: 'accepted',
          isActive: true,
        });
      }
    });

    const createdAgents = await Agents.insertMany(agents);

    // eslint-disable-next-line no-console
    console.log(`Successfully seeded ${createdAgencies.length} agencies and ${createdAgents.length} agents.`);
    // eslint-disable-next-line no-console
    console.log('Agency login credentials (all use the same password):');
    createdAgencies.forEach((agency) => {
      console.log(`- ${agency.agencyName}: ${agency.email} / ${passwordPlain}`);
    });
    // eslint-disable-next-line no-console
    console.log('Sample agent logins (all use the same password):');
    createdAgents.slice(0, 10).forEach((agent) => {
      console.log(`- ${agent.fullName}: ${agent.email} / ${passwordPlain}`);
    });

    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to seed agencies and agents:', err);
    process.exit(1);
  }
}

seedAgenciesAndAgents(10, 5);

