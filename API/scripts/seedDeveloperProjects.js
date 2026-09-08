const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectToDatabase } = require('../src/config/db');

const Newprojects = require('../src/models/newprojectsModel');
const Developers = require('../src/models/developersModel');
const PropertyType = require('../src/models/propertyTypeModel');
const { UAE_PROJECT_LOCATIONS } = require('./uaeDemoLocations');
const Amenities = require('../src/models/amenitiesModel');
const Agencies = require('../src/models/agenciesModel');
const Agents = require('../src/models/agentsModel');
const ProjectBuilding = require('../src/models/projectBuildingModel');
const ProjectLayout = require('../src/models/projectLayoutModel');
const ProjectUnit = require('../src/models/projectUnitModel');
const LeadAssignment = require('../src/models/leadAssignmentModel');
const ProjectAgencyAllocation = require('../src/models/projectAgencyAllocationModel');
const ProjectAgentAllocation = require('../src/models/projectAgentAllocationModel');

async function seedDeveloperProjects(projectCount = 10) {
  try {
    await connectToDatabase();
    const seedRunId = Date.now();

    const developer = await Developers.findOne({ isActive: true }).lean();
    if (!developer) {
      console.error('No active developer found. Please run seedDevelopers.js first.');
      process.exit(1);
    }

    const propertyTypes = await PropertyType.find({}).limit(3).lean();
    if (!propertyTypes.length) {
      console.error('No property types found. Please seed PropertyType first.');
      process.exit(1);
    }

    const amenities = await Amenities.find({}).limit(10).lean();
    if (!amenities.length) {
      console.error('No amenities found. Please seed Amenities first.');
      process.exit(1);
    }

    const agencies = await Agencies.find({ isActive: true }).limit(5).lean();
    if (!agencies.length) {
      console.error('No agencies found. Please run seedAgenciesAndAgents.js first.');
      process.exit(1);
    }

    const now = new Date();

    const projects = [];

    for (let i = 1; i <= projectCount; i += 1) {
      const name = `Test Project ${i}`;
      const slug = `test-project-${seedRunId}-${i}`;

      const baseAnnouncement = new Date(now);
      baseAnnouncement.setMonth(baseAnnouncement.getMonth() - (6 + i));

      const bookingOpen = new Date(baseAnnouncement);
      bookingOpen.setMonth(bookingOpen.getMonth() + 1);

      const constructionStarted = new Date(bookingOpen);
      constructionStarted.setMonth(constructionStarted.getMonth() + 2);

      const expectedCompletionDate = new Date(now);
      expectedCompletionDate.setFullYear(expectedCompletionDate.getFullYear() + 1);

      const projectType = i % 2 === 0 ? 'off-plan' : 'ready';

      const loc = UAE_PROJECT_LOCATIONS[(i - 1) % UAE_PROJECT_LOCATIONS.length];

      // pick 2–4 random amenities for this project
      const shuffledAmenities = [...amenities].sort(() => Math.random() - 0.5);
      const projectAmenities = shuffledAmenities.slice(0, 2 + (i % 3)); // 2–4

      // pick 1–3 agencies to authorize on this project
      const shuffledAgencies = [...agencies].sort(() => Math.random() - 0.5);
      const projectAgencies = shuffledAgencies.slice(0, 1 + (i % 3)); // 1–3

      // 5 images per project (filenames only)
      const projectImages = Array.from({ length: 5 }).map((_, idx) => ({
        url: `test-project-${i}-image-${idx + 1}.webp`,
        isPrimary: idx === 0,
        order: idx,
        caption: '',
        uploadedAt: new Date(),
      }));

      projects.push({
        projectName: name,
        slug,
        description: `Seeded ${name} for testing search filters and project flows.`,
        aboutProject: `This is a seeded ${projectType} project used for development and QA.`,
        developer: developer._id,
        projectType,
        completionStatus: projectType === 'ready' ? 'ready' : 'off-plan',
        constructionProgress: projectType === 'ready' ? 100 : 50,
        launchPrice: {
          startingFrom: 500000 + i * 10000,
          currency: 'AED',
        },
        governmentFees: 4,
        paymentPlans: [],
        hasPostHandoverPayment: false,
        location: {
          address: `${loc.zone}, ${loc.city}, UAE`,
          city: loc.city,
          zone: loc.zone,
          googlePlaceId: '',
          coordinates: {
            type: 'Point',
            coordinates: [loc.lng + i * 0.0005, loc.lat + i * 0.0005],
          }
        },
        images: projectImages,
        masterPlan: [],
        brochure: null,
        virtualTour360: null,
        videoTour: null,
        amenities: projectAmenities.map((a) => a._id),
        isDldRegistered: false,
        dldRegistrationNumber: null,
        registrationDetails: null,
        totalUnits: 0,
        availableUnits: 0,
        soldUnits: 0,
        reservedUnits: 0,
        propertyTypes: [],
        bedroomOptions: [],
        authorizedAgencies: projectAgencies.map((a) => a._id),
        faqs: [
          {
            question: `What is the payment plan for ${name}?`,
            answer: 'This is seeded FAQ data for testing. Standard 60/40 payment plan applies.',
            order: 1,
          },
          {
            question: `Is ${name} eligible for mortgage?`,
            answer: 'Yes, this seeded project is marked as mortgage-friendly for testing purposes.',
            order: 2,
          },
        ],
        publishStatus: 'published',
        publishedAt: now,
        isVerified: true,
        verifiedBy: null,
        verifiedAt: now,
        isActive: true,
        isFeatured: i <= 3,
        featuredUntil: null,
        views: 0,
        inquiries: 0,
        likes: 0,
        shares: 0,
        metaTitle: `${name} in ${loc.city}`,
        metaDescription: `Seeded ${name} in ${loc.zone}, ${loc.city} for testing.`,
        metaKeywords: ['seed', 'test', 'project', loc.city.toLowerCase().replace(/\s+/g, '-')],
        progressStatus: 'construction-started',
        projectAnnouncement: baseAnnouncement,
        bookingOpen,
        constructionStarted,
        launchDate: bookingOpen,
        deliveryDate: expectedCompletionDate,
        expectedCompletionDate,
        lastModifiedAt: now,
        lastModifiedBy: developer._id,
      });
    }

    const createdProjects = await Newprojects.insertMany(projects);

    for (const project of createdProjects) {
      const hasBuildings = project.projectType === 'off-plan';
      const layoutCount = project._id.getTimestamp().getTime() % 2 === 0 ? 2 : 1;

      const pt = propertyTypes[project._id.getTimestamp().getTime() % propertyTypes.length];

      const buildings = [];
      if (hasBuildings) {
        const building1 = await ProjectBuilding.create({
          project: project._id,
          buildingName: 'Tower A',
          isActive: true,
        });
        buildings.push(building1);

        if (layoutCount === 2) {
          const building2 = await ProjectBuilding.create({
            project: project._id,
            buildingName: 'Tower B',
            isActive: true,
          });
          buildings.push(building2);
        }
      }

      const bedroomOptions = new Set();
      let totalUnits = 0;
      let minPrice = project.launchPrice?.startingFrom || null;
      const propertyTypeIds = new Set();

      const allUnitIds = [];
      const layoutIdToBuildingAndProperty = new Map();

      for (let li = 1; li <= layoutCount; li += 1) {
        const bedrooms = li === 1 ? 1 : 2;
        const bathrooms = bedrooms + 1;
        const layoutPrice = project.launchPrice.startingFrom + li * 50000;
        const areaSqm = 60 + li * 10;
        const areaSqft = areaSqm * 10.7639;

        const buildingRef = hasBuildings ? buildings[li - 1] || buildings[0] : null;

        const layout = await ProjectLayout.create({
          project: project._id,
          building: buildingRef ? buildingRef._id : null,
          propertyType: pt._id,
          layoutName: `${bedrooms}BR Type ${li}`,
          bedrooms,
          bathrooms,
          maidBedroom: false,
          areaSqm,
          areaSqft,
          startingPrice: {
            amount: layoutPrice,
            currency: 'AED',
          },
          floorPlans: [],
          totalUnits: 0,
          availableUnits: 0,
          reservedUnits: 0,
          soldUnits: 0,
          isActive: true,
        });

        propertyTypeIds.add(pt._id);
        bedroomOptions.add(bedrooms);

        const units = [];
        const unitMax = 5;
        for (let ui = 1; ui <= unitMax; ui += 1) {
          const unitNumber = String(ui).padStart(3, '0');
          const unitId = `${project._id}-${layout._id}-${unitNumber}`;
          units.push({
            project: project._id,
            building: buildingRef ? buildingRef._id : null,
            layout: layout._id,
            propertyType: pt._id,
            unitId,
            unitNumber,
            floor: hasBuildings ? ui : null,
            status: 'available',
            isActive: true,
          });
        }

        if (units.length) {
          const insertedUnits = await ProjectUnit.insertMany(units);
          totalUnits += insertedUnits.length;
          insertedUnits.forEach((u) => allUnitIds.push(u));
        }

        await ProjectLayout.updateOne(
          { _id: layout._id },
          {
            $set: {
              totalUnits: units.length,
              availableUnits: units.length,
            },
          }
        );

        await LeadAssignment.create({
          project: project._id,
          layout: layout._id,
          method: 'round-robin',
          agencyQueue: [],
          agencyPointer: 0,
          totalInquiries: 0,
        });

        if (minPrice == null || layoutPrice < minPrice) {
          minPrice = layoutPrice;
        }
        layoutIdToBuildingAndProperty.set(layout._id.toString(), {
          building: buildingRef ? buildingRef._id : null,
          propertyType: pt._id,
        });
      }

      const sortedBedrooms = [...bedroomOptions].sort((a, b) => a - b);

      await Newprojects.updateOne(
        { _id: project._id },
        {
          $set: {
            propertyTypes: [...propertyTypeIds],
            bedroomOptions: sortedBedrooms,
            totalUnits,
            availableUnits: totalUnits,
            launchPrice: {
              startingFrom: minPrice || project.launchPrice?.startingFrom,
              currency: project.launchPrice?.currency || 'AED',
            },
          },
        }
      );

      // ─────────────────────────────────────────────
      // Create ProjectAgencyAllocation similar to assignAgencies
      // ─────────────────────────────────────────────
      if (allUnitIds.length > 0) {
        // Re-fetch project to see authorizedAgencies (insertMany used docs)
        const freshProject = await Newprojects.findById(project._id).lean();
        const authorizedAgencyIds = (freshProject.authorizedAgencies || []).map((id) => id.toString());

        const agenciesForProject = agencies.filter((a) => authorizedAgencyIds.includes(a._id.toString()));
        if (agenciesForProject.length > 0) {
          // simple split: each agency gets a slice of units
          const sliceSize = Math.max(1, Math.floor(allUnitIds.length / agenciesForProject.length));

          for (let idx = 0; idx < agenciesForProject.length; idx += 1) {
            const agency = agenciesForProject[idx];
            const start = idx * sliceSize;
            const end = idx === agenciesForProject.length - 1 ? allUnitIds.length : start + sliceSize;
            const unitsSlice = allUnitIds.slice(start, end);

            if (!unitsSlice.length) continue;

            const layoutMap = {};
            unitsSlice.forEach((unitDoc) => {
              const key = unitDoc.layout.toString();
              if (!layoutMap[key]) {
                const meta = layoutIdToBuildingAndProperty.get(key) || {};
                layoutMap[key] = {
                  layout: unitDoc.layout,
                  building: meta.building || null,
                  propertyType: meta.propertyType,
                  unitsCount: 0,
                };
              }
              layoutMap[key].unitsCount += 1;
            });

            await ProjectAgencyAllocation.create({
              project: project._id,
              agency: agency._id,
              allocatedBy: developer._id,
              units: unitsSlice.map((u) => u._id),
              layoutSummary: Object.values(layoutMap),
              status: 'active',
              allocatedAt: new Date(),
            });

            // Update LeadAssignment agencyQueue for layouts used by this agency
            const uniqueLayoutIds = [...new Set(unitsSlice.map((u) => u.layout.toString()))];
            await Promise.all(
              uniqueLayoutIds.map((layoutId) =>
                LeadAssignment.updateOne(
                  {
                    project: project._id,
                    layout: layoutId,
                    'agencyQueue.agency': { $ne: agency._id },
                  },
                  {
                    $push: {
                      agencyQueue: {
                        agency: agency._id,
                        agentQueue: [],
                        agentPointer: 0,
                        addedAt: new Date(),
                      },
                    },
                  }
                )
              )
            );

            // Create agent-level allocations under this agency
            const agencyAgents = await Agents.find({
              agency: agency._id,
              isActive: true,
            })
              .select('_id')
              .limit(1)
              .lean();

            if (!agencyAgents.length) {
              continue;
            }

            const agent = agencyAgents[0];
            const agentUnitsSlice = unitsSlice;

            const agentLayoutMap = {};
            agentUnitsSlice.forEach((unitDoc) => {
              const key = unitDoc.layout.toString();
              if (!agentLayoutMap[key]) {
                const meta = layoutIdToBuildingAndProperty.get(key) || {};
                agentLayoutMap[key] = {
                  layout: unitDoc.layout,
                  building: meta.building || null,
                  propertyType: meta.propertyType,
                  unitsCount: 0,
                };
              }
              agentLayoutMap[key].unitsCount += 1;
            });

            await ProjectAgentAllocation.create({
              project: project._id,
              agency: agency._id,
              agent: agent._id,
              allocatedBy: agency._id,
              units: agentUnitsSlice.map((u) => u._id),
              layoutSummary: Object.values(agentLayoutMap),
              status: 'active',
              allocatedAt: new Date(),
            });

            await ProjectUnit.updateMany(
              { _id: { $in: agentUnitsSlice.map((u) => u._id) } },
              {
                $addToSet: {
                  assignedAgents: {
                    agent: agent._id,
                    agency: agency._id,
                    addedAt: new Date(),
                  },
                },
              }
            );

            const agentLayoutIds = [...new Set(agentUnitsSlice.map((u) => u.layout.toString()))];
            for (const layoutId of agentLayoutIds) {
              const config = await LeadAssignment.findOne({
                project: project._id,
                layout: layoutId,
              });

              if (!config) continue;

              const agencyIndex = config.agencyQueue.findIndex(
                (q) => q.agency.toString() === agency._id.toString()
              );

              if (agencyIndex === -1) {
                config.agencyQueue.push({
                  agency: agency._id,
                  agentQueue: [{ agent: agent._id, addedAt: new Date() }],
                  agentPointer: 0,
                  addedAt: new Date(),
                });
              } else {
                const agencyEntry = config.agencyQueue[agencyIndex];
                const alreadyExists = agencyEntry.agentQueue.some(
                  (aq) => aq.agent.toString() === agent._id.toString()
                );
                if (!alreadyExists) {
                  config.agencyQueue[agencyIndex].agentQueue.push({
                    agent: agent._id,
                    addedAt: new Date(),
                  });
                }
              }

              await LeadAssignment.findByIdAndUpdate(config._id, {
                $set: { agencyQueue: config.agencyQueue },
              });
            }
          }
        }
      }
    }

    console.log(`Successfully seeded ${createdProjects.length} developer projects (with layouts & units).`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed developer projects:', err);
    process.exit(1);
  }
}

const countArg = Number.parseInt(process.argv[2], 10);
const projectCount = Number.isNaN(countArg) ? 10 : countArg;
seedDeveloperProjects(projectCount);

