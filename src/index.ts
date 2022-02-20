import { Perlin } from "libnoise-ts/module/generator"
import SimplexNoise from 'simplex-noise'
import { PointsGenerator } from './PointsGenerator'
import {makeProfileHook} from './profileHook'
import {DesertBiome, ForestBiome, PlainsBiome, TestBiome} from './TestBiome'
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
		const plainsBiome = new PlainsBiome(
			chunkSize,
			blockMetadata,
			seed,
			{treeRadius: this.treeRadius, treeHeight: this.treeHeight}
		)
		const forestBiome = new ForestBiome(
			chunkSize,
			blockMetadata,
			seed,
			{treeRadius: this.treeRadius, treeHeight: this.treeHeight}
		)
		this.biomes = [
			// this.testBiome,
			this.desertBiome,
			plainsBiome,
			forestBiome,
		]

		this.chunkSize = chunkSize

		this.biomePointGen = new PointsGenerator(250, false, true, seed, 8)

		let treeMinDist = 10000
		for (const biome of this.biomes) {
			if (biome.treeMinDist !== null) {
				treeMinDist = Math.min(treeMinDist, biome.treeMinDist)
			}
		}
		this.treeGen = new PointsGenerator(
			// We actually use densityFunc to find the minDist for trees.
			// Use this to ensure we don't end up with absolutely massive cells.
			// BUT this does mean the max minDist can't be massively larger than the min dist
			treeMinDist,
			true,
			false,
			seed,
			300,
			(pt) => {
				return this._getBiome(pt[0], pt[1]).treeMinDist
			}
		)

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
		const allClosestBiomePoints = this._getClosest2BiomePoints(x, z)
		const heightMapVals = this._getHeightMapVals(x, z, allClosestBiomePoints)
		const treeTrunks = this._getTreeTrunksNearChunk(x, z, allClosestBiomePoints)

		for (let i = 0; i < this.chunkSize; ++i) {
			for (let k = 0; k < this.chunkSize; ++k) {
				const nearbyTrunks = this._getTrunksAroundPoint(x+i, z+k, treeTrunks)

				const closestBiomePts = allClosestBiomePoints[xzId(x+i, z+k)]
				const biome = this._getBiomeForBiomePoint(closestBiomePts[0].pt)

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
	_getClosest2BiomePoints(x, z) {
		const closestBiomePts = {}
		// const zOffsets = this._getBiomeZOffsets(z)

		for (let i = x-this.neededOutsideChunkHeightRadius; i < x+this.chunkSize+this.neededOutsideChunkHeightRadius; ++i) {
			// const xOffset = Math.floor(this.biomeOffsetSimplex.getOctaves(i, 0))
			for (let k = -this.neededOutsideChunkHeightRadius; k < this.chunkSize+this.neededOutsideChunkHeightRadius; ++k) {
				// const zOffset = zOffsets[k+this.neededOutsideChunkHeightRadius]
				// closestBiomePts[xzId(i, z+k)] = this.biomePointGen.getKClosestPoints(i+xOffset, z+k+zOffset)
				// closestBiomePts[xzId(i, z+k)] = this.biomePointGen.getKClosestPointsWithWeights(i, z+k)

				// Using 2d noise to perturb - looks much better than 1d!!!
				const xOffset = this._getBiomeXOffset(i, z+k)
				// Add random offsets to the z perturbation (to simulate sampling 2 noises instead of the same)
				const zOffset = this._getBiomeZOffset(i, z+k)
				closestBiomePts[xzId(i, z+k)] = this.biomePointGen.getKClosestPointsWithWeights(i+xOffset, z+k+zOffset, 60)
			}
		}
		return closestBiomePts
	}

	// x and z should be the center of the biome, as provided by biomePointGenerator closestPoint
	_getBiomeForBiomePoint(biomePt) {
		// const rand = gen(`${biomeX}|${biomeZ}|${this.seed}`)
		const rand = new Rand(`${biomePt[0]}|${biomePt[1]}|${this.seed}`, PRNG.mulberry32);
		const biomeInt = Math.floor(rand.next()*this.biomes.length)
		return this.biomes[biomeInt]
	}

	// Only to be used for tree density!! - _getClosest2BiomePoints and _getBiomeForBiomePoint should be used for blocks/heightmap etc picking
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
	_getHeightMapVals(x, z, allClosestBiomePoints) {
		const heights = {}
		for (let i = x-this.neededOutsideChunkHeightRadius; i < x+this.chunkSize+this.neededOutsideChunkHeightRadius; ++i) {
			for (let k = z-this.neededOutsideChunkHeightRadius; k < z+this.chunkSize+this.neededOutsideChunkHeightRadius; ++k) {

				// no smoothing

				// const closestBiomePts = allClosestBiomePoints[xzId(i, k)]
				// const closestBiome = this._getBiomeForBiomePoint(closestBiomePts[0].pt)
				// heights[xzId(i, k)] = closestBiome.getHeightmapVal(i, k)


				// smoothing

				let height = 0
				let weights = 0
				const closestBiomePts = allClosestBiomePoints[xzId(i, k)]
				for (const {pt, weight} of closestBiomePts) {
					const biome = this._getBiomeForBiomePoint(pt)
					height += biome.getHeightmapVal(i, k)*weight
					weights += weight
				}

				if (Math.abs(1-weights) > 0.001) {
					throw new Error("Weights don't add up!")
				}

				heights[xzId(i, k)] = Math.floor(height)
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
	_getTreeTrunksNearChunk(x, z, allClosestBiomePoints) {
		const trees = new Set()
		for (let i = x-this.treeRadius; i < x+this.chunkSize+this.treeRadius; i++) {
			for (let k = z-this.treeRadius; k < z+this.chunkSize+this.treeRadius; k++) {
				const closestBiomePts = allClosestBiomePoints[xzId(i, k)]
				const biome = this._getBiomeForBiomePoint(closestBiomePts[0].pt)
				if (biome.treeMinDist !== null) {
					const isTreeTrunk = this.treeGen.isPoint(i, k)
					if (isTreeTrunk) {
						trees.add(xzId(i, k))
					}
				}
			}
		}
		return trees
	}
}

export default { PointsGenerator, WorldGenerator }
