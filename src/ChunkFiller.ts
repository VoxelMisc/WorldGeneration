import {BiomeSelector} from './BiomeSelector'
import {BiomeInfoForChunkFill, CaveInfos, HeightmapVals, NearestTreesForChunk, OreBlocksForChunk} from './types'
import constants, {NO_WATER_LEVEL} from './constants'
import {CavesGenerator} from './CavesGenerator'
import {TreeGenerator} from './TreeGenerator'
import {OreGenerator} from './OreGenerator'
import {Biome} from './Biome'

export class ChunkFiller {
	chunkSize: number
	biomeSelector: BiomeSelector
	cavesGenerator: CavesGenerator
	treeGenerator: TreeGenerator
	blockMetadata
	oreGenerator: OreGenerator
	baseBiome: Biome

	constructor(
		chunkSize: number,
		biomeSelector: BiomeSelector,
		cavesGenerator: CavesGenerator,
		treeGenerator: TreeGenerator,
		blockMetadata,
		oreGenerator: OreGenerator,
		baseBiome: Biome) {

		this.chunkSize = chunkSize
		this.biomeSelector = biomeSelector
		this.cavesGenerator = cavesGenerator
		this.treeGenerator = treeGenerator
		this.blockMetadata = blockMetadata
		this.oreGenerator = oreGenerator
		this.baseBiome = baseBiome
	}

	fillChunk(
		array,
		startX: number,
		startY: number,
		startZ: number,
		heightmapVals: HeightmapVals,
		treeTrunksAroundPoints: NearestTreesForChunk,
		caveInfos: CaveInfos,
		chunkOres: OreBlocksForChunk,
		biomeInfos: BiomeInfoForChunkFill): void {

		if (startY+this.chunkSize <= constants.bedrockLevel) {
			// Chunks entirely below bedrock are all air
			return
		}

		let maxTerrainHeightInChunk = -10000
		let minTerrainHeightInChunk = 10000

		let maxWaterHeightInChunk = -10000
		let minWaterHeightInChunk = 10000
		let chunkHasWater = false

		for (let x = startX; x < startX+this.chunkSize; x++) {
			for (let z = startZ; z < startZ + this.chunkSize; z++) {
				maxTerrainHeightInChunk = Math.max(maxTerrainHeightInChunk, heightmapVals.groundHeights.get(x, z))
				minTerrainHeightInChunk = Math.min(minTerrainHeightInChunk, heightmapVals.groundHeights.get(x, z))

				const waterHeight = heightmapVals.waterHeights.get(x, z)
				if (waterHeight !== NO_WATER_LEVEL) {
					chunkHasWater = true
					maxWaterHeightInChunk = Math.max(maxWaterHeightInChunk, waterHeight)
					minWaterHeightInChunk = Math.min(minWaterHeightInChunk, waterHeight)
				}
			}
		}

		// topsoil
		if (maxTerrainHeightInChunk >= startY && minTerrainHeightInChunk < startY+this.chunkSize) {
			for (let x = startX; x < startX+this.chunkSize; x++) {
				for (let z = startZ; z < startZ+this.chunkSize; z++) {
					const biomeId = biomeInfos.biomeIds.get(x, z)
					const biome = this.biomeSelector.getBiomeFromId(biomeId)
					const terrainHeight = heightmapVals.groundHeights.get(x, z)

					if (terrainHeight >= startY && terrainHeight < startY+this.chunkSize) {
						array.set(x-startX, terrainHeight-startY, z-startZ, biome.getTopsoilBlock(x, terrainHeight, z))
					}
				}
			}
		}

		const lowsoilBelowTerrain = 4
		// lowsoil
		if (maxTerrainHeightInChunk+1 >= startY && minTerrainHeightInChunk-lowsoilBelowTerrain < startY+this.chunkSize) {
			for (let x = startX; x < startX + this.chunkSize; x++) {
				for (let z = startZ; z < startZ + this.chunkSize; z++) {
					const biomeId = biomeInfos.biomeIds.get(x, z)
					const biome = this.biomeSelector.getBiomeFromId(biomeId)
					const terrainHeight = heightmapVals.groundHeights.get(x, z)

					const maxY = Math.min(terrainHeight, startY + this.chunkSize)
					for (let y = Math.max(terrainHeight - lowsoilBelowTerrain, startY); y < maxY; y++) {
						array.set(x - startX, y - startY, z - startZ, biome.getLowsoilBlockType(x, y, z, terrainHeight))
					}
				}
			}
		}


		// Stone below lowsoil
		if (maxTerrainHeightInChunk-lowsoilBelowTerrain >= startY) {
			for (let x = startX; x < startX + this.chunkSize; x++) {
				for (let z = startZ; z < startZ + this.chunkSize; z++) {
					// const biomeId = biomeInfos.biomeIds.get(x, z)
					const stoneTypeId = biomeInfos.stoneTypeIds.get(x, z)
					// const biome = this.biomeSelector.getBiomeFromId(biomeId)
					const terrainHeight = heightmapVals.groundHeights.get(x, z)

					const maxY = Math.min(terrainHeight - lowsoilBelowTerrain, startY + this.chunkSize)
					for (let y = startY; y < maxY; y++) {
						array.set(x - startX, y - startY, z - startZ, stoneTypeId)
					}
				}
			}
		}

		// Place ores
		if (maxTerrainHeightInChunk-lowsoilBelowTerrain >= startY) {
			for (let x = startX; x < startX + this.chunkSize; x++) {
				for (let z = startZ; z < startZ + this.chunkSize; z++) {
					const terrainHeight = heightmapVals.groundHeights.get(x, z)

					const columnOres = chunkOres.get(x, z)
					this.oreGenerator.addOresToColumn(array,
						x,
						z,
						startX,
						startY,
						startZ,
						terrainHeight - lowsoilBelowTerrain,
						columnOres
					)
				}
			}
		}

		// Caves
		if (maxTerrainHeightInChunk >= startY) {
			this.cavesGenerator.addCavesToChunk(array, startX, startY, startZ, caveInfos)
		}

		// Bedrock at bottom of world#
		if (constants.bedrockLevel >= startY && constants.bedrockLevel < startY+this.chunkSize) {
			for (let x = startX; x < startX+this.chunkSize; x++) {
				for (let z = startZ; z < startZ+this.chunkSize; z++) {
					array.set(x-startX, constants.bedrockLevel-startY, z-startZ, this.blockMetadata["Bedrock"].id)
				}
			}
		}


		// Place flora
		if (maxTerrainHeightInChunk+this.baseBiome.maxFloraHeight >= startY && minTerrainHeightInChunk+1 < startY+this.chunkSize) {
			for (let x = startX; x < startX + this.chunkSize; x++) {
				for (let z = startZ; z < startZ + this.chunkSize; z++) {
					const biomeId = biomeInfos.biomeIds.get(x, z)
					const biome = this.biomeSelector.getBiomeFromId(biomeId)
					const maxFloraHeight = biome.maxFloraHeight

					const terrainHeight = heightmapVals.groundHeights.get(x, z)
					if (terrainHeight >= startY + this.chunkSize
						|| terrainHeight < startY - maxFloraHeight) {
						continue
					}

					const waterHeight = heightmapVals.waterHeights.get(x, z)
					if (waterHeight !== NO_WATER_LEVEL) {
						continue
					}

					const groundIsCave = this.cavesGenerator.isCave(x, terrainHeight, z, caveInfos)
					if (groundIsCave) {
						continue
					}

					biome.floraGenerator.addBiomeFloraToColumn(array, startX, startZ, x, startY, z, terrainHeight)
				}
			}
		}

		// Trees
		if (maxTerrainHeightInChunk+this.treeGenerator.maxTreeHeight >= startY) {
			for (let x = startX; x < startX+this.chunkSize; x++) {
				for (let y = startY; y < startY+this.chunkSize; y++) {
					for (let z = startZ; z < startZ+this.chunkSize; z++) {
						const treesAroundPoint = treeTrunksAroundPoints.get(x, z)
						if (treesAroundPoint === undefined) {
							continue
						}

						const treeBlock = this.treeGenerator.getTreeBlock(x, y, z, heightmapVals.groundHeights, treesAroundPoint)
						if (treeBlock) {
							array.set(x-startX, y-startY, z-startZ, treeBlock)
						}
					}
				}
			}
		}

		// Water in rivers/lakes
		if (chunkHasWater && maxWaterHeightInChunk >= startY) {
			for (let x = startX; x < startX+this.chunkSize; x++) {
				for (let z = startZ; z < startZ+this.chunkSize; z++) {
					const waterHeight = heightmapVals.waterHeights.get(x, z)
					if (waterHeight === NO_WATER_LEVEL) {
						continue
					}

					const terrainHeight = heightmapVals.groundHeights.get(x, z)
					const maxY = Math.min(waterHeight+1, startY+this.chunkSize)
					for (let y = Math.max(terrainHeight+1, startY); y < maxY; y++) {
						array.set(x-startX, y-startY, z-startZ, this.blockMetadata["Water"].id)
					}
				}
			}
		}

		// Place sand on riverbed edges and lowsoil on bottom of rivers/lakes
		if (chunkHasWater && maxTerrainHeightInChunk >= startY && minTerrainHeightInChunk < startY+this.chunkSize) {
			for (let x = startX; x < startX + this.chunkSize; x++) {
				for (let z = startZ; z < startZ + this.chunkSize; z++) {
					const waterHeight = heightmapVals.waterHeights.get(x, z)
					const terrainHeight = heightmapVals.groundHeights.get(x, z)

					if (waterHeight !== NO_WATER_LEVEL && terrainHeight >= startY && terrainHeight < startY + this.chunkSize) {
						if (waterHeight === terrainHeight) {
							array.set(x - startX, terrainHeight - startY, z - startZ, this.blockMetadata["Sand"].id)
						}
						else {
							const biomeId = biomeInfos.biomeIds.get(x, z)
							const biome = this.biomeSelector.getBiomeFromId(biomeId)
							array.set(x - startX, terrainHeight - startY, z - startZ, biome.getLowsoilBlockType(x, terrainHeight, z, terrainHeight))
						}
					}
				}
			}
		}
	}
}
