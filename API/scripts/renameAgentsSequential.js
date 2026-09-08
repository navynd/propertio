// scripts/renameAgentsSequential.js
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// Change this if your agents are in a different folder
const SOURCE_DIR = '/home/hts/Downloads/agents';

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

function buildTempName(index, original) {
  const ext = path.extname(original);
  return `__tmp_agent_${String(index + 1).padStart(2, '0')}${ext}`;
}

function buildFinalName(index, original) {
  const ext = path.extname(original);
  return `agent${String(index + 1).padStart(2, '0')}${ext}`;
}

(async () => {
  try {
    if (!fs.existsSync(SOURCE_DIR) || !fs.statSync(SOURCE_DIR).isDirectory()) {
      console.error(`SOURCE_DIR does not exist or is not a directory: ${SOURCE_DIR}`);
      process.exit(1);
    }

    const files = listFiles(SOURCE_DIR);

    if (!files.length) {
      console.log(`No files found in ${SOURCE_DIR}`);
      process.exit(0);
    }

    console.log(`Found ${files.length} files in ${SOURCE_DIR}`);

    // First pass: rename everything to temporary names to avoid collisions
    files.forEach((file, index) => {
      const srcPath = path.join(SOURCE_DIR, file);
      const tmpName = buildTempName(index, file);
      const tmpPath = path.join(SOURCE_DIR, tmpName);

      console.log(`TEMP: ${file} -> ${tmpName}`);
      fs.renameSync(srcPath, tmpPath);
    });

    // Second pass: rename temporary files to final agentXX names
    const tempFiles = listFiles(SOURCE_DIR).filter((name) => name.startsWith('__tmp_agent_'));

    tempFiles.forEach((tmpFile, index) => {
      const tmpPath = path.join(SOURCE_DIR, tmpFile);
      const finalName = buildFinalName(index, tmpFile);
      const finalPath = path.join(SOURCE_DIR, finalName);

      console.log(`FINAL: ${tmpFile} -> ${finalName}`);
      fs.renameSync(tmpPath, finalPath);
    });

    console.log('Done. Files renamed to agent01, agent02, ... preserving extensions.');
    process.exit(0);
  } catch (err) {
    console.error('Error during agent rename:', err);
    process.exit(1);
  }
})();

