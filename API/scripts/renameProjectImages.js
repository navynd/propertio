const fs = require('fs').promises;
const path = require('path');

/**
 * Simple helper script to rename images in a folder to the pattern:
 *
 *   test-project-{projectIndex}-image-{n}{ext}
 *
 * Usage (from project root):
 *   node scripts/renameProjectImages.js 1
 *
 * This will rename all image files in /home/hts/Downloads/project_img
 * to:
 *   test-project-1-image-1.webp
 *   test-project-1-image-2.webp
 *   ...
 * (keeping their original extension)
 */

const TARGET_DIR = '/home/hts/Downloads/project_img';

async function main() {
  try {
    const projectIndexArg = process.argv[2];
    const projectIndex = Number(projectIndexArg || 1);

    if (!Number.isFinite(projectIndex) || projectIndex <= 0) {
      console.error('Please provide a valid positive project index, e.g.:');
      console.error('  node scripts/renameProjectImages.js 1');
      process.exit(1);
    }

    const entries = await fs.readdir(TARGET_DIR, { withFileTypes: true });

    const imageFiles = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => {
        const ext = path.extname(name).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      })
      .sort();

    if (imageFiles.length === 0) {
      console.log(`No image files found in ${TARGET_DIR}`);
      return;
    }

    console.log(`Found ${imageFiles.length} image(s) in ${TARGET_DIR}`);

    // Rename sequentially
    for (let i = 0; i < imageFiles.length; i += 1) {
      const oldName = imageFiles[i];
      const oldPath = path.join(TARGET_DIR, oldName);
      const ext = path.extname(oldName); // keep original extension

      const newName = `test-project-${projectIndex}-image-${i + 1}${ext}`;
      const newPath = path.join(TARGET_DIR, newName);

      // Skip if already correctly named
      if (oldName === newName) {
        console.log(`Skipping already named: ${oldName}`);
        continue;
      }

      console.log(`Renaming: ${oldName} -> ${newName}`);
      await fs.rename(oldPath, newPath);
    }

    console.log('Renaming completed.');
  } catch (err) {
    console.error('Failed to rename project images:', err);
    process.exit(1);
  }
}

main();

