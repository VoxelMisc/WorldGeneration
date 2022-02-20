import SimplexNoise from 'simplex-noise'
import {PointsGenerator} from './PointsGenerator'
import {NoiseHelper, SimplexCustomOctaveHelper, SimplexOctaveHelper} from './util'
const gen = require('random-seed')


export class TestBiome {
    // simplex = new SimplexNoise('seed')

    initialAmplitude = 50
    offsettedHeight = -this.initialAmplitude
    initialFrequency = 1/300

    numOctaves = 5

    treeHeight: number
    treeRadius: number

    groundBlockType: number

    blockMetadata
    chunkSize

    treeMinDist: number = 5

    _heightmapSimplex: NoiseHelper

    constructor(chunkSize, blockMetadata, seed, {treeHeight, treeRadius}) {
        this.chunkSize = chunkSize
        this.blockMetadata = blockMetadata
        this.treeHeight = treeHeight
        this.treeRadius = treeRadius

        this.groundBlockType = blockMetadata["Grass Block"].id

        this._heightmapSimplex = new SimplexOctaveHelper({
            amplitude: this.initialAmplitude,
            frequency: this.initialFrequency,
            numOctaves: this.numOctaves,
            amplitudeMultiplier: 0.5,
            seed: `${seed}TestBiome`
        })
    }

    // x, z are the co-ordinates of the column. GlobalY is bottom y coordinate of chunk
    getChunkColumn({array, globalX, globalY, globalZ, localX, localZ, heightMapVals, nearbyTrunks}) {
        for (let j = 0; j < this.chunkSize; ++j) {
            let blockId = this._getBlock(globalX, globalY+j, globalZ, heightMapVals, nearbyTrunks)
            array.set(localX, j, localZ, blockId)
        }
    }

    xzId(x, z) {
        return `${x}|${z}`
    }

    _getBlock(x, y, z, heightMapVals, treeTrunks) {
        const height = heightMapVals[this.xzId(x, z)]

        if (y < height) {
            return this.groundBlockType
        }

        return this._getTreeBlock(x, y, z, heightMapVals, treeTrunks)
    }

    _getTreeBlock(x, y, z, heightMapVals, treeTrunks) {
        const height = heightMapVals[this.xzId(x, z)]

        if (y < height+this.treeHeight && treeTrunks.includes(this.xzId(x, z))) {
            return this.blockMetadata["Oak Log"].id
        }

        if (y < height+this.treeHeight*3) {
            for (let treeTrunkId of treeTrunks) {
                const treeTrunkHeightmapVal = heightMapVals[treeTrunkId]

                if (y-2 > treeTrunkHeightmapVal
                    && y < treeTrunkHeightmapVal+this.treeHeight+this.treeRadius) {
                    return this.blockMetadata["Oak Leaves"].id
                }
            }
        }

        return 0
    }

    getHeightmapVal(x, z) {
        return this.offsettedHeight+this._heightmapSimplex.getOctaves(x, z)
    }
}



export class DesertBiome extends TestBiome {
    constructor(chunkSize, blockMetadata, seed, {treeHeight, treeRadius}) {
        super(chunkSize, blockMetadata, `${seed}Desert`, {treeHeight, treeRadius})

        this.treeMinDist = null

        this.groundBlockType = blockMetadata["Sand"].id
    }
}


export class PlainsBiome extends TestBiome {
    constructor(chunkSize, blockMetadata, seed, {treeHeight, treeRadius}) {
        super(chunkSize, blockMetadata, `${seed}Plains`, {treeHeight, treeRadius})

        this.groundBlockType = blockMetadata["Grass Block"].id

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
    constructor(chunkSize, blockMetadata, seed, {treeHeight, treeRadius}) {
        super(chunkSize, blockMetadata, `${seed}Forest`, {treeHeight, treeRadius})

        this.groundBlockType = blockMetadata["Grass Block"].id

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

// TODO Ocean biome
