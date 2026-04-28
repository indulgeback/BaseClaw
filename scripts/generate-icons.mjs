#!/usr/bin/env zx

import 'zx/globals';
import sharp from 'sharp';
import png2icons from 'png2icons';
import { fileURLToPath } from 'url';

// Calculate paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(PROJECT_ROOT, 'resources', 'icons');
const DESKTOP_ICONS_DIR = path.join(PROJECT_ROOT, 'resources', 'desktop-icons');
const PNG_SOURCE = path.join(ICONS_DIR, 'icon-source.png');
const DESKTOP_PNG_SOURCE = path.join(ICONS_DIR, 'desktop-icon-source.png');
const SVG_SOURCE = path.join(ICONS_DIR, 'icon.svg');
const TRAY_CANVAS_SIZE = 22;
const TRAY_GLYPH_SIZE = 18;

echo`🎨 Generating ClawX icons using Node.js...`;

// Check if an icon source exists. PNG is preferred so generated assets can be
// refreshed from the committed brand image rather than a hand-maintained SVG.
if (!fs.existsSync(PNG_SOURCE) && !fs.existsSync(SVG_SOURCE)) {
  echo`❌ Icon source not found: ${PNG_SOURCE} or ${SVG_SOURCE}`;
  process.exit(1);
}

// Ensure icons directory exists
await fs.ensureDir(ICONS_DIR);
await fs.ensureDir(DESKTOP_ICONS_DIR);

async function createMasterPngBuffer(sourcePath) {
  return await sharp(sourcePath)
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function generateIconSet({
  masterPngBuffer,
  pngName,
  icoName,
  icnsName,
  linuxDir,
  label,
}) {
  await sharp(masterPngBuffer)
    .resize(512, 512)
    .toFile(path.join(ICONS_DIR, pngName));
  echo`  ✅ Created ${pngName} (512x512)`;

  echo`🪟 Generating Windows ${label} .ico...`;
  const icoBuffer = png2icons.createICO(masterPngBuffer, png2icons.HERMITE, 0, false);
  if (icoBuffer) {
    fs.writeFileSync(path.join(ICONS_DIR, icoName), icoBuffer);
    echo`  ✅ Created ${icoName}`;
  } else {
    echo(chalk.red`  ❌ Failed to create ${icoName}`);
  }

  echo`🍎 Generating macOS ${label} .icns...`;
  const icnsBuffer = png2icons.createICNS(masterPngBuffer, png2icons.HERMITE, 0);
  if (icnsBuffer) {
    fs.writeFileSync(path.join(ICONS_DIR, icnsName), icnsBuffer);
    echo`  ✅ Created ${icnsName}`;
  } else {
    echo(chalk.red`  ❌ Failed to create ${icnsName}`);
  }

  if (linuxDir) {
    echo`🐧 Generating ${label} PNG icons...`;
    const linuxSizes = [16, 32, 48, 64, 128, 256, 512];
    let generatedCount = 0;
    await fs.ensureDir(linuxDir);
    for (const size of linuxSizes) {
      await sharp(masterPngBuffer)
        .resize(size, size)
        .toFile(path.join(linuxDir, `${size}x${size}.png`));
      generatedCount++;
    }
    echo`  ✅ Created ${generatedCount} ${label} PNG icons`;
  }
}

function writeSvgWrappers(sourceFileName) {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">',
    `  <image href="${sourceFileName}" width="1024" height="1024" preserveAspectRatio="xMidYMid meet"/>`,
    '</svg>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), svg);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-plain.svg'), svg);
  echo`  ✅ Updated icon.svg and icon-plain.svg wrappers`;
}

async function generateTrayTemplate(masterPngBuffer) {
  const trayPadding = TRAY_CANVAS_SIZE - TRAY_GLYPH_SIZE;
  const alpha = await sharp(masterPngBuffer)
    .resize(TRAY_GLYPH_SIZE, TRAY_GLYPH_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .extractChannel('alpha')
    .toBuffer();

  await sharp({
    create: {
      width: TRAY_GLYPH_SIZE,
      height: TRAY_GLYPH_SIZE,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .joinChannel(alpha)
    .extend({
      top: Math.floor(trayPadding / 2),
      bottom: Math.ceil(trayPadding / 2),
      left: Math.floor(trayPadding / 2),
      right: Math.ceil(trayPadding / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(ICONS_DIR, 'tray-icon-Template.png'));
  echo`  ✅ Created tray-icon-Template.png (${TRAY_CANVAS_SIZE}x${TRAY_CANVAS_SIZE}, ${TRAY_GLYPH_SIZE}px glyph)`;
}

try {
  // 1. Generate Master PNG Buffer (1024x1024)
  const sourcePath = fs.existsSync(PNG_SOURCE) ? PNG_SOURCE : SVG_SOURCE;
  echo`  Processing source: ${sourcePath}`;
  const masterPngBuffer = await createMasterPngBuffer(sourcePath);
  if (fs.existsSync(PNG_SOURCE)) {
    writeSvgWrappers('icon-source.png');
  }

  await generateIconSet({
    masterPngBuffer,
    pngName: 'icon.png',
    icoName: 'icon.ico',
    icnsName: 'icon.icns',
    linuxDir: ICONS_DIR,
    label: 'app',
  });

  // 5. Generate macOS Tray Icon Template
  echo`📍 Generating macOS tray icon template...`;
  const TRAY_SVG_SOURCE = path.join(ICONS_DIR, 'tray-icon-template.svg');
  if (fs.existsSync(PNG_SOURCE)) {
    await generateTrayTemplate(masterPngBuffer);
  } else if (fs.existsSync(TRAY_SVG_SOURCE)) {
    const trayPadding = TRAY_CANVAS_SIZE - TRAY_GLYPH_SIZE;
    await sharp(TRAY_SVG_SOURCE)
      .resize(TRAY_GLYPH_SIZE, TRAY_GLYPH_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: Math.floor(trayPadding / 2),
        bottom: Math.ceil(trayPadding / 2),
        left: Math.floor(trayPadding / 2),
        right: Math.ceil(trayPadding / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(ICONS_DIR, 'tray-icon-Template.png'));
    echo`  ✅ Created tray-icon-Template.png (${TRAY_CANVAS_SIZE}x${TRAY_CANVAS_SIZE}, ${TRAY_GLYPH_SIZE}px glyph)`;
  } else {
    echo`  ⚠️  tray-icon-template.svg not found, skipping tray icon generation`;
  }

  if (fs.existsSync(DESKTOP_PNG_SOURCE)) {
    echo`\n🖥️  Generating desktop icon assets...`;
    const desktopMasterPngBuffer = await createMasterPngBuffer(DESKTOP_PNG_SOURCE);
    await generateIconSet({
      masterPngBuffer: desktopMasterPngBuffer,
      pngName: 'desktop-icon.png',
      icoName: 'desktop-icon.ico',
      icnsName: 'desktop-icon.icns',
      linuxDir: DESKTOP_ICONS_DIR,
      label: 'desktop',
    });
  }

  echo`\n✨ Icon generation complete! Files located in: ${ICONS_DIR}`;

} catch (error) {
  echo(chalk.red`\n❌ Fatal Error: ${error.message}`);
  process.exit(1);
}
