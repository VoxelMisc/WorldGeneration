import { Perlin } from "libnoise-ts/module/generator"
import SimplexNoise from 'simplex-noise'
import { PointsGenerator } from './PointsGenerator'
import {makeProfileHook} from './profileHook'
import {DesertBiome, ForestBiome, OceanBiome, PlainsBiome, RollingHillsBiome, TestBiome} from './TestBiome'
import {SimplexCustomOctaveHelper, SimplexOctaveHelper, TxzId, xzDist, xzId} from './util'
import Rand, {PRNG} from 'rand-seed'
import {CavesGenerator} from './CavesGenerator'
import {TreeGenerator} from './TreeGenerator'
import {ClosestBiomes, ClosestBiomesForChunk, HeightmapVals} from './types'
import cruncher from "voxel-crunch"
import {WaterBodyGenerator} from './WaterBodyGenerator'
import {NO_CAVES_RESTRICTION_FROM_WATER, NO_WATER_LEVEL} from './constants'
const MD5 = require('md5.js')

const profileGetChunk = false
const profiler = profileGetChunk ? makeProfileHook(50, 'getChunk') : () => {}

class WorldGenerator {
	chunkSize: number

	biomePointGen: PointsGenerator

	treeRadius = 2
	neededOutsideChunkHeightRadius = this.treeRadius

	treeGenerator: TreeGenerator

	seed: string

	biomes: {biome: TestBiome, frequency: number, cumuFreq: number}[]
	biomeOffsetSimplex: SimplexCustomOctaveHelper
	biomesTotalFrequency: number
	globalHeightmap: SimplexCustomOctaveHelper

	heightmapPerturb: SimplexCustomOctaveHelper

	cavesGenerator: CavesGenerator

	baseBiome: TestBiome

	waterBodyGenerator: WaterBodyGenerator
	needOutsideWaterDist: number = 15

	constructor(chunkSize, blockMetadata, seed) {
		this.baseBiome = new TestBiome(
			chunkSize,
			blockMetadata,
			this,
			seed,
		)

		const desertBiome = new DesertBiome(
			chunkSize,
			blockMetadata,
			this,
			seed,
		)
		const plainsBiome = new PlainsBiome(
			chunkSize,
			blockMetadata,
			this,
			seed,
		)
		const forestBiome = new ForestBiome(
			chunkSize,
			blockMetadata,
			this,
			seed,
		)
		const oceanBiome = new OceanBiome(
			chunkSize,
			blockMetadata,
			this,
			seed,
		)
		const rollingHillsBiome = new RollingHillsBiome(
			chunkSize,
			blockMetadata,
			this,
			seed,
		)
		this.biomes = [
			{ biome: desertBiome, frequency: 10, cumuFreq: null }, // cumuFreq set below
			{ biome: plainsBiome, frequency: 20, cumuFreq: null },
			{ biome: forestBiome, frequency: 20, cumuFreq: null },
			// { biome: oceanBiome, frequency: 20, cumuFreq: null },
			{ biome: rollingHillsBiome, frequency: 20, cumuFreq: null },
		]

		this.biomesTotalFrequency = 0

		let treeMinDist = 100000
		let treeMaxDist = 0
		for (const biomeInfo of this.biomes) {
			this.biomesTotalFrequency += biomeInfo.frequency
			biomeInfo.cumuFreq = this.biomesTotalFrequency

			if (biomeInfo.biome.treeMinDist) {
				treeMinDist = Math.min(treeMinDist, biomeInfo.biome.treeMinDist)
				treeMaxDist = Math.max(treeMaxDist, biomeInfo.biome.treeMinDist)
			}

			biomeInfo.biome.init()
		}

		this.treeGenerator = new TreeGenerator(
			this.treeRadius,
			this.baseBiome,
			chunkSize,
			seed,
			{
				func: (pt) => {
					// Default to treeMaxDist so we always return a number
					// We don't need to worry about using treeMaxDist when it's null as we ignore trees that say they're
					// in a biome without trees
					return this._getBiome(pt[0], pt[1]).treeMinDist || treeMaxDist
				},
				min: treeMinDist,
				max: treeMaxDist,
			},
			blockMetadata
		)

		this.chunkSize = chunkSize

		this.biomePointGen = new PointsGenerator(150, false, true, seed, 8)

		this.biomeOffsetSimplex = new SimplexCustomOctaveHelper([
			{
				amplitude: 1,
				frequency: 1/5,
			},
			{
				amplitude: 5,
				frequency: 1/70,
			},
		], `${seed}BiomeOffsetSimplex`)

		this.globalHeightmap = new SimplexCustomOctaveHelper([
			{
				amplitude: 20,
				frequency: 1/1300,
			},
			{
				amplitude: 10,
				frequency: 1/5000,
			},
		], `${seed}GlobalHeightmapOffset`)

		this.heightmapPerturb = new SimplexCustomOctaveHelper([
			{
				amplitude: 1,
				frequency: 1/14,
			},
			{
				amplitude: 5,
				frequency: 1/65,
			},
			{
				amplitude: 20,
				frequency: 1/250,
			},
		], `${seed}HeightmapPerturb`)

		this.cavesGenerator = new CavesGenerator(seed, chunkSize, this.neededOutsideChunkHeightRadius)

		let heightmapPerturbAmpSum = 0
		for (const {amplitude} of this.heightmapPerturb.customOctaves) {
			heightmapPerturbAmpSum += amplitude
		}

		this.waterBodyGenerator = new WaterBodyGenerator(this, seed, heightmapPerturbAmpSum, this.needOutsideWaterDist)
	}

	// x, y, z are the co-ordinates of the bottom left block in the chunk
	getChunk(array, x, y, z) {
		try {
			this._getChunk(array, x, y, z)

			const rleArr = cruncher.encode(array.data)
			const rleStr = String.fromCharCode.apply(null, rleArr);

			return {
				hash: new MD5().update(rleStr).digest('hex'),
			}
		}
		catch (e) {
			console.log(e.stack)
			console.error(e.stack)
		}
	}

	_getChunk(array, x, y, z) {
		const allClosestBiomePoints = this._getClosestBiomesForChunk(x, z)
		const heightmapVals: HeightmapVals = this.getHeightMapVals(x, z, allClosestBiomePoints)

		const caveInfos = this.cavesGenerator.getCaveInfoForChunk(x, z, heightmapVals)
		const treeTrunksAroundPoints = this.treeGenerator._getTreeTrunksForBlocksInChunk(x, z, heightmapVals, allClosestBiomePoints, caveInfos)

		// Generate ores based on the biome in the center of the chunk
		const centerXZId = xzId(x+this.chunkSize/2, z+this.chunkSize/2)
		const centerBiome = allClosestBiomePoints[centerXZId][0].biome
		const chunkOres = centerBiome.oreGenerator.getOreBlocksForChunk(x, y, z)

		for (let i = 0; i < this.chunkSize; ++i) {
			for (let k = 0; k < this.chunkSize; ++k) {
				const xzID = xzId(x+i, z+k)
				const closestBiomes = allClosestBiomePoints[xzID]
				const biome = closestBiomes[0].biome

				const biomeArgs = {
					array,
					globalX: x+i,
					globalY: y,
					globalZ: z+k,
					localX: i,
					localZ: k,
					heightmapVals,
					nearbyTrunks: treeTrunksAroundPoints[xzID] || [],
					caveInfos,
					chunkOres
				}
				biome.getChunkColumn(biomeArgs)
			}
		}
	}

	// x and z are coords of bottom left block in chunk
	_getClosestBiomesForChunk(x, z): ClosestBiomesForChunk {
		const closestBiomes = {}
		// const zOffsets = this._getBiomeZOffsets(z)

		for (let i = x-this.neededOutsideChunkHeightRadius; i < x+this.chunkSize+this.neededOutsideChunkHeightRadius; ++i) {
			for (let k = z-this.neededOutsideChunkHeightRadius; k < z+this.chunkSize+this.neededOutsideChunkHeightRadius; ++k) {
				const closestBiomesForXZ = this.getClosestBiomes(i, k)
				closestBiomes[xzId(i, k)] = closestBiomesForXZ
			}
		}
		return closestBiomes
	}

	getClosestBiomes(x, z): ClosestBiomes {
		// Using 2d noise to perturb - looks much better than 1d!!!
		const xOffset = this._getBiomeXOffset(x, z)
		// Add random offsets to the z perturbation (to simulate sampling 2 noises instead of the same)
		const zOffset = this._getBiomeZOffset(x, z)

		const closestPts = this.biomePointGen.getKClosestPointsWithWeights(x+xOffset, z+zOffset, 60)
		const closestBiomesForXZ: ClosestBiomes = []
		for (const {weight, pt} of closestPts) {
			closestBiomesForXZ.push({
				weight,
				biome: this._getBiomeForBiomePoint(pt)
			})
		}

		return closestBiomesForXZ
	}

	// x and z should be the center of the biome, as provided by biomePointGenerator closestPoint
	_getBiomeForBiomePoint(biomePt: number[]): TestBiome {
		const rand = new Rand(`${biomePt[0]}|${biomePt[1]}|${this.seed}`, PRNG.mulberry32);
		const biomeInt = Math.floor((rand.next()-0.00001)*this.biomesTotalFrequency)
		let freqSeenSoFar = 0

		let i = 0
		while (freqSeenSoFar <= biomeInt) {
			freqSeenSoFar += this.biomes[i].frequency
			i++
		}
		return this.biomes[i-1].biome
	}

	// Only to be used for tree density and flower patches!! - _getClosestBiomesForChunk and _getBiomeForBiomePoint should be used for blocks/heightmap etc picking
	_getBiome(x, z) {
		const xOffset = this._getBiomeXOffset(x, z)
		const zOffset = this._getBiomeZOffset(x, z)
		const biomePt = this.biomePointGen.getClosestPoint(x+xOffset, z+zOffset)
		return this._getBiomeForBiomePoint(biomePt)
	}

	_getBiomeXOffset(x, z) {
		return Math.floor(this.biomeOffsetSimplex.getOctaves(x, z))
	}

	_getBiomeZOffset(x, z) {
		return Math.floor(this.biomeOffsetSimplex.getOctaves(x+500, z+860))
	}

	// x and z are coords of bottom left block in chunk
	getHeightMapVals(x, z, allClosestBiomesForChunk: ClosestBiomesForChunk): HeightmapVals {
		const heightmapVals: HeightmapVals = {
			groundHeights: {},
			waterHeights: {},
			cavesAllowedBelowY: {},
		}

		for (let i = x-this.neededOutsideChunkHeightRadius; i < x+this.chunkSize+this.neededOutsideChunkHeightRadius; ++i) {
			for (let k = z-this.neededOutsideChunkHeightRadius; k < z+this.chunkSize+this.neededOutsideChunkHeightRadius; ++k) {
				const nonPerturbedIKId = xzId(i, k)
				const closestBiomePts = allClosestBiomesForChunk[nonPerturbedIKId]

				const perturbX = Math.floor(this.heightmapPerturb.getOctaves(i, k))
				const perturbZ = Math.floor(this.heightmapPerturb.getOctaves(i+200, k+778))
				const {groundHeight, waterHeight, cavesAllowedBelowY} = this.getWithWaterHeightmapVal(i+perturbX, k+perturbZ, closestBiomePts)

				heightmapVals.groundHeights[nonPerturbedIKId] = groundHeight
				heightmapVals.waterHeights[nonPerturbedIKId] = waterHeight
				heightmapVals.cavesAllowedBelowY[nonPerturbedIKId] = cavesAllowedBelowY
			}
		}

		return heightmapVals
	}

	getWithWaterHeightmapVal(x, z, closestBiomePts: ClosestBiomes): {groundHeight: number, waterHeight: number, cavesAllowedBelowY: number} {
		const noWaterHeightmapVal = this.getNoWaterHeightmapVal(x, z, closestBiomePts)
		const {distFromWater, waterRadius, waterHeight: heightOfWater, waterbedHeight, isLake} = this.waterBodyGenerator.getInfoNeededForWaterGen(x, z)

		let height = 0
		let waterHeight = NO_WATER_LEVEL
		let cavesAllowedBelowY = NO_CAVES_RESTRICTION_FROM_WATER

		const waterCutoff = waterRadius + this.needOutsideWaterDist

		if (distFromWater <= waterCutoff) {
			// We're near enough to be either the water itself or the water bank

			const bankTopCutoff = waterRadius + 4
			const bankTop = heightOfWater+2
			if (distFromWater <= waterRadius) {
				// We're in the water itself

				// Decrease lake banks faster (and with offset)
				let distFrac = distFromWater/waterRadius
				if (isLake) {
					distFrac = distFrac*distFrac*distFrac
					height = waterbedHeight + Math.floor((heightOfWater-waterbedHeight) * distFrac) - 2
				}
				else {
					distFrac = distFrac*distFrac
					height = waterbedHeight + Math.floor((heightOfWater-waterbedHeight) * distFrac)
				}

				waterHeight = heightOfWater
			}
			else if (distFromWater <= bankTopCutoff) {
				// Smooth down to water edge from bankTop
				const distFracToWaterEdge = (distFromWater - waterRadius) / (bankTopCutoff - waterRadius)

				height = heightOfWater + Math.ceil((bankTop-heightOfWater) * distFracToWaterEdge)
				// console.log(height)
			}
			else {
				// Smooth up to the peak of the bank
				const distFracToBankTop = (distFromWater - bankTopCutoff) / (waterCutoff - bankTopCutoff)

				height = bankTop + Math.ceil((noWaterHeightmapVal-bankTop) * distFracToBankTop)
			}

			// Don't allow caves too nearby as otherwise they look odd near/intersecting with water bodies
			cavesAllowedBelowY = height - 15
		}
		else {
			height = noWaterHeightmapVal
		}

		return {
			groundHeight: height,
			waterHeight,
			cavesAllowedBelowY,
		}
	}

	getNoWaterHeightmapVal(x, z, closestBiomePts: ClosestBiomes) {
		// no smoothing

		// const closestBiomePts = closestBiomePts[xzId(x, z)]
		// const closestBiome = closestBiomePts[0].biome
		// heights[xzId(x, z)] = closestBiome.getHeightmapVal(x, z)

		// const perturbX = Math.floor(this.heightmapPerturb.getOctaves(x, z))
		// const perturbZ = Math.floor(this.heightmapPerturb.getOctaves(x+200, z+778))

		// const useX = x+perturbX
		// const useZ = z+perturbZ
		const useX = x
		const useZ = z


		// smoothing

		let localHeight = 0
		let weights = 0
		for (const {biome, weight} of closestBiomePts) {
			localHeight += biome.getHeightmapVal(useX, useZ)*weight
			weights += weight
		}

		// if (Math.abs(1-weights) > 0.001) {
		// 	throw new Error("Weights don't add up!")
		// }

		const globalHeight = this.globalHeightmap.getOctaves(useX, useZ)

		return Math.floor(localHeight) + Math.floor(globalHeight)
	}
}

export default { WorldGenerator }
export { WorldGenerator }
