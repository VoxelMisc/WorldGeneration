import {PointsGenerator} from './PointsGenerator'
import Rand, {PRNG} from 'rand-seed'
import {manhattanXzDist, TxzId, xzId} from './util'

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
				// minRadius: 1,
				// maxRadius: 2,
				radius: 2,
				// Do 1024/(area of minDist circle) to get numdeposits per 32x32 chunk
				minDistBetweenDeposits: 5, // Todo increase
				minY: -100,
				maxY: -70,
				spawnChance: 0.3,
				pointGenerator: null,
			},
			"Gold Ore": {
				// minRadius: 1,
				// maxRadius: 2,
				radius: 2,
				// Do 1024/(area of minDist circle) to get numdeposits per 32x32 chunk
				minDistBetweenDeposits: 5, // Todo increase
				minY: -80,
				maxY: -50,
				spawnChance: 0.4,
				pointGenerator: null,
			},
			"Iron Ore": {
				// minRadius: 2,
				// maxRadius: 2,
				radius: 2,
				// Do 1024/(area of minDist circle) to get numdeposits per 32x32 chunk
				// minDistBetweenDeposits: 30,
				minDistBetweenDeposits: 5,
				minY: -60,
				maxY: 15,
				// spawnChance: 1,
				spawnChance: 0.5,
				pointGenerator: null,
			},
			"Coal Ore": {
				// minRadius: 2,
				// maxRadius: 3,
				radius: 3,
				// Do 1024/(area of minDist circle) to get numdeposits per 32x32 chunk
				minDistBetweenDeposits: 5,
				// minDistBetweenDeposits: 30,
				minY: -60,
				maxY: 30,
				// spawnChance: 1,
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
				null,
				true
			)
		}
	}

	// x, y, z are bottom left coords in chunk
	getOreBlocksForChunk(x, y, z) {
		const blockOres: Record<TxzId, Record<number, number>> = {}

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

				const veinRandGen = new Rand(`${veinPt[0]}${veinPt[1]}${this.seed}ore`, PRNG.mulberry32);
				const veinPtHeight = Math.floor(veinRandGen.next()*(ore.maxY-ore.minY))+ore.minY

				// Iterate around the vein (while still within the chunk)
				const blockXMin = Math.max(x, veinPt[0] - ore.radius)
				const blockXMax = Math.min(x+this.chunkSize, veinPt[0] + ore.radius)

				const blockZMin = Math.max(z, veinPt[1] - ore.radius)
				const blockZMax = Math.min(z+this.chunkSize, veinPt[1] + ore.radius)

				for (let blockX = blockXMin; blockX <= blockXMax; blockX++) {
					for (let blockZ = blockZMin; blockZ <= blockZMax; blockZ++) {

						const dist = manhattanXzDist(veinPt, blockX, blockZ)
						if (dist > ore.radius) {
							continue
						}

						const blockGen = new Rand(`${blockX}${blockZ}${oreId}${this.seed}oreExists`, PRNG.mulberry32);
						if (blockGen.next() >= ore.spawnChance) {
							continue
						}

						const xzID = xzId(blockX, blockZ)
						if (!(xzID in blockOres)) {
							const xzYLevels = {}
							blockOres[xzID] = xzYLevels
							xzYLevels[veinPtHeight] = oreId
						}
						else {
							const xzYLevels = blockOres[xzID]
							xzYLevels[veinPtHeight] = oreId
						}
					}
				}
			}
		}

		return blockOres
	}

	getOreBlock(x, y, z, chunkOres) {
		const xzID = xzId(x, z)
		if (xzID in chunkOres) {
			const yLevels = chunkOres[xzID]
			const yId = y.toString()
			if (yId in yLevels) {
				return yLevels[yId]
			}
		}
		return 0
	}
}