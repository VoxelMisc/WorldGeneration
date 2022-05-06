import {PointsGenerator} from './PointsGenerator'
import {manhattanXzDist, ObjectTwoDArray, Random} from './util'
import {OreBlocksForChunk, OreBlocksForColumn} from './types'

export class OreGenerator {
	ores
	blockMetadata
	seed: string
	chunkSize: number

	constructor(blockMetadata, seed, chunkSize) {
		this.blockMetadata = blockMetadata
		this.seed = seed
		this.chunkSize = chunkSize

		this.ores = {
			"Diamond Ore": {
				radius: 2,
				// Do 1024/(area of minDist circle) to get numdeposits per 32x32 chunk
				minDistBetweenDeposits: 13, // Todo increase
				minY: -100,
				maxY: -85,
				spawnChance: 0.3,
				pointGenerator: null,
			},
			"Gold Ore": {
				radius: 2,
				// Do 1024/(area of minDist circle) to get numdeposits per 32x32 chunk
				minDistBetweenDeposits: 12, // Todo increase
				minY: -100,
				maxY: -75,
				spawnChance: 0.4,
				pointGenerator: null,
			},
			"Iron Ore": {
				radius: 2,
				// Do 1024/(area of minDist circle) to get numdeposits per 32x32 chunk
				// minDistBetweenDeposits: 30,
				minDistBetweenDeposits: 5,
				minY: -80,
				maxY: 15,
				spawnChance: 0.5,
				pointGenerator: null,
			},
			"Coal Ore": {
				radius: 3,
				// Do 1024/(area of minDist circle) to get numdeposits per 32x32 chunk
				minDistBetweenDeposits: 4,
				// minDistBetweenDeposits: 30,
				minY: -60,
				maxY: 40,
				spawnChance: 0.5,
				pointGenerator: null,
			},
		}

		for (const oreName in this.ores) {
			const ore = this.ores[oreName]
			ore.pointGenerator = new PointsGenerator(
				ore.minDistBetweenDeposits,
				false,
				true,
				`${seed}${oreName}`,
				20,
				chunkSize,
				null,
				true,
			)
		}
	}

	// x, z are bottom left coords in chunk
	getOreBlocksForChunk(x, z): OreBlocksForChunk {
		const blockOres: OreBlocksForChunk = new ObjectTwoDArray<OreBlocksForColumn>(this.chunkSize, [x, z], 0)

		const oreExistsRandGen = new Random(`${x}${z}${this.seed}oreExists`);

		for (const oreName in this.ores) {
			const ore = this.ores[oreName]
			const oreId = this.blockMetadata[oreName].id

			// We make the assumption that the point cells surrounding the point cell the middle of the chunk is located in
			// Are big enough to give us all points including those we need outside the chunk but cross over the chunk boundary
			// (this assumption is true with points per cell=20, minDistBetweenDeposits=5, chunkSize=32)
			const veinPts = ore.pointGenerator.getPointsAroundPoint(x+this.chunkSize/2, z+this.chunkSize/2)

			const ignoreAboveX = x+this.chunkSize+ore.radius
			const ignoreBelowX = x-ore.radius-1

			const ignoreAboveZ = z+this.chunkSize+ore.radius
			const ignoreBelowZ = z-ore.radius-1

			for (const veinPt of veinPts) {
				if (
					veinPt[0] >= ignoreAboveX
					|| veinPt[0] <= ignoreBelowX
					|| veinPt[1] >= ignoreAboveZ
					|| veinPt[1] <= ignoreBelowZ
				) {
					continue
				}

				const veinRandGen = new Random(`${veinPt[0]}${veinPt[1]}${this.seed}ore`);
				const veinPtHeight = Math.floor(veinRandGen.next()*(ore.maxY-ore.minY))+ore.minY

				// Iterate around the vein (while still within the chunk)
				const blockXMin = Math.max(x, veinPt[0] - ore.radius)
				const blockXMax = Math.min(x+this.chunkSize-1, veinPt[0] + ore.radius)

				const blockZMin = Math.max(z, veinPt[1] - ore.radius)
				const blockZMax = Math.min(z+this.chunkSize-1, veinPt[1] + ore.radius)

				for (let blockX = blockXMin; blockX <= blockXMax; blockX++) {
					for (let blockZ = blockZMin; blockZ <= blockZMax; blockZ++) {

						const dist = manhattanXzDist(veinPt, blockX, blockZ)
						if (dist > ore.radius) {
							continue
						}

						if (oreExistsRandGen.next() >= ore.spawnChance) {
							continue
						}

						const storedOreInfo = {yLevel: veinPtHeight, oreId}
						if (!blockOres.get(blockX, blockZ)) {
							const xzYLevels = []
							blockOres.set(blockX, blockZ, xzYLevels)
							xzYLevels.push(storedOreInfo)
						}
						else {
							const xzYLevels = blockOres.get(blockX, blockZ)
							xzYLevels.push(storedOreInfo)
						}
					}
				}
			}
		}

		return blockOres
	}


	addOresToColumn(array, x, z, startX, startY, startZ, stoneEndHeight, columnOres: OreBlocksForColumn) {
		if (columnOres) {
			for (const {yLevel, oreId} of columnOres) {
				if (yLevel < stoneEndHeight && yLevel >= startY && yLevel < startY + this.chunkSize) {
					array.set(x - startX, yLevel - startY, z - startZ, oreId)
				}
			}
		}
	}
}