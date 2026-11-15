import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const assetDir = path.resolve(here, '../../public/art/grey-archive');
const manifest = JSON.parse(await fs.readFile(path.join(assetDir, 'manifest.json'), 'utf8'));
const exportInfo = [];

for (const asset of manifest.assets) {
  const input = await fs.readFile(path.join(assetDir, asset.file));
  const stem = asset.file.replace(/\.svg$/, '');
  const metadata = await sharp(input).metadata();
  await sharp(input, { density: 144 }).png().toFile(path.join(assetDir, stem + '.png'));
  await sharp(input).webp({ quality: 88, alphaQuality: 100 }).toFile(path.join(assetDir, stem + '.webp'));
  exportInfo.push({ file: asset.file, width: metadata.width, height: metadata.height });
}

// A flat contact sheet for reviewing the deliverables, not a site mockup.
const sheetWidth = 1860;
const sheetHeight = 1880;
const background = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1860" height="1880">' +
  '<rect width="1860" height="1880" fill="#202328"/>' +
  '<path d="M72 88H1788M72 1180H1788M72 1780H1788" stroke="#9b8655" stroke-width="1"/>' +
  '</svg>'
);
const layers = [{
  input: await sharp(path.join(here, 'preview-labels.svg')).png().toBuffer(),
  left: 0,
  top: 0,
}];
for (const [i, name] of ['pacer-card', 'tilelens-card', 'classmap-card'].entries()) {
  const image = await sharp(path.join(assetDir, name + '.svg')).resize({ width: 520 }).png().toBuffer();
  layers.push({ input: image, left: 90 + i * 580, top: 155 });
}
layers.push({
  input: await sharp(path.join(assetDir, 'card-back.svg')).resize({ width: 280 }).png().toBuffer(),
  left: 222, top: 1230,
});
layers.push({
  input: await sharp(path.join(assetDir, 'archive-seal-bone.svg')).resize({ width: 340 }).png().toBuffer(),
  left: 760, top: 1280,
});
layers.push({
  input: await sharp({
    create: { width: 280, height: 480, channels: 4, background: '#e8dfcb' },
  }).composite([{
    input: await sharp(path.join(assetDir, 'card-frame.svg')).resize(280, 480).png().toBuffer(),
  }]).png().toBuffer(),
  left: 1358, top: 1230,
});
await sharp(background).composite(layers).png().toFile(path.join(here, 'collection-preview.png'));
await sharp(path.join(here, 'collection-preview.png')).webp({ quality: 90 }).toFile(path.join(here, 'collection-preview.webp'));

// A small-size proof ensures artwork remains identifiable as a homepage card.
await sharp({ create: { width: 960, height: 590, channels: 4, background: '#202328' } })
  .composite(await Promise.all(['pacer-card', 'tilelens-card', 'classmap-card'].map(async (name, index) => ({
    input: await sharp(path.join(assetDir, name + '.svg')).resize({ width: 280 }).png().toBuffer(),
    left: 30 + 310 * index,
    top: 40,
  }))))
  .png()
  .toFile(path.join(here, 'small-size-proof.png'));

console.log(JSON.stringify({ exported: exportInfo, preview: path.join(here, 'collection-preview.png') }, null, 2));
