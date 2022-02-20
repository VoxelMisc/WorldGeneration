const blockMetadata = require('../../bloxd/src/gameSource/blockMetadata').default
require('./testPointsGenerator')
const { WorldGenerator } = require('../dist/bundle').default

const worldGenerator = new WorldGenerator(32, blockMetadata, "test")

const desert = [-12, 32]

const xOffset = worldGenerator.biomeOffsetSimplex.getOctaves(desert[0], 0)
const zOffset = worldGenerator.biomeOffsetSimplex.getOctaves(0, desert[1])

// const zOffsets = this._getBiomeZOffsets(z)
// const zOffset = zOffsets[k+this.neededOutsideChunkHeightRadius]

console.log("offsets", xOffset, zOffset)
console.log("Point queried", desert[0]+xOffset, desert[1]+zOffset)

const closestTwoPts = worldGenerator.biomePointGen.getKClosestPoints(desert[0]+xOffset, desert[1]+zOffset)
const desertbiome = worldGenerator._getBiomeForBiomePoint(closestTwoPts[0][0], closestTwoPts[0][1])

console.log(closestTwoPts, desertbiome.constructor.name === "TestBiome")


















function xzId(x, z) {
	return `${x}|${z}`
}

function xzIdArr(arr) {
	return `${arr[0]}|${arr[1]}`
}


function xzDist(x, z) {
	const a = x[0]-z[0]
	const b = x[1]-z[1]
	return Math.sqrt(a*a + b*b)
}

function xzDistNoArr(pt1, x, z) {
	const a = pt1[0]-x
	const b = pt1[1]-z
	return Math.sqrt(a*a + b*b)
}
