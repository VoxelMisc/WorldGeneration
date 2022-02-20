import SimplexNoise from 'simplex-noise'
import {PointsGenerator} from './PointsGenerator'
import {SimplexOctaveHelper} from './util'
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

    _heightmapSimplex: SimplexOctaveHelper

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


    // getHeightmapVal(x, z) {
    //     let amplitude = this.initialAmplitude
    //     let frequency = this.initialFrequency
    //     let result = 0
    //     for (let i = 0; i < this.numOctaves; i++) {
    //         result += this.simplex.noise2D(x*frequency, z*frequency)*amplitude
    //
    //         amplitude *= 0.5
    //         frequency *= 2
    //     }
    //
    //     return this.offsettedHeight+Math.floor(result)
    // }

    getHeightmapVal(x, z) {
        return this.offsettedHeight+Math.floor(this._heightmapSimplex.getOctaves(x, z))
    }
}

export class DesertBiome extends TestBiome {
    constructor(chunkSize, blockMetadata, seed, {treeHeight, treeRadius}) {
        super(chunkSize, blockMetadata, `${seed}Desert`, {treeHeight, treeRadius})

        this.groundBlockType = blockMetadata["Sand"].id

        this._heightmapSimplex = new SimplexOctaveHelper({
            amplitude: this.initialAmplitude,
            frequency: this.initialFrequency,
            numOctaves: this.numOctaves,
            amplitudeMultiplier: 0.5,
            seed: `${seed}DesertBiomeHeightmap`
        })

        console.log("FINAL!!")
    }
}
