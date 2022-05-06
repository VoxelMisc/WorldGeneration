import {Biome} from './Biome'
import {OreGenerator} from './OreGenerator'
import {Int16FourDArray, Int16TwoDArray, ObjectTwoDArray} from './util'
import {CavesGenerator} from './CavesGenerator'

export type ClosestBiomesForChunk = ObjectTwoDArray<ClosestBiomes>
export type ClosestBiomes = CloseBiome[]
export type CloseBiome = {weight: number; biome: Biome; biomeId: number; biomeModifiers: BiomeModifiers}
export type BiomeModifiers = {stoneTypeId: number}

export type BiomeInfoForChunkFill = {
	biomeIds: Int16TwoDArray,
	stoneTypeIds: Int16TwoDArray,
}

export type HeightmapVals = {
	groundHeights: Int16TwoDArray,
	waterHeights: Int16TwoDArray,
	cavesAllowedBelowY: Int16TwoDArray,
}


export type CaveInfos = Int16FourDArray

export type BiomeOpts = {
	oreGenerator: OreGenerator,
	cavesGenerator: CavesGenerator,
}

export type GetColumnArgs = {
	array,
	globalX: number,
	globalY: number,
	globalZ: number,
	localX: number,
	localZ: number,
	heightmapVals: HeightmapVals,
	nearbyTrunks: TreesAroundPoint,
	caveInfos: CaveInfos,
	chunkOres: OreBlocksForChunk,
	stoneTypeId: number,
}

export type NearestTreesForChunk = ObjectTwoDArray<TreesAroundPoint>
export type TreesAroundPoint = TreeNearPoint[]
export type TreeNearPoint = {
	pos: [number, number],
	height: number,
}

export type OreBlocksForColumn = {yLevel, oreId}[]
export type OreBlocksForChunk = ObjectTwoDArray<OreBlocksForColumn>
