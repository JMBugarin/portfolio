import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const bytes = readFileSync(fileURLToPath(new URL('../public/models/tarot-table.glb', import.meta.url)))
assert.equal(bytes.toString('ascii', 0, 4), 'glTF')
assert.equal(bytes.readUInt32LE(4), 2)
assert.equal(bytes.readUInt32LE(8), bytes.length)
assert(bytes.length < 6_000_000, 'GLB must be below 6 MB')
const jsonLength = bytes.readUInt32LE(12)
const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength))
assert(gltf.extensionsRequired.includes('KHR_draco_mesh_compression'))
const names = ['Bronze_Table', 'Head_Throne', ...Array.from({length:6}, (_,i)=>`Seat_0${i+1}`), 'Pillars']
assert.equal(gltf.meshes.length, 9)
for (const name of names) {
  const node = gltf.nodes.find(n => n.name === name)
  assert(node && typeof node.mesh === 'number', `Missing mesh ${name}`)
  assert.deepEqual(node.scale ?? [1,1,1], [1,1,1], `Non-unit scale on ${name}`)
  assert.deepEqual(node.rotation ?? [0,0,0,1], [0,0,0,1], `Unapplied rotation on ${name}`)
  if (name === 'Head_Throne' || name.startsWith('Seat_')) assert(node.translation[1] > 4, `${name} origin must be at the chair-back top`)
}
const triangles = gltf.meshes.reduce((total, mesh) => total + mesh.primitives.reduce((n, p) => {
  assert(p.extensions.KHR_draco_mesh_compression)
  assert('TEXCOORD_0' in p.attributes && 'NORMAL' in p.attributes)
  return n + gltf.accessors[p.indices].count / 3
}, 0), 0)
assert(triangles < 50_000)
const binStart = 20 + jsonLength + 8
function dimensions(data, mime) {
  if (mime === 'image/png') return [data.readUInt32BE(16), data.readUInt32BE(20)]
  assert.equal(mime, 'image/jpeg')
  let offset=2
  while (offset < data.length) {
    if (data[offset] !== 255) { offset++; continue }
    const marker=data[offset+1]
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return [data.readUInt16BE(offset+7),data.readUInt16BE(offset+5)]
    offset += 2 + data.readUInt16BE(offset+2)
  }
  throw new Error('JPEG dimensions not found')
}
for (const image of gltf.images) {
  const view=gltf.bufferViews[image.bufferView]
  const data=bytes.subarray(binStart+(view.byteOffset??0),binStart+(view.byteOffset??0)+view.byteLength)
  const size=dimensions(data,image.mimeType)
  assert(Math.max(...size)<=2048, `${image.name} exceeds 2K`)
}
assert.equal(gltf.nodes.filter(n=>n.name?.startsWith('Sigil_')).length,7)
console.log(`PASS: ${triangles.toLocaleString()} triangles, ${(bytes.length/1e6).toFixed(2)} MB, 9 meshes, 7 anchors, textures ≤2K, Draco required.`)
