import {TestBiome} from './TestBiome'
import {OreGenerator} from './OreGenerator'

export type ClosestBiomesForChunk = Record<string, ClosestBiomes>
export type ClosestBiomes = {weight: number, biome: TestBiome}[]

export type HeightmapVals = {
	groundHeights,
	waterHeights,
	cavesAllowedBelowY,
}

export type CaveInfos = Record<string, CaveInfo>

export type CaveInfo = {
	low: number,
	high: number,
}[]

export type BiomeOpts = {
	oreGenerator: OreGenerator,
}
