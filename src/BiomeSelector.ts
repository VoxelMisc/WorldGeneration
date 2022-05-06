import {
	Biome,
	BluebellForestBiome,
	DesertBiome,
	ForestBiome,
	OceanBiome,
	PlainsBiome,
	RollingHillsBiome,
	SnowyMountains,
} from './Biome'
import {BiomeInfoForChunkFill, BiomeModifiers, BiomeOpts, ClosestBiomesForChunk} from './types'
import {OreGenerator} from './OreGenerator'
import {WorldGenerator} from './index'
import {Int16TwoDArray, Random} from './util'
import {CavesGenerator} from './CavesGenerator'


type stoneType = {
	stoneId: number,
	frequency: number,
}
export class BiomeSelector {
	baseBiome: Biome
	biomesTotalFrequency: number
	biomes: {biome: Biome, frequency: number}[]

	seed: string
	blockMetadata

	chunkSize: number

	mostRecentlyAccessedPtForBiome: [number, number] = [0, 0]
	mostRecentlyAccessedBiome: {biome, biomeId}

	mostRecentlyAccessedModifierPt: [number, number] = [0, 0]
	mostRecentlyAccessedModifier: BiomeModifiers

	private stoneTypes: stoneType[]
	private stonesTotalFrequency: number

	constructor(worldGenerator: WorldGenerator, cavesGenerator: CavesGenerator, oreGenerator: OreGenerator, seed: string, chunkSize: number, blockMetadata) {
		this.seed = seed
		this.blockMetadata = blockMetadata
		this.chunkSize = chunkSize

		const biomeOpts: BiomeOpts = {
			oreGenerator,
			cavesGenerator,
		}

		this.baseBiome = new Biome(
			chunkSize,
			blockMetadata,
			worldGenerator,
			seed,
			biomeOpts,
		)

		const desertBiome = new DesertBiome(
			chunkSize,
			blockMetadata,
			worldGenerator,
			seed,
			biomeOpts,
		)
		const plainsBiome = new PlainsBiome(
			chunkSize,
			blockMetadata,
			worldGenerator,
			seed,
			biomeOpts,
		)
		const forestBiome = new ForestBiome(
			chunkSize,
			blockMetadata,
			worldGenerator,
			seed,
			biomeOpts,
		)
		const oceanBiome = new OceanBiome(
			chunkSize,
			blockMetadata,
			worldGenerator,
			seed,
			biomeOpts,
		)
		const rollingHillsBiome = new RollingHillsBiome(
			chunkSize,
			blockMetadata,
			worldGenerator,
			seed,
			biomeOpts,
		)
		const snowyMountainsBiome = new SnowyMountains(
			chunkSize,
			blockMetadata,
			worldGenerator,
			seed,
			biomeOpts,
		)
		const blueFlowerForestBiome = new BluebellForestBiome(
			chunkSize,
			blockMetadata,
			worldGenerator,
			seed,
			biomeOpts,
		)
		this.biomes = [
			{ biome: desertBiome, frequency: 20, }, // cumuFreq set below
			{ biome: plainsBiome, frequency: 40, },
			{ biome: forestBiome, frequency: 40, },
			{ biome: rollingHillsBiome, frequency: 16, },
			{ biome: snowyMountainsBiome, frequency: 8, },
			{ biome: blueFlowerForestBiome, frequency: 2, },

			// { biome: oceanBiome, frequency: 20, },
		]

		this.biomesTotalFrequency = 0
		for (const biomeInfo of this.biomes) {
			this.biomesTotalFrequency += biomeInfo.frequency

			biomeInfo.biome.init()
		}

		this.stoneTypes = [
			{stoneId: blockMetadata["Stone"].id, frequency: 100},
			{stoneId: blockMetadata["Andesite"].id, frequency: 4}, // grey-ish colour
			{stoneId: blockMetadata["Diorite"].id, frequency: 2}, // white-ish colour
			{stoneId: blockMetadata["Granite"].id, frequency: 1}, // orange-ish colour
		]


		this.stonesTotalFrequency = 0
		for (const stoneInfo of this.stoneTypes) {
			this.stonesTotalFrequency += stoneInfo.frequency
		}
	}

	// x and z should be the center of the biome, as provided by biomePointGenerator closestPoint
	_getBiomeForBiomePoint(biomePt: number[]): {biome, biomeId} {
		if (this.mostRecentlyAccessedBiome && biomePt[0] === this.mostRecentlyAccessedPtForBiome[0] && biomePt[1] === this.mostRecentlyAccessedPtForBiome[1]) {
			return this.mostRecentlyAccessedBiome
		}

		const rand = new Random(`${biomePt[0]}|${biomePt[1]}|${this.seed}`);
		const biomeInt = Math.floor(rand.next()*this.biomesTotalFrequency)
		let freqSeenSoFar = 0

		let i = 0
		while (freqSeenSoFar <= biomeInt) {
			freqSeenSoFar += this.biomes[i].frequency
			i++
		}

		const selectedBiome = this.biomes[i-1].biome

		const result = {
			biome: selectedBiome,
			biomeId: i-1,
		}

		this.mostRecentlyAccessedBiome = result
		this.mostRecentlyAccessedPtForBiome[0] = biomePt[0]
		this.mostRecentlyAccessedPtForBiome[1] = biomePt[1]

		return result
	}

	getBiomeModifiersForBiomePoint(biomePt: [number, number]): BiomeModifiers {
		if (this.mostRecentlyAccessedModifier && biomePt[0] === this.mostRecentlyAccessedModifierPt[0] && biomePt[1] === this.mostRecentlyAccessedModifierPt[1]) {
			return this.mostRecentlyAccessedModifier
		}


		const rand = new Random(`${biomePt[0]}|${biomePt[1]}|${this.seed}Modifiers`);
		const stoneInt = Math.floor(rand.next()*this.stonesTotalFrequency)
		let stoneFreqSeenSoFar = 0

		let i = 0
		while (stoneFreqSeenSoFar <= stoneInt) {
			stoneFreqSeenSoFar += this.stoneTypes[i].frequency
			i++
		}

		const selectedStoneId = this.stoneTypes[i-1].stoneId

		const modifiers: BiomeModifiers = {
			stoneTypeId: selectedStoneId,
		}

		this.mostRecentlyAccessedModifier = modifiers
		this.mostRecentlyAccessedModifierPt[0] = biomePt[0]
		this.mostRecentlyAccessedModifierPt[1] = biomePt[1]

		return modifiers
	}

	// Generate a smaller object that will actually be used for immediate chunk generation
	// We do this as we don't need the weights and can discard other information, so as to reduce memory usage when cached
	getBiomeInfoForChunkFill(bottomLeftX: number, bottomLeftZ: number, infoForChunk: ClosestBiomesForChunk): BiomeInfoForChunkFill {
		const chunkFill: BiomeInfoForChunkFill = {
			biomeIds: new Int16TwoDArray(this.chunkSize, [bottomLeftX, bottomLeftZ]),
			stoneTypeIds: new Int16TwoDArray(this.chunkSize, [bottomLeftX, bottomLeftZ]),
		}

		for (let x = bottomLeftX; x < bottomLeftX+this.chunkSize; x++) {
			for (let z = bottomLeftZ; z < bottomLeftZ+this.chunkSize; z++) {
				const mainBiome = infoForChunk.get(x, z)[0]
				chunkFill.biomeIds.set(x, z, mainBiome.biomeId)
				chunkFill.stoneTypeIds.set(x, z, mainBiome.biomeModifiers.stoneTypeId)
			}
		}

		return chunkFill
	}

	getBiomeFromId(biomeId: number): Biome {
		return this.biomes[biomeId].biome
	}
}