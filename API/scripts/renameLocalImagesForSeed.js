// scripts/renameLocalImagesForSeed.js
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// 2) Source folder where your real photos live (you gave this path)
const SOURCE_DIR = '/home/hts/Downloads/property';

// 3) What file extensions to treat as images in the source folder
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// 4) Must match scripts/seedDemoProperties.js
// We only care about the 5 main images per property (no floorplans).
const TOTAL_PROPERTIES = 50;
const IMAGES_PER_PROPERTY = 5;

// --- Helpers --------------------------------------------------------

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function buildTargetFilenames() {
  const targets = [];

  for (let seedIndex = 1; seedIndex <= TOTAL_PROPERTIES; seedIndex += 1) {
    const base = `demo-property-${String(seedIndex).padStart(4, '0')}`;

    for (let i = 1; i <= IMAGES_PER_PROPERTY; i += 1) {
      const index = String(i).padStart(2, '0');
      targets.push(`${base}-image${index}.webp`);
    }
  }

  return targets;
}

// --- Main -----------------------------------------------------------

(async () => {
  try {
    const targetNames = buildTargetFilenames();

    if (!targetNames.length) {
      console.error('No target filenames generated.');
      process.exit(1);
    }

    console.log(`Generated ${targetNames.length} target filenames (properties=${TOTAL_PROPERTIES})`);

    const allSourceFiles = fs.readdirSync(SOURCE_DIR);
    const sourceImages = allSourceFiles.filter(isImageFile).sort();

    console.log(`Found ${sourceImages.length} image files in ${SOURCE_DIR}`);

    const count = Math.min(sourceImages.length, targetNames.length);
    if (count === 0) {
      console.error('No overlap between source images and target filenames (count = 0).');
      process.exit(1);
    }

    if (sourceImages.length < targetNames.length) {
      console.warn(
        `WARNING: You only have ${sourceImages.length} images in the folder but ${targetNames.length} target filenames.\n` +
        `Only the first ${sourceImages.length} targets will be used.`
      );
    }

    console.log(`Renaming ${count} images...`);

    for (let i = 0; i < count; i += 1) {
      const srcName = sourceImages[i];
      const dstName = targetNames[i];

      const srcPath = path.join(SOURCE_DIR, srcName);
      const dstPath = path.join(SOURCE_DIR, dstName);

      console.log(`  ${srcName}  ->  ${dstName}`);
      fs.renameSync(srcPath, dstPath);
    }

    console.log('Done. Images in the folder now match the property image filenames.');
    process.exit(0);
  } catch (err) {
    console.error('Error during rename:', err);
    process.exit(1);
  }
})();