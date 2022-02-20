import { Perlin } from "libnoise-ts/module/generator"
import SimplexNoise from 'simplex-noise'
import { PointsGenerator } from './PointsGenerator'
import {makeProfileHook} from './profileHook'
import {DesertBiome, TestBiome} from './TestBiome'
import {SimplexCustomOctaveHelper, SimplexOctaveHelper, TxzId, xzDist, xzId} from './util'
// const gen = require('random-seed')
import Rand, {PRNG} from 'rand-seed'

const profileGetChunk = false
const profiler = profileGetChunk ? makeProfileHook(50, 'getChunk') : () => {}

class WorldGenerator {
	chunkSize: number

	biomePointGen: PointsGenerator

	testBiome: TestBiome
	desertBiome: DesertBiome

	treeRadius = 2
	treeHeight = 5
	treeGen: PointsGenerator
	neededOutsideChunkHeightRadius = this.treeRadius

	seed: string

	biomes: TestBiome[]
	biomeOffsetSimplex: SimplexCustomOctaveHelper

	constructor(chunkSize, blockMetadata, seed) {
		this.testBiome = new TestBiome(
			chunkSize,
			blockMetadata,
			seed,
			{treeRadius: this.treeRadius, treeHeight: this.treeHeight}
		)
		this.desertBiome = new DesertBiome(
			chunkSize,
			blockMetadata,
			seed,
			{treeRadius: this.treeRadius, treeHeight: this.treeHeight}
		)
		this.biomes = [
			this.testBiome,
			this.desertBiome
		]

		this.chunkSize = chunkSize

		this.biomePointGen = new PointsGenerator(75, false, true, seed)
		this.treeGen = new PointsGenerator(200, true, false, seed)

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
	}

	// x, y, z are the co-ordinates of the bottom left block in the chunk
	getChunk(array, x, y, z) {
		const allClosestTwoBiomePoints = this._getClosest2BiomePoints(x, z)
		const heightMapVals = this._getHeightMapVals(x, z, allClosestTwoBiomePoints)
		const treeTrunks = this._getTreeTrunksNearChunk(x, z)

		for (let i = 0; i < this.chunkSize; ++i) {
			for (let k = 0; k < this.chunkSize; ++k) {
				const nearbyTrunks = this._getTrunksAroundPoint(x+i, z+k, treeTrunks)

				const closestTwoBiomePts = allClosestTwoBiomePoints[xzId(x+i, z+k)]
				const biome = this._getBiomeForBiomePoint(closestTwoBiomePts[0][0], closestTwoBiomePts[0][1])

				const biomeArgs = {
					array,
					globalX: x+i,
					globalY: y,
					globalZ: z+k,
					localX: i,
					localZ: k,
					heightMapVals,
					nearbyTrunks
				}
				biome.getChunkColumn(biomeArgs)
			}
		}
	}

	// x and z are coords of bottom left block in chunk
	_getClosest2BiomePoints(x, z): Record<TxzId, number[][]> {
		const closestBiomePts = {}
		// const zOffsets = this._getBiomeZOffsets(z)

		for (let i = x-this.neededOutsideChunkHeightRadius; i < x+this.chunkSize+this.neededOutsideChunkHeightRadius; ++i) {
			// const xOffset = Math.floor(this.biomeOffsetSimplex.getOctaves(i, 0))
			for (let k = -this.neededOutsideChunkHeightRadius; k < this.chunkSize+this.neededOutsideChunkHeightRadius; ++k) {
				// const zOffset = zOffsets[k+this.neededOutsideChunkHeightRadius]
				// closestBiomePts[xzId(i, z+k)] = this.biomePointGen.getKClosestPoints(i+xOffset, z+k+zOffset)
				closestBiomePts[xzId(i, z+k)] = this.biomePointGen.getKClosestPoints(i, z+k)

				// Using 2d noise to perturb - looks much better than 1d!!!
				const xOffset = Math.floor(this.biomeOffsetSimplex.getOctaves(i, z+k))
				// Add random offsets to the z perturbation (to simulate sampling 2 noises instead of the same)
				const zOffset = Math.floor(this.biomeOffsetSimplex.getOctaves(i+500, z+k+860))
				// closestBiomePts[xzId(i, z+k)] = this.biomePointGen.getKClosestPoints(i+xOffset, z+k+zOffset)
			}
		}
		return closestBiomePts
	}

	// _getBiomeZOffsets(z) {
	// 	const offsets = []
	// 	for (let i = -this.neededOutsideChunkHeightRadius; i<this.chunkSize+this.neededOutsideChunkHeightRadius; i++) {
	// 		const offset = Math.floor(this.biomeOffsetSimplex.getOctaves(0, z+i))
	// 		offsets.push(offset)
	// 	}
	// 	console.log(offsets)
	// 	return offsets
	// }

	// x and z should be the center of the biome, as provided by biomePointGenerator closestPoint
	_getBiomeForBiomePoint(biomeX, biomeZ) {
		// const rand = gen(`${biomeX}|${biomeZ}|${this.seed}`)
		const rand = new Rand(`${biomeX}|${biomeZ}|${this.seed}`, PRNG.mulberry32);
		const biomeInt = Math.floor(rand.next()*this.biomes.length)
		return this.biomes[biomeInt]
	}

	// x and z are coords of bottom left block in chunk
	_getHeightMapVals(x, z, allClosestTwoBiomePoints) {
		const heights = {}
		for (let i = x-this.neededOutsideChunkHeightRadius; i < x+this.chunkSize+this.neededOutsideChunkHeightRadius; ++i) {
			for (let k = z-this.neededOutsideChunkHeightRadius; k < z+this.chunkSize+this.neededOutsideChunkHeightRadius; ++k) {

				const closestTwoBiomePts = allClosestTwoBiomePoints[xzId(i, k)]
				// console.log(closestTwoBiomePts, x, i, z, k)
				const closestBiome = this._getBiomeForBiomePoint(closestTwoBiomePts[0][0], closestTwoBiomePts[0][1])
				const secondClosestBiome = this._getBiomeForBiomePoint(closestTwoBiomePts[1][0], closestTwoBiomePts[1][1])

				const currPoint = [i, k]
				const distClosestBiome = xzDist(closestTwoBiomePts[0], currPoint)
				const distSecondBiome = xzDist(closestTwoBiomePts[1], currPoint)

				const distDiff = distSecondBiome-distClosestBiome
				const startInterpolatingAt = 40
				if (distDiff < startInterpolatingAt) {
					const closestHeight = closestBiome.getHeightmapVal(i, k)
					const secondClosestHeight = secondClosestBiome.getHeightmapVal(i, k)

					// At diff 0 each should be weighted 0.5
					const secondBiomeWeight = (-(distDiff-startInterpolatingAt)/startInterpolatingAt)*0.5
					// heights[xzId(i, k)] = closestBiome.getHeightmapVal(i, k)
					heights[xzId(i, k)] = closestHeight*(1-secondBiomeWeight) + secondClosestHeight*secondBiomeWeight
				}
				else {
					heights[xzId(i, k)] = closestBiome.getHeightmapVal(i, k)
				}
			}
		}
		return heights
	}

	_getTrunksAroundPoint(x, z, treeTrunks) {
		const trunks = []
		for (let i = x-this.treeRadius; i<x+this.treeRadius+1; i++) {
			for (let k = z-this.treeRadius; k<z+this.treeRadius+1; k++) {
				const treeTrunkId = xzId(i, k)
				if (treeTrunks.has(treeTrunkId)) {
					trunks.push(treeTrunkId)
				}
			}
		}
		return trunks
	}


	// x and z are coords of bottom left block in chunk
	_getTreeTrunksNearChunk(x, z) {
		const trees = new Set()
		for (let i = x-this.treeRadius; i < x+this.chunkSize+this.treeRadius; i++) {
			for (let k = z-this.treeRadius; k < z+this.chunkSize+this.treeRadius; k++) {
				const isTreeTrunk = this.treeGen.isPoint(i, k)
				if (isTreeTrunk) {
					trees.add(xzId(i, k))
				}
			}
		}
		return trees
	}
}

export default { PointsGenerator, WorldGenerator }
