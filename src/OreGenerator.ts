import {PointsGenerator} from './PointsGenerator'
import Rand, {PRNG} from 'rand-seed'
import {manhattanXzDist} from './util'

export class OreGenerator {
	ores
	blockMetadata
	seed

	constructor(blockMetadata, seed) {
		this.blockMetadata = blockMetadata
		this.seed = seed

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
				spawnChance: 0.7,
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
			ore.pointGenerator = new PointsGenerator(ore.minDistBetweenDeposits, false, true, `${seed}${oreName}`, 20)
		}
	}

	getOreBlocksNearColumn(x, z) {
		const oreCenters: Record<number, string[]> = {}
		for (const blockName in this.ores) {
			const ore = this.ores[blockName]

			const veinPt = ore.pointGenerator.getClosestPoint(x, z)
			const veinRandGen = new Rand(`${veinPt[0]}${veinPt[1]}${this.seed}ore`, PRNG.mulberry32);
			const veinPtHeight = Math.floor(veinRandGen.next()*(ore.maxY-ore.minY))+ore.minY

			const dist = manhattanXzDist(veinPt, x, z)
			if (dist > ore.radius) {
				continue
			}
			// console.log(dist)

			if (!(veinPtHeight in oreCenters)) {
				oreCenters[veinPtHeight] = [blockName]
			}
			else {
				oreCenters[veinPtHeight].push(blockName)
			}
		}
		return oreCenters
	}

	getOreBlock(x, y, z, oresNearColumn) {
		if (y in oresNearColumn) {
			const nearbyOres = oresNearColumn[y]
			for (const nearbyOreName of nearbyOres) {
				const ore = this.ores[nearbyOreName]

				const blockGen = new Rand(`${x}${z}${this.seed}oreExists`, PRNG.mulberry32);
				if (blockGen.next() < ore.spawnChance) {
					return this.blockMetadata[nearbyOreName].id
				}
			}
		}
		return 0
	}
}