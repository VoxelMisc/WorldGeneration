import SimplexNoise from 'simplex-noise'
import {PointsGenerator} from './PointsGenerator'
import {manhattanXzDist, NoiseHelper, SimplexCustomOctaveHelper, SimplexOctaveHelper, xzDist, xzId} from './util'
import constants, {NO_WATER_LEVEL} from './constants'
import Rand, {PRNG} from 'rand-seed'
import {TreeGenerator} from './TreeGenerator'
import {FloraGenerator} from './FloraGenerator'
import { WorldGenerator } from './index'
import {OreGenerator} from './OreGenerator'
import {BiomeOpts} from './types'


export class TestBiome {
    // simplex = new SimplexNoise('seed')

    initialAmplitude = 25
    offsettedHeight = 15
    initialFrequency = 1/300

    fillToSeaLevel = false

    numOctaves = 5

    topsoilBlockType: number
    lowsoilBlockType: number


    blockMetadata
    chunkSize

    treeMinDist: number = 5

    _heightmapSimplex: NoiseHelper

    worldGenerator: WorldGenerator

    oreGenerator: OreGenerator

    floraGenerator: FloraGenerator
    maxCactusHeight = 4
    maxFloraHeight = this.maxCactusHeight
    grassChance = 0.025

    flowerPatchDistApart = 40
    poppyChance = 1
    daisyChance = 1
    pinkTulipChance = 1

    // This is a 0-1 scalar
    // We make assumption that biomes with cactus don't have other flora
    cactusChance = 0

    // These are rarer flowers, found in flower plains/forests
    forgetMeNotChance = 0
    whiteTulipChance = 0
    orangeTulipChance = 0
    redTulipChance = 0
    dandelionChance = 0

    seed: string

    constructor(chunkSize, blockMetadata, worldGenerator: WorldGenerator, seed, {oreGenerator}: BiomeOpts) {
        this.chunkSize = chunkSize
        this.blockMetadata = blockMetadata
        this.seed = seed

        this.topsoilBlockType = blockMetadata["Grass Block"].id
        this.lowsoilBlockType = blockMetadata["Dirt"].id

        this.worldGenerator = worldGenerator

        this._heightmapSimplex = new SimplexOctaveHelper({
            amplitude: this.initialAmplitude,
            frequency: this.initialFrequency,
            numOctaves: this.numOctaves,
            amplitudeMultiplier: 0.5,
            seed: `${seed}TestBiome`
        })

        this.oreGenerator = oreGenerator
    }

    init() {
        // We need grassChance/cactusChance to be set by inheritees before we can construct this
        this.floraGenerator = new FloraGenerator(
            this.blockMetadata,
            this.chunkSize,
            this.worldGenerator,
            `${this.seed}flora`,
            this.grassChance,
            { cactusChance: this.cactusChance, maxCactusHeight: this.maxCactusHeight },
            {
                flowerPatchDistApart: this.flowerPatchDistApart,
                dandelionChance: this.dandelionChance,
                poppyChance: this.poppyChance,
                forgetMeNotChance: this.forgetMeNotChance,
                redTulipChance: this.redTulipChance,
                pinkTulipChance: this.pinkTulipChance,
                whiteTulipChance: this.whiteTulipChance,
                orangeTulipChance: this.orangeTulipChance,
                daisyChance: this.daisyChance,
            }
        )
    }

    // globalX, globalY are the global co-ordinates of the column. GlobalY is bottom y coordinate of chunk
    getChunkColumn({array, globalX, globalY, globalZ, localX, localZ, heightmapVals, nearbyTrunks, caveInfos, chunkOres}) {
        for (let j = 0; j < this.chunkSize; ++j) {
            let blockId = this._getBlock(globalX, globalY+j, globalZ, heightmapVals, nearbyTrunks, caveInfos, chunkOres)
            array.set(localX, j, localZ, blockId)
        }
    }

    xzId(x, z) {
        return `${x}|${z}`
    }

    _getBlock(x, y, z, {groundHeights, waterHeights}, treeTrunks, caveInfos, chunkOres) {
        // // console.log("Calling is cave")
        // if (this._isCave(x, y, z, caveInfos)) {
        //     // console.log("Is cave! yay")
        //     return this.blockMetadata["Sand"].id
        // }
        // else {
        //     // console.log("Not cave")
        //     return 0
        // }

        if (y < constants.bedrockLevel) {
            return 0
        }

        if (y === constants.bedrockLevel) {
            return this.blockMetadata["Bedrock"].id
        }

        const xzID = xzId(x, z)
        const height = groundHeights[xzID]

        if (y <= height && this._isCave(x, y, z, caveInfos)) {
        // if (this._isCave(x, y, z, caveInfos)) {
        //     return this.blockMetadata["Water"].id

            return 0
        }
        else {
            // if (y === height-1) {
            //     return this.blockMetadata["Grass Block"].id
            // }
            // return 0
        }

        if (y < height-4) {
            const oreBlock = this.oreGenerator.getOreBlock(x, y, z, chunkOres)
            if (oreBlock) {
                return oreBlock
            }

            return this.blockMetadata["Stone"].id
        }

        const waterHeight = waterHeights[xzID]
        // if (y === height && height < constants.seaLevel-1) {
        if (waterHeight !== NO_WATER_LEVEL && y === height) {
            // Determine waterbed block type
            if (y === waterHeight) {
                // Place sand on edges of rivers
                return this.blockMetadata["Sand"].id
            }
            else {
                return this.blockMetadata["Dirt"].id
            }
        }

        if (y === height) {
            return this.topsoilBlockType
        }

        if (y >= height-4 && y < height) {
            return this.lowsoilBlockType
        }

        if (waterHeight !== NO_WATER_LEVEL && y > height && y <= waterHeight) {
            return this.blockMetadata["Water"].id
        }


        const treeBlock = this.worldGenerator.treeGenerator.getTreeBlock(x, y, z, groundHeights, treeTrunks)
        if (treeBlock !== 0) {
            return treeBlock
        }

        // if (y < constants.seaLevel) {
        //     return this.blockMetadata["Water"].id
        // }

        if (y <= height+this.maxFloraHeight) {
            const groundIsCave = this._isCave(x, height, z, caveInfos)
            if (!groundIsCave) {
                const floraBlock = this.floraGenerator.getBiomeFlora(x, y, z, height)
                if (floraBlock) {
                    return floraBlock
                }
            }
        }


        return 0
    }

    _isCave(x, y, z, caveInfos) {
        const infos = caveInfos[xzId(x, z)]
        for (const {low, high} of infos) {
            if (y >= low && y <= high) {
                return true
            }
        }
        return false
    }

    getHeightmapVal(x, z) {
        return this.offsettedHeight+this._heightmapSimplex.getOctaves(x, z)
    }
}



export class DesertBiome extends TestBiome {
    grassChance = 0
    cactusChance = 0.0001
    flowerPatchDistApart = null

    constructor(chunkSize, blockMetadata, worldGenerator, seed, biomeOpts) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}Desert`, biomeOpts)

        this.treeMinDist = null

        this.topsoilBlockType = blockMetadata["Sand"].id
        this.lowsoilBlockType = blockMetadata["Sand"].id

        this._heightmapSimplex = new SimplexCustomOctaveHelper([
            {
                amplitude: 2,
                frequency: 1/70,
            },
            {
                amplitude: 1,
                frequency: 1/30,
            },
        ], `${seed}DesertBiomeHeightMap`)
    }
}


export class PlainsBiome extends TestBiome {
    grassChance = 0.18

    flowerPatchDistApart = 20
    forgetMeNotChance = 1
    whiteTulipChance = 1
    orangeTulipChance = 1
    redTulipChance = 1
    dandelionChance = 1

    constructor(chunkSize, blockMetadata, worldGenerator, seed, biomeOpts) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}Plains`, biomeOpts)

        this.topsoilBlockType = blockMetadata["Grass Block"].id
        this.lowsoilBlockType = blockMetadata["Dirt"].id

        this.treeMinDist = 75

        this._heightmapSimplex = new SimplexCustomOctaveHelper([
            {
                amplitude: 4,
                frequency: 1/70,
            },
            {
                amplitude: 2,
                frequency: 1/30,
            },
        ], `${seed}PlainsBiomeHeightMap`)
    }
}

export class ForestBiome extends TestBiome {
    constructor(chunkSize, blockMetadata, worldGenerator, seed, biomeOpts) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}Forest`, biomeOpts)

        this.topsoilBlockType = blockMetadata["Grass Block"].id
        this.lowsoilBlockType = blockMetadata["Dirt"].id

        // If change this, change treeMinDistApart in TreeGenerator
        this.treeMinDist = 6

        this._heightmapSimplex = new SimplexCustomOctaveHelper([
            {
                amplitude: 4,
                frequency: 1/70,
            },
            {
                amplitude: 2,
                frequency: 1/30,
            },
        ], `${seed}ForestBiomeHeightMap`)
    }
}

export class OceanBiome extends TestBiome {
    grassChance = 0
    flowerPatchDistApart = null

    // offsettedHeight = -60
    offsettedHeight = -10
    constructor(chunkSize, blockMetadata, worldGenerator, seed, biomeOpts) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}Ocean`, biomeOpts)

        this.topsoilBlockType = blockMetadata["Sand"].id
        this.lowsoilBlockType = blockMetadata["Sand"].id

        this.treeMinDist = null

        this.fillToSeaLevel = true

        this._heightmapSimplex = new SimplexCustomOctaveHelper([
            {
                amplitude: 2,
                frequency: 1/70,
            },
        ], `${seed}ForestBiomeHeightMap`)
    }
}

export class RollingHillsBiome extends TestBiome {
    constructor(chunkSize, blockMetadata, worldGenerator, seed, biomeOpts) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}RollingHills`, biomeOpts)

        this.topsoilBlockType = blockMetadata["Grass Block"].id

        this.treeMinDist = 25

        this.offsettedHeight = 55

        this._heightmapSimplex = new SimplexCustomOctaveHelper([
            {
                amplitude: 25,
                frequency: 1/250,
            },
            {
                amplitude: 4,
                frequency: 1/70,
            },
            {
                amplitude: 2,
                frequency: 1/30,
            },
        ], `${seed}RollingHillsBiomeHeightMap`)
    }
}

