import {TestBiome} from './TestBiome'

export type closestBiomesForChunk = Record<string, {weight: number, biome: TestBiome}[]>