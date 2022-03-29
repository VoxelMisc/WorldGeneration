import Rand, {PRNG} from 'rand-seed'
import {manhattanXzDist} from './util'
import {PointsGenerator} from './PointsGenerator'
import {WorldGenerator} from './index'

export class FloraGenerator {

	worldGenerator: WorldGenerator
	blockMetadata
	seed: string

	grassChance: number
	cactusChance: number
	maxCactusHeight: number

	doFlowerGen: boolean
	flowerChances
	totalFlowerPatchChance: number
	flowerPatchPointGen: PointsGenerator

	constructor(blockMetadata, chunkSize, worldGenerator, seed, grassChance, {cactusChance, maxCactusHeight}, flowerSettings) {
		this.blockMetadata = blockMetadata
		this.worldGenerator = worldGenerator
		this.seed = seed
		this.grassChance = grassChance

		this.cactusChance = cactusChance
		this.maxCactusHeight = maxCactusHeight

		const defaultInsidePatchSpawnChance = 0.5
		this.flowerChances = [
			{flower: "Dandelion", patchChance: flowerSettings.dandelionChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance},
			{flower: "Poppy", patchChance: flowerSettings.poppyChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance},
			{flower: "Forget-me-not", patchChance: flowerSettings.forgetMeNotChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance},
			{flower: "Red Tulip", patchChance: flowerSettings.redTulipChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance},
			{flower: "Pink Tulip", patchChance: flowerSettings.pinkTulipChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance},
			{flower: "White Tulip", patchChance: flowerSettings.whiteTulipChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance},
			{flower: "Orange Tulip", patchChance: flowerSettings.orangeTulipChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance},
			{flower: "Daisy", patchChance: flowerSettings.daisyChance, insidePatchSpawnChance: defaultInsidePatchSpawnChance},
		]

		this.totalFlowerPatchChance = 0
		for (const {patchChance} of this.flowerChances) {
			this.totalFlowerPatchChance += patchChance
		}

		this.doFlowerGen = flowerSettings.flowerPatchDistApart !== null
		if (this.doFlowerGen) {
			this.flowerPatchPointGen = new PointsGenerator(flowerSettings.flowerPatchDistApart, false, true, seed, 15, chunkSize)
		}
	}

	getBiomeFlora(x, y, z, heightMapVal) {
		// Make assumption that biomes with cactus don't have other flora

		if (y === heightMapVal+1) {
			const xzRand = new Rand(`${x}${z}${this.seed}flora`, PRNG.mulberry32);
			if (this.doFlowerGen && this.totalFlowerPatchChance > 0) {
				const flowerPt = this.flowerPatchPointGen.getClosestPoint(x, z)

				if (manhattanXzDist(flowerPt, x, z) < 3) {
					const flowerPatchRand = new Rand(`${flowerPt[0]}${flowerPt[1]}${this.seed}flowerpatch`, PRNG.mulberry32);
					const flowerPatchNum = Math.floor(flowerPatchRand.next() * this.totalFlowerPatchChance)

					// We don't need to worry about the flower patch crossing the edge into a different biome as each Biome object
					// has its own FloraGenerator (which has its own flowerPatchPointGen)
					// The only "bad" thing that could happen is the biome of the center of the patch is in a different biome
					// And so we don't have a full patch

					let chanceSeenSoFar = 0

					let i = 0
					while (chanceSeenSoFar <= flowerPatchNum) {
						chanceSeenSoFar += this.flowerChances[i].patchChance
						i++
					}

					if (xzRand.next() < this.flowerChances[i-1].insidePatchSpawnChance) {
						// if (this.worldGenerator._getBiome(x, z) !== this.worldGenerator._getBiome(flowerPt[0], flowerPt[1])) {
						const flowerName = this.flowerChances[i - 1].flower
						return this.blockMetadata[flowerName].id
					}
				}
			}

			if (xzRand.next() < this.grassChance) {
				return this.blockMetadata["Tall Grass"].id
				// return this.blockMetadata["Cactus"].id
			}

		}

		if (this.cactusChance !== 0) {
			const xzRand = new Rand(`${x}${z}${this.seed}cactus`, PRNG.mulberry32);
			const haveCactus = xzRand.next() < this.cactusChance
			if (haveCactus) {
				const cactusHeight = Math.floor(xzRand.next()*(this.maxCactusHeight-1)) + 1
				if (y <= heightMapVal+cactusHeight) {
					return this.blockMetadata["Cactus"].id
				}
			}
		}

		return 0
	}
}
