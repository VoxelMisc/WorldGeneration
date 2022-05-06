import {Int16TwoDArray, ObjectTwoDArray, Random, xzDist} from './util'
import {PointsGenerator, VariableDensitySettings} from './PointsGenerator'
import {ClosestBiomesForChunk, HeightmapVals, TreesAroundPoint, NearestTreesForChunk, CaveInfos} from './types'
import {NO_WATER_LEVEL} from './constants'
import {CavesGenerator} from './CavesGenerator'

export class TreeGenerator {
	treeRadius: number
	cavesGenerator: CavesGenerator
	chunkSize: number
	seed: string
	treePointGen: PointsGenerator
	blockMetadata

	// Currently ForestBiome, should change this if change that
	// Also needs updating if another biome becomes the one with the minimum dist between trees
	treeMinDistApart = 6

	minTreeHeight = 4
	maxTreeHeight = 7

	constructor(treeRadius, cavesGenerator: CavesGenerator, chunkSize, seed, treeVariableDensitySettings: VariableDensitySettings, blockMetadata) {
		this.treeRadius = treeRadius
		this.cavesGenerator = cavesGenerator
		this.chunkSize = chunkSize
		this.seed = seed
		this.blockMetadata = blockMetadata

		this.treePointGen = new PointsGenerator(
			// We actually use densityFunc to find the minDist for trees.
			// Use this to ensure we don't end up with absolutely massive cells.
			// BUT this does mean the max minDist can't be massively larger than the min dist
			6,
			true,
			false,
			seed,
			300,
			chunkSize,
			treeVariableDensitySettings,
			false,
			2
		)
	}

	// x and z are coords of bottom left block in chunk
	_getTreeTrunksForBlocksInChunk(x, z, {groundHeights, waterHeights}: HeightmapVals, allClosestBiomesForChunk: ClosestBiomesForChunk, caveInfos: CaveInfos): NearestTreesForChunk {
		const treesAroundPoints = new ObjectTwoDArray<TreesAroundPoint>(this.chunkSize, [x, z], this.treeRadius)

		for (let i = x-this.treeRadius; i < x+this.chunkSize+this.treeRadius; i++) {
			for (let k = z-this.treeRadius; k < z+this.chunkSize+this.treeRadius; k++) {
				const closestBiomes = allClosestBiomesForChunk.get(i, k)
				const biome = closestBiomes[0].biome
				if (biome.treeMinDist !== null) {
					const isTreeTrunk = this.treePointGen.isPoint(i, k)
					if (isTreeTrunk && waterHeights.get(i, k) === NO_WATER_LEVEL) {
						// Check not on top of cave
						const heightmapVal = groundHeights.get(i, k)
						if (!this.cavesGenerator.isCave(i, heightmapVal, k, caveInfos)) {
							const rand = new Random(`${i}${k}${this.seed}treeHeight`);
							const treeHeight = Math.floor(rand.next()*(this.maxTreeHeight-this.minTreeHeight)) + this.minTreeHeight

							this._addTreeToTreesNearbyBlocks(treesAroundPoints, i, k, {
								pos: [i, k],
								height: treeHeight,
							}, x, z)
						}
					}
				}
			}
		}

		return treesAroundPoints
	}

	_addTreeToTreesNearbyBlocks(treesAroundPoints: NearestTreesForChunk, x, z, tree, leftmostChunkX, bottommostChunkZ) {
		for (let i = x-this.treeRadius; i <= x+this.treeRadius; i++) {
			for (let k = z-this.treeRadius; k <= z+this.treeRadius; k++) {
				if (i >= leftmostChunkX && i < leftmostChunkX+this.chunkSize && k >= bottommostChunkZ && k < bottommostChunkZ+this.chunkSize) {
					const treesForBlock: TreesAroundPoint = treesAroundPoints.get(i, k) || []
					treesForBlock.push(tree)
					treesAroundPoints.set(i, k, treesForBlock)
				}
			}
		}
	}

	getTreeBlock(x, y, z, groundHeights: Int16TwoDArray, treeTrunks: TreesAroundPoint) {
		const height = groundHeights.get(x, z)

		if (y < height) {
			return 0
		}

		if (y <= height+this.maxTreeHeight) {
			for (const {pos, height: treeHeight} of treeTrunks) {
				const trunkTop = height+treeHeight
				if (pos[0] === x && pos[1] === z && y <= trunkTop) {
					return this.blockMetadata["Oak Log"].id
				}
			}
		}

		if (y <= height+this.maxTreeHeight+5) {
			for (let {pos: [treeX, treeZ], height} of treeTrunks) {
				const treeTrunkHeightmapVal = groundHeights.get(treeX, treeZ)

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
						const rand = new Random(`${x}${y}${z}leaf`);
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
