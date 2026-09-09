import assert from 'node:assert'
import { classifyLocation, haversineKm, INDIAN_COASTAL_PLACES, INDIAN_INLAND_PLACES } from '../neerfd/frontend/src/utils/coastalGeocoder.js'

console.log('Testing Geolocation Classifier & Inland Detection...')

// Test 1: Delhi (Inland by name and coordinates)
const delhiByName = classifyLocation({ name: 'Delhi' })
assert.strictEqual(delhiByName.isCoastal, false, 'Delhi should be classified as inland')
assert(delhiByName.distanceToCoastKm > 700, 'Delhi should be > 700 km from nearest coast')
console.log(`✓ PASS: Delhi by name -> isCoastal: false, distance: ${delhiByName.distanceToCoastKm} km, nearest port: ${delhiByName.nearestPort.name}`)

const delhiByCoords = classifyLocation({ lat: 28.6139, lng: 77.2090 })
assert.strictEqual(delhiByCoords.isCoastal, false, 'Delhi coordinates should be classified as inland')
assert(delhiByCoords.name.includes('Delhi'), 'Delhi coordinates should resolve to Delhi')
console.log(`✓ PASS: Delhi by coords (28.6139, 77.2090) -> resolved: ${delhiByCoords.name}, isCoastal: false`)

// Test 2: Bengaluru (Inland peninsular Deccan plateau)
const blrByName = classifyLocation({ name: 'Bengaluru' })
assert.strictEqual(blrByName.isCoastal, false, 'Bengaluru should be classified as inland')
assert(blrByName.distanceToCoastKm > 200, 'Bengaluru should be > 200 km from coast')
console.log(`✓ PASS: Bengaluru by name -> isCoastal: false, distance: ${blrByName.distanceToCoastKm} km, nearest port: ${blrByName.nearestPort.name}`)

// Test 3: Jaipur (Inland Rajasthan)
const jaipur = classifyLocation({ name: 'Jaipur' })
assert.strictEqual(jaipur.isCoastal, false, 'Jaipur should be classified as inland')
console.log(`✓ PASS: Jaipur -> isCoastal: false, distance: ${jaipur.distanceToCoastKm} km`)

// Test 4: Kochi (Coastal Kerala)
const kochiByName = classifyLocation({ name: 'Kochi' })
assert.strictEqual(kochiByName.isCoastal, true, 'Kochi should be coastal')
console.log(`✓ PASS: Kochi by name -> isCoastal: true`)

const kochiByCoords = classifyLocation({ lat: 9.9312, lng: 76.2673 })
assert.strictEqual(kochiByCoords.isCoastal, true, 'Kochi coords should be coastal')
assert(kochiByCoords.distanceToCoastKm <= 5, 'Kochi coords should be <= 5 km to coast')
console.log(`✓ PASS: Kochi coords -> isCoastal: true, distance: ${kochiByCoords.distanceToCoastKm} km`)

// Test 5: Mumbai (Coastal Maharashtra)
const mumbai = classifyLocation({ name: 'Mumbai' })
assert.strictEqual(mumbai.isCoastal, true, 'Mumbai should be coastal')
console.log(`✓ PASS: Mumbai -> isCoastal: true`)

// Test 6: Chennai (Coastal Tamil Nadu)
const chennai = classifyLocation({ name: 'Chennai' })
assert.strictEqual(chennai.isCoastal, true, 'Chennai should be coastal')
console.log(`✓ PASS: Chennai -> isCoastal: true`)

// Test 7: Data layer transform functions for non-coastal data (NO hardcoded Kochi leakage)
import {
  getConditions,
  getFishingZones,
  getHazards as getFishermanHazards,
  getDecision as getFishermanDecision,
} from '../neerfd/frontend/src/data/mock/fishermanData.js'

const inlandEnv = {
  is_coastal: false,
  decisionOutput: {
    status: 'inland',
    headline: 'Inland Location Detected',
    summary: 'Marine telemetry unavailable for inland areas.',
    narrative: 'Non-coastal location.',
  },
}

const fConditions = getConditions(inlandEnv)
assert.strictEqual(fConditions.waveHeight.value, null, 'Wave height must be null for inland location')
assert.strictEqual(fConditions.waveHeight.display, 'Unavailable', 'Wave height must display Unavailable')
assert.strictEqual(fConditions.seaSurfaceTemperature.value, null, 'SST must be null for inland location')
console.log('✓ PASS: Fisherman conditions return null/Unavailable for inland location (zero fake wave/SST data)')

const fZones = getFishingZones(inlandEnv)
assert.strictEqual(fZones.length, 0, 'Fishing zones must be empty array for inland location')
console.log('✓ PASS: Fishing zones array is empty for inland location (zero fake zones)')

const fHazards = getFishermanHazards(inlandEnv)
assert.strictEqual(fHazards.length, 0, 'Hazards must be empty array for inland location')
console.log('✓ PASS: Hazards array is empty for inland location (zero fake hazards)')

const fDecision = getFishermanDecision(inlandEnv)
assert.strictEqual(fDecision.status, 'inland', 'Decision status must be inland')
console.log('✓ PASS: Fisherman decision status correctly reflects inland state')

// Test 8: Authority data layer transform functions for non-coastal data
import {
  getAreaPriorities,
  getHazards as getAuthorityHazards,
  getDecision as getAuthorityDecision,
} from '../neerfd/frontend/src/data/mock/authorityData.js'

const aPriorities = getAreaPriorities(inlandEnv)
assert.strictEqual(aPriorities.length, 0, 'Area priorities must be empty for inland location')
console.log('✓ PASS: Authority area priorities empty for inland location (zero fake priorities)')

const aHazards = getAuthorityHazards(inlandEnv)
assert.strictEqual(aHazards.length, 0, 'Authority hazards must be empty for inland location')
console.log('✓ PASS: Authority hazards empty for inland location (zero fake hazards)')

const aDecision = getAuthorityDecision(inlandEnv)
assert.strictEqual(aDecision.status, 'inland', 'Authority decision status must be inland')
console.log('✓ PASS: Authority decision status correctly reflects inland state')

console.log('\n======================================================')
console.log('ALL LOCATION, INLAND & DATA LAYER TESTS PASSED (8/8)!')
console.log('======================================================')
