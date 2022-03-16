import {getxzFromId, xzDist, xzId} from './util'
import Rand, {PRNG} from 'rand-seed'
import {TestBiome} from './TestBiome'
import {PointsGenerator, VariableDensitySettings} from './PointsGenerator'
import {closestBiomesForChunk} from './types'

export class TreeGenerator {
	treeRadius: number
	baseBiome: TestBiome
	chunkSize: number
	seed: string
	treePointGen: PointsGenerator
	blockMetadata

	// Currently ForestBiome, should change this if change that
	// Also needs updating if another biome becomes the one with the minimum dist between trees
	treeMinDistApart = 6

	minTreeHeight = 4
	maxTreeHeight = 7

	constructor(treeRadius, baseBiome, chunkSize, seed, treeVariableDensitySettings: VariableDensitySettings, blockMetadata) {
		this.treeRadius = treeRadius
		this.baseBiome = baseBiome
		this.chunkSize = chunkSize
		this.seed = seed
		this.blockMetadata = blockMetadata

		this.treePointGen = new PointsGenerator(
			// We actually use densityFunc to find the minDist for trees.
			// Use this to ensure we don't end up with absolutely massive cells.
			// BUT this does mean the max minDist can't be massively larger than the min dist
			this.treeMinDistApart,
			true,
			false,
			seed,
			300,
			treeVariableDensitySettings
		)
	}

	// x and z are coords of bottom left block in chunk
	_getTreeTrunksForBlocksInChunk(x, z, heightMapVals, allClosestBiomesForChunk: closestBiomesForChunk, caveInfos) {
		const treesAroundPoints = {}
		for (let i = x-this.treeRadius; i < x+this.chunkSize+this.treeRadius; i++) {
			for (let k = z-this.treeRadius; k < z+this.chunkSize+this.treeRadius; k++) {
				const xzID = xzId(i, k)
				const closestBiomes = allClosestBiomesForChunk[xzID]
				const biome = closestBiomes[0].biome
				if (biome.treeMinDist !== null) {
					const isTreeTrunk = this.treePointGen.isPoint(i, k)
					if (isTreeTrunk) {
						// Check not on top of cave
						const heightmapVal = heightMapVals[xzID]
						// const caveInfo = caveInfos[xzID]
						// console.log(i, k, caveInfo)
						if (!this.baseBiome._isCave(i, heightmapVal, k, caveInfos)) {
							const rand = new Rand(`${i}${k}${this.seed}treeHeight`, PRNG.mulberry32);
							const treeHeight = Math.floor(rand.next()*(this.maxTreeHeight-this.minTreeHeight)) + this.minTreeHeight

							this._addTreeToTreesNearbyBlocks(treesAroundPoints, i, k, {
								id: xzID,
								height: treeHeight,
							}, x, z)
						}
					}
				}
			}
		}
		return treesAroundPoints
	}

	_addTreeToTreesNearbyBlocks(trees, x, z, tree, leftmostChunkX, bottommostChunkZ) {
		for (let i = x-this.treeRadius; i < x+this.treeRadius+1; i++) {
			for (let k = z-this.treeRadius; k < z+this.treeRadius+1; k++) {
				if (i >= leftmostChunkX && i < leftmostChunkX+32 && k >= bottommostChunkZ && k < bottommostChunkZ+32) {
					const xzID = xzId(i, k)
					const treesForBlock = trees[xzID] || []
					treesForBlock.push(tree)
					trees[xzID] = treesForBlock
				}
			}
		}
	}

	getTreeBlock(x, y, z, heightMapVals, treeTrunks) {
		const height = heightMapVals[xzId(x, z)]

		if (y <= height+this.maxTreeHeight) {
			const columnXzId = xzId(x, z)

			for (const {id, height: treeHeight} of treeTrunks) {
				const trunkTop = height+treeHeight
				if (id === columnXzId && y <= trunkTop) {
					return this.blockMetadata["Oak Log"].id
				}
			}
		}

		if (y <= height+this.maxTreeHeight+5) {
			for (let {id: treeTrunkId, height} of treeTrunks) {
				const treeTrunkHeightmapVal = heightMapVals[treeTrunkId]

				const leavesBottom = treeTrunkHeightmapVal+height-2
				const leavesTop = treeTrunkHeightmapVal+height+this.treeRadius

				if (y > leavesBottom
					&& y <= leavesTop) {
					// Within the leaf square "radius" (defined by this.treeRadius)
					// by default when treeTrunks is passed in
					// Now figure out the more finnicky ad-hoc tree randomisation stuff

					// return this.blockMetadata["Oak Leaves"].id


					// Assuming tree "radius" is 2
					// Block 2, 2 from center is 2.82 from center
					// block 1, 1 is 1.41

					let minRadius
					let maxRadius

					const [treeX, treeZ] = getxzFromId(treeTrunkId)

					if (y < leavesTop-1) {
						minRadius = 2.8
						maxRadius = 3
					}
					if (y === leavesTop-1) {
						minRadius = 1.2
						maxRadius = 1.7
					}
					else if (y === leavesTop) {
						minRadius = 0.2
						maxRadius = 1.1
					}

					const dist = xzDist([treeX, treeZ], [x, z])

					if (dist >= maxRadius) {
						continue
					}
					if (dist >= minRadius) {
						const rand = new Rand(`${x}${y}${z}leaf`, PRNG.mulberry32);
						if (rand.next() < 0.8) {
							return this.blockMetadata["Oak Leaves"].id
						}
						else {
							continue
						}
					}
					else {
						return this.blockMetadata["Oak Leaves"].id
					}
				}
			}
		}

		return 0
	}
}
