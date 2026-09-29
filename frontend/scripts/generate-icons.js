#!/usr/bin/env node
// Generate PWA icons from SVG
// Run: node scripts/generate-icons.js

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.resolve(__dirname, '../public/icons/icon.svg');
const outputDir = path.resolve(__dirname, '../public/icons');

async function generateIcons() {
  try {
    // Try to use sharp if available, otherwise use a simple approach
    let sharp;
    try {
      sharp = (await import('sharp')).default;
    } catch {
      console.log('sharp not installed, using alternative...');
      await generateWithAlternative();
      return;
    }

    const svgBuffer = await fs.readFile(inputSvg);
    
    for (const size of sizes) {
      const outputPath = path.join(__dirname, `../public/icons/icon-${size}x${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated ${size}x${size}.png`);
    }
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

async function generateWithAlternative() {
  // Create placeholder PNG files using a simple approach
  // This creates minimal valid PNG files
  console.log('Creating placeholder PNG icons...');
  
  // Create a minimal 1x1 transparent PNG as base64
  const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const pngBuffer = Buffer.from(minimalPngBase64, 'base64');
  
  for (const size of sizes) {
    const outputPath = path.join(__dirname, `../public/icons/icon-${size}x${size}.png`);
    await fs.writeFile(outputPath, pngBuffer);
    console.log(`Created placeholder ${size}x${size}.png`);
  }
  
  console.log('\nNote: These are placeholder icons. Replace with actual icons generated from the SVG.');
  console.log('Run: npx pwa-assets-generator --icon public/icons/icon.svg --output public/icons');
  console.log('Or use: https://realfavicongenerator.net/ to generate all icons from the SVG');
}

generateIcons();