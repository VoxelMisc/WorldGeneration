import {manhattanXzDist, Random} from './util'
import {PointsGenerator} from './PointsGenerator'

export class FloraGenerator {

	blockMetadata
	seed: string

	grassChance: number
	cactusChance: number
	maxCactusHeight: number

	doFlowerGen: boolean
	flowerInfos
	totalFlowerPatchChance: number
	flowerPatchPointGen: PointsGenerator

	chunkSize: number

	// Set on a biome by biome basis to reduce computation time for biomes only with flowers that have small flower patches
	maxPatchRadius: number

	constructor(blockMetadata, chunkSize, seed, grassChance, {cactusChance, maxCactusHeight}, flowerSettings) {
		this.blockMetadata = blockMetadata
		this.seed = seed
		this.grassChance = grassChance

		this.cactusChance = cactusChance
		this.maxCactusHeight = maxCactusHeight

		this.chunkSize = chunkSize

		const defaultInsidePatchSpawnChance = 0.5
		const defaultPatchRadius = 3
		this.flowerInfos = [
			{flower: "Dandelion", patchChance: flowerSettings.dandelionChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance, patchRadius: defaultPatchRadius},
			{flower: "Poppy", patchChance: flowerSettings.poppyChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance, patchRadius: defaultPatchRadius},
			{flower: "Forget-me-not", patchChance: flowerSettings.forgetMeNotChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance, patchRadius: defaultPatchRadius},
			{flower: "Red Tulip", patchChance: flowerSettings.redTulipChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance, patchRadius: defaultPatchRadius},
			{flower: "Pink Tulip", patchChance: flowerSettings.pinkTulipChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance, patchRadius: defaultPatchRadius},
			{flower: "White Tulip", patchChance: flowerSettings.whiteTulipChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance, patchRadius: defaultPatchRadius},
			{flower: "Orange Tulip", patchChance: flowerSettings.orangeTulipChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance, patchRadius: defaultPatchRadius},
			{flower: "Daisy", patchChance: flowerSettings.daisyChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance, patchRadius: defaultPatchRadius},

			{flower: "Bluebell", patchChance: flowerSettings.bluebellChance, insidePatchSpawnChance: 0.85, patchRadius: 8},
		]

		this.maxPatchRadius = 0
		for (const {patchRadius} of this.flowerInfos) {
			this.maxPatchRadius = Math.max(this.maxPatchRadius, patchRadius)
		}

		this.totalFlowerPatchChance = 0
		for (const {patchChance} of this.flowerInfos) {
			this.totalFlowerPatchChance += patchChance
		}

		this.doFlowerGen = flowerSettings.flowerPatchDistApart !== null
		if (this.doFlowerGen) {
			this.flowerPatchPointGen = new PointsGenerator(flowerSettings.flowerPatchDistApart, false, true, seed, 4, chunkSize)
		}
	}

	addBiomeFloraToColumn(array, startX, startZ, x, startY, z, terrainHeight) {
		// Make assumption that biomes with cactus don't have other flora

		if (terrainHeight+1 >= startY && terrainHeight+1 < startY+this.chunkSize) {
			const xzRand = new Random(`${x}${z}${this.seed}flora`);

			if (xzRand.next() < this.grassChance) {
				array.set(x-startX, terrainHeight+1-startY, z-startZ, this.blockMetadata["Tall Grass"].id)
			}

			if (this.doFlowerGen && this.totalFlowerPatchChance > 0) {
				const flowerPt = this.flowerPatchPointGen.getClosestPoint(x, z)

				const distToPatchCenter = manhattanXzDist(flowerPt, x, z)
				if (distToPatchCenter < this.maxPatchRadius) {
					const flowerPatchRand = new Random(`${flowerPt[0]}${flowerPt[1]}${this.seed}flowerpatch`);
					const flowerPatchNum = Math.floor(flowerPatchRand.next() * this.totalFlowerPatchChance)

					// We don't need to worry about the flower patch crossing the edge into a different biome as each Biome
					// has its own FloraGenerator (which has its own flowerPatchPointGen)
					// The only "bad" thing that could happen is the biome of the center of the patch is in a different biome
					// And so we don't have a full patch

					let chanceSeenSoFar = 0

					let i = 0
					while (chanceSeenSoFar <= flowerPatchNum) {
						chanceSeenSoFar += this.flowerInfos[i].patchChance
						i++
					}
					const flowerInfo = this.flowerInfos[i-1]

					if (distToPatchCenter < flowerInfo.patchRadius && xzRand.next() < flowerInfo.insidePatchSpawnChance) {
						const flowerName = flowerInfo.flower
						array.set(x-startX, terrainHeight+1-startY, z-startZ, this.blockMetadata[flowerName].id)
					}
				}
			}
		}

		if (this.cactusChance !== 0) {
			const xzRand = new Random(`${x}${z}${this.seed}cactus`);
			const haveCactus = xzRand.next() < this.cactusChance
			if (haveCactus) {
				const cactusHeight = Math.floor(xzRand.next()*(this.maxCactusHeight-1)) + 1
				const maxY = Math.min(terrainHeight + cactusHeight + 1, startY + this.chunkSize)
				for (let y = Math.max(terrainHeight + 1, startY); y < maxY; y++) {
					array.set(x-startX, y-startY, z-startZ, this.blockMetadata["Cactus"].id)
				}
			}
		}
	}
}
