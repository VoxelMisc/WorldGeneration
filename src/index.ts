import { PointsGenerator } from './PointsGenerator'
import {makeProfileHook} from './profileHook'
import {SimplexCustomOctaveHelper, Int16TwoDArray, ObjectTwoDArray} from './util'
import {CavesGenerator} from './CavesGenerator'
import {TreeGenerator} from './TreeGenerator'
import {
	BiomeInfoForChunkFill,
	CaveInfos,
	CloseBiome,
	ClosestBiomes,
	ClosestBiomesForChunk,
	HeightmapVals, NearestTreesForChunk, OreBlocksForChunk,
} from './types'
import cruncher from "voxel-crunch"
import {WaterBodyGenerator} from './WaterBodyGenerator'
import {NO_CAVES_RESTRICTION_FROM_WATER, NO_WATER_LEVEL} from './constants'
import {OreGenerator} from './OreGenerator'
import {BiomeSelector} from './BiomeSelector'
import {ChunkFiller} from './ChunkFiller'
const MD5 = require('md5.js')

const profileGetChunk = false
const profiler = profileGetChunk ? makeProfileHook(50, 'getChunk') : () => {}

let runningAsServer
export function getIsServer() {
	return runningAsServer
}

type ChunkColumnInfo = {
	biomeInfos: BiomeInfoForChunkFill,
	heightmapVals: HeightmapVals,
	caveInfos: CaveInfos,
	treeTrunksAroundPoints: NearestTreesForChunk,
	chunkOres: OreBlocksForChunk,
}

class WorldGenerator {
	chunkSize: number

	biomePointGen: PointsGenerator

	treeRadius = 2
	neededOutsideChunkHeightRadius = this.treeRadius

	treeGenerator: TreeGenerator

	seed: string

	biomeOffsetSimplex: SimplexCustomOctaveHelper
	globalHeightmap: SimplexCustomOctaveHelper

	heightmapPerturb: SimplexCustomOctaveHelper

	cavesGenerator: CavesGenerator

	biomeSelector: BiomeSelector

	waterBodyGenerator: WaterBodyGenerator
	needOutsideWaterDist: number = 15

	mostRecentlyAccessedChunkColumnPos: [number, number] = [0, 0]
	mostRecentlyAccessedChunkColumn: ChunkColumnInfo = null

	cachedChunkColumnInfos: Map<string, ChunkColumnInfo> = new Map()
	maxCachedColumnInfos: number

	chunkFiller: ChunkFiller

	isServer: boolean

	constructor(chunkSize, blockMetadata, seed, isServer: boolean) {
		runningAsServer = isServer
		this.seed = seed
		// Store more on server as we likely have multiple players running around
		this.maxCachedColumnInfos = isServer ? 400 : 200

		this.cavesGenerator = new CavesGenerator(seed, chunkSize, this.neededOutsideChunkHeightRadius)

		const oreGenerator = new OreGenerator(blockMetadata, seed, chunkSize)
		this.biomeSelector = new BiomeSelector(this, this.cavesGenerator, oreGenerator, seed, chunkSize, blockMetadata)

		let treeMinDist = 100000
		let treeMaxDist = 0
		for (const biomeInfo of this.biomeSelector.biomes) {
			if (biomeInfo.biome.treeMinDist) {
				treeMinDist = Math.min(treeMinDist, biomeInfo.biome.treeMinDist)
				treeMaxDist = Math.max(treeMaxDist, biomeInfo.biome.treeMinDist)
			}
		}

		this.treeGenerator = new TreeGenerator(
			this.treeRadius,
			this.cavesGenerator,
			chunkSize,
			seed,
			{
				func: (pt) => {
					// Default to treeMaxDist so we always return a number
					// We don't need to worry about using treeMaxDist when it's null as we ignore trees that say they're
					// in a biome without trees
					return this._getBiome(pt[0], pt[1]).biome.treeMinDist || treeMaxDist
				},
				min: treeMinDist,
				max: treeMaxDist,
			},
			blockMetadata
		)

		this.chunkSize = chunkSize

		this.biomePointGen = new PointsGenerator(150, false, true, seed, 3, chunkSize)

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
				amplitude: 11,
				frequency: 1/4000,
			},
			{
				amplitude: 4,
				frequency: 1/1000,
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

		let heightmapPerturbAmpSum = 0
		for (const {amplitude} of this.heightmapPerturb.customOctaves) {
			heightmapPerturbAmpSum += amplitude
		}

		this.waterBodyGenerator = new WaterBodyGenerator(this, seed, heightmapPerturbAmpSum, this.needOutsideWaterDist)

		this.chunkFiller = new ChunkFiller(chunkSize,
			this.biomeSelector,
			this.cavesGenerator,
			this.treeGenerator,
			blockMetadata,
			oreGenerator,
			this.biomeSelector.baseBiome
		)
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
		const {
			biomeInfos,
			heightmapVals,
			caveInfos,
			treeTrunksAroundPoints,
			chunkOres
		} = this.getInfoForChunkColumn(x, z)


		this.chunkFiller.fillChunk(array, x, y, z, heightmapVals, treeTrunksAroundPoints, caveInfos, chunkOres, biomeInfos)
	}

	// x and z are bottom left corner of chunk
	private getInfoForChunkColumn(x: number, z: number): ChunkColumnInfo {
		if (this.mostRecentlyAccessedChunkColumn && this.mostRecentlyAccessedChunkColumnPos[0] === x && this.mostRecentlyAccessedChunkColumnPos[1] === z) {
			return this.mostRecentlyAccessedChunkColumn
		}

		const id = `${x}|${z}`
		const cached = this.cachedChunkColumnInfos.get(id)
		if (cached) {
			this.mostRecentlyAccessedChunkColumnPos[0] = x
			this.mostRecentlyAccessedChunkColumnPos[1] = z
			this.mostRecentlyAccessedChunkColumn = cached
			return cached
		}

		const allClosestBiomePoints = this._getClosestBiomesForChunk(x, z)
		const heightmapVals: HeightmapVals = this.getHeightMapVals(x, z, allClosestBiomePoints)

		const caveInfos = this.cavesGenerator.getCaveInfoForChunk(x, z, heightmapVals)
		const treeTrunksAroundPoints = this.treeGenerator._getTreeTrunksForBlocksInChunk(x, z, heightmapVals, allClosestBiomePoints, caveInfos)

		// Generate ores based on the biome in the center of the chunk
		const centerBiome = allClosestBiomePoints.get(x+Math.floor(this.chunkSize/2), z+Math.floor(this.chunkSize/2))[0].biome
		const chunkOres = centerBiome.oreGenerator.getOreBlocksForChunk(x, z)

		const result = {
			biomeInfos: this.biomeSelector.getBiomeInfoForChunkFill(x, z, allClosestBiomePoints),
			heightmapVals,
			caveInfos,
			treeTrunksAroundPoints,
			chunkOres
		}
		this.mostRecentlyAccessedChunkColumnPos[0] = x
		this.mostRecentlyAccessedChunkColumnPos[1] = z

		// At the moment, ~400 chunk column infos takes up ~100mb in memory.
		// This could be optimised by using int16arrays for treeTrunksAroundPoints and chunkOres (requires reformatting the data)
		this.mostRecentlyAccessedChunkColumn = result

		this.cachedChunkColumnInfos.set(id, result)
		if (this.cachedChunkColumnInfos.size > this.maxCachedColumnInfos) {
			this.cachedChunkColumnInfos.delete(this.cachedChunkColumnInfos.keys().next().value)
		}

		return result
	}

	// x and z are coords of bottom left block in chunk
	_getClosestBiomesForChunk(x, z): ClosestBiomesForChunk {
		const closestBiomes = new ObjectTwoDArray<ClosestBiomes>(this.chunkSize, [x, z], this.neededOutsideChunkHeightRadius)
		// const zOffsets = this._getBiomeZOffsets(z)

		for (let i = x-this.neededOutsideChunkHeightRadius; i < x+this.chunkSize+this.neededOutsideChunkHeightRadius; ++i) {
			for (let k = z-this.neededOutsideChunkHeightRadius; k < z+this.chunkSize+this.neededOutsideChunkHeightRadius; ++k) {
				const closestBiomesForXZ = this.getClosestBiomes(i, k)
				closestBiomes.set(i, k, closestBiomesForXZ)
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
		for (let i = 0; i < closestPts.length; i++) {
			const pointInfo = closestPts[i]

			const {biome, biomeId} = this.biomeSelector._getBiomeForBiomePoint(pointInfo.pt)
			const biomeInfo: CloseBiome = {
				weight: pointInfo.weight,
				biome,
				biomeId,
				biomeModifiers: null
			}

			if (i === 0) {
				biomeInfo.biomeModifiers = this.biomeSelector.getBiomeModifiersForBiomePoint(pointInfo.pt)
			}

			closestBiomesForXZ.push(biomeInfo)
		}

		return closestBiomesForXZ
	}


	// Only to be used for tree density and flower patches!! - _getClosestBiomesForChunk and _getBiomeForBiomePoint should be used for blocks/heightmap etc picking
	_getBiome(x, z): {biome: any, biomeId: any} {
		const xOffset = this._getBiomeXOffset(x, z)
		const zOffset = this._getBiomeZOffset(x, z)
		const biomePt = this.biomePointGen.getClosestPoint(x+xOffset, z+zOffset)
		return this.biomeSelector._getBiomeForBiomePoint(biomePt)
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
			groundHeights: new Int16TwoDArray(this.chunkSize, [x, z], this.neededOutsideChunkHeightRadius),
			waterHeights: new Int16TwoDArray(this.chunkSize, [x, z], this.neededOutsideChunkHeightRadius),
			cavesAllowedBelowY: new Int16TwoDArray(this.chunkSize, [x, z], this.neededOutsideChunkHeightRadius),
		}

		for (let i = x-this.neededOutsideChunkHeightRadius; i < x+this.chunkSize+this.neededOutsideChunkHeightRadius; ++i) {
			for (let k = z-this.neededOutsideChunkHeightRadius; k < z+this.chunkSize+this.neededOutsideChunkHeightRadius; ++k) {
				const closestBiomePts = allClosestBiomesForChunk.get(i, k)

				const perturbX = Math.floor(this.heightmapPerturb.getOctaves(i, k))
				const perturbZ = Math.floor(this.heightmapPerturb.getOctaves(i+200, k+778))
				const {groundHeight, waterHeight, cavesAllowedBelowY} = this.getWithWaterHeightmapVal(i+perturbX, k+perturbZ, closestBiomePts)

				heightmapVals.groundHeights.set(i, k, groundHeight)
				heightmapVals.waterHeights.set(i, k, waterHeight)
				heightmapVals.cavesAllowedBelowY.set(i, k, cavesAllowedBelowY)
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
					height = Math.floor(waterbedHeight + (heightOfWater-waterbedHeight) * distFrac - 2)
				}
				else {
					distFrac = distFrac*distFrac
					height = Math.floor(waterbedHeight + (heightOfWater-waterbedHeight) * distFrac)
				}

				waterHeight = heightOfWater
			}
			else if (distFromWater <= bankTopCutoff) {
				// Smooth down to water edge from bankTop
				const distFracToBankTop = (distFromWater - waterRadius) / (bankTopCutoff - waterRadius)

				height = heightOfWater + Math.ceil((bankTop-heightOfWater) * distFracToBankTop)
				// console.log(height)
			}
			else {
				// Smooth up to the peak of the bank
				const distFracToEdgeOfRiverArea = (distFromWater - bankTopCutoff) / (waterCutoff - bankTopCutoff)

				height = bankTop + Math.ceil((noWaterHeightmapVal-bankTop) * distFracToEdgeOfRiverArea)
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
		const useX = x
		const useZ = z


		// smoothing

		let localHeight = 0
		// let weights = 0
		for (const {biome, weight} of closestBiomePts) {
			localHeight += biome.getHeightmapVal(useX, useZ)*weight
			// weights += weight
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
