import SimplexNoise from 'simplex-noise'
import {PointsGenerator} from './PointsGenerator'
import {manhattanXzDist, NoiseHelper, SimplexCustomOctaveHelper, SimplexOctaveHelper, xzDist, xzId} from './util'
import constants from './constants'
import Rand, {PRNG} from 'rand-seed'
import {TreeGenerator} from './TreeGenerator'
import {FloraGenerator} from './FloraGenerator'
import { WorldGenerator } from './index'
const gen = require('random-seed')


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

    floraGenerator: FloraGenerator
    maxFloraHeight = 1
    grassChance = 0.025

    flowerPatchDistApart = 40
    poppyChance = 1
    daisyChance = 1
    pinkTulipChance = 1

    // These are rarer flowers, found in flower plains/forests
    forgetMeNotChance = 0
    whiteTulipChance = 0
    orangeTulipChance = 0
    redTulipChance = 0
    dandelionChance = 0

    seed: string

    constructor(chunkSize, blockMetadata, worldGenerator: WorldGenerator, seed) {
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
    }

    init() {
        // We need grassChance to be set by inheritees before we can construct this
        this.floraGenerator = new FloraGenerator(this.blockMetadata, this.worldGenerator, `${this.seed}flora`, this.grassChance, {
            flowerPatchDistApart: this.flowerPatchDistApart,
            dandelionChance: this.dandelionChance,
            poppyChance: this.poppyChance,
            forgetMeNotChance: this.forgetMeNotChance,
            redTulipChance: this.redTulipChance,
            pinkTulipChance: this.pinkTulipChance,
            whiteTulipChance: this.whiteTulipChance,
            orangeTulipChance: this.orangeTulipChance,
            daisyChance: this.daisyChance,
        })
    }

    // x, z are the co-ordinates of the column. GlobalY is bottom y coordinate of chunk
    getChunkColumn({array, globalX, globalY, globalZ, localX, localZ, heightMapVals, nearbyTrunks, caveInfos}) {
        for (let j = 0; j < this.chunkSize; ++j) {
            let blockId = this._getBlock(globalX, globalY+j, globalZ, heightMapVals, nearbyTrunks, caveInfos)
            array.set(localX, j, localZ, blockId)
        }
    }

    xzId(x, z) {
        return `${x}|${z}`
    }

    _getBlock(x, y, z, heightMapVals, treeTrunks, caveInfos) {
        // // console.log("Calling is cave")
        // if (this._isCave(x, y, z, caveInfos)) {
        //     // console.log("Is cave! yay")
        //     return this.blockMetadata["Sand"].id
        // }
        // else {
        //     // console.log("Not cave")
        //     return 0
        // }

        // if (z > 0) {
        //     return 0
        // }

        if (y < constants.bedrockLevel) {
            return 0
        }

        if (y === constants.bedrockLevel) {
            return this.blockMetadata["Bedrock"].id
        }

        const height = heightMapVals[xzId(x, z)]

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

        if (y === height && height < constants.seaLevel-1) {
            // The floorbed of oceans is sand (incase we have another biome extending into the sea)
            return this.blockMetadata["Sand"].id
        }

        if (y === height) {
            return this.topsoilBlockType
        }

        if (y >= height-4 && y < height) {
            return this.lowsoilBlockType
        }

        if (y < height-4) {
            return this.blockMetadata["Stone"].id
        }

        const treeBlock = this.worldGenerator.treeGenerator.getTreeBlock(x, y, z, heightMapVals, treeTrunks)
        if (treeBlock !== 0) {
            return treeBlock
        }

        if (y < constants.seaLevel) {
            return this.blockMetadata["Water"].id
        }

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
            if (y > low && y < high) {
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
    flowerPatchDistApart = null

    constructor(chunkSize, blockMetadata, worldGenerator, seed) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}Desert`)

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

    constructor(chunkSize, blockMetadata, worldGenerator, seed) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}Plains`)

        this.topsoilBlockType = blockMetadata["Grass Block"].id
        this.lowsoilBlockType = blockMetadata["Dirt"].id

        this.treeMinDist = 25

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
    constructor(chunkSize, blockMetadata, worldGenerator, seed) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}Forest`)

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
    constructor(chunkSize, blockMetadata, worldGenerator, seed) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}Ocean`)

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
    constructor(chunkSize, blockMetadata, worldGenerator, seed) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}RollingHills`)

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

