import {TestBiome} from './TestBiome'

export type ClosestBiomesForChunk = Record<string, ClosestBiomes>
export type ClosestBiomes = {weight: number, biome: TestBiome}[]

export type HeightmapVals = {
	groundHeights,
	waterHeights,
}
