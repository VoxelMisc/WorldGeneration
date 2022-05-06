import {
    getCustomNoiseAmplitude,
    SimplexCustomOctaveHelper,
} from './util'
import {FloraGenerator} from './FloraGenerator'
import { WorldGenerator } from './index'
import {OreGenerator} from './OreGenerator'
import {
    BiomeOpts,
} from './types'
import {CavesGenerator} from './CavesGenerator'


export class Biome {
    offsettedHeight = -5

    topsoilBlockType: number
    lowsoilBlockType: number


    blockMetadata
    chunkSize

    treeMinDist: number = 5

    _heightmapSimplex: SimplexCustomOctaveHelper

    worldGenerator: WorldGenerator

    oreGenerator: OreGenerator

    cavesGenerator: CavesGenerator

    floraGenerator: FloraGenerator
    maxCactusHeight = 4
    grassChance = 0.025
    maxFloraHeight = this.maxCactusHeight

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
    bluebellChance = 0

    seed: string

    constructor(chunkSize, blockMetadata, worldGenerator: WorldGenerator, seed, {oreGenerator, cavesGenerator}: BiomeOpts) {
        this.chunkSize = chunkSize
        this.blockMetadata = blockMetadata
        this.seed = seed

        this.topsoilBlockType = blockMetadata["Grass Block"].id
        this.lowsoilBlockType = blockMetadata["Dirt"].id

        this.worldGenerator = worldGenerator

        this.oreGenerator = oreGenerator
        this.cavesGenerator = cavesGenerator
    }

    init() {
        // We need grassChance/cactusChance to be set by inheritees before we can construct this
        this.floraGenerator = new FloraGenerator(
            this.blockMetadata,
            this.chunkSize,
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
                bluebellChance: this.bluebellChance,
            }
        )
    }


    xzId(x, z) {
        return `${x}|${z}`
    }



    getHeightmapVal(x, z) {
        return this.offsettedHeight+this._heightmapSimplex.getOctaves(x, z)
    }
    
    // x y z should be the co-ordinate of the block that will be topsoil
    getTopsoilBlock(x, y, z) {
        return this.topsoilBlockType
    }

    // x y z should be the co-ordinate of the block that will be lowsoils
    getLowsoilBlockType(x, y, z, groundHeight) {
        return this.lowsoilBlockType
    }
}



export class DesertBiome extends Biome {
    grassChance = 0
    cactusChance = 0.0003
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


export class PlainsBiome extends Biome {
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

export class ForestBiome extends Biome {
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

export class BluebellForestBiome extends ForestBiome {
    bluebellChance = 1

    flowerPatchDistApart = 12
    poppyChance = 0
    daisyChance = 0
    pinkTulipChance = 0

    constructor(chunkSize, blockMetadata, worldGenerator, seed, biomeOpts) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}Blue`, biomeOpts)

    }

    init() {
        super.init()
    }
}

export class RollingHillsBiome extends Biome {
    constructor(chunkSize, blockMetadata, worldGenerator, seed, biomeOpts) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}RollingHills`, biomeOpts)

        this.topsoilBlockType = blockMetadata["Grass Block"].id

        this.treeMinDist = 25

        this.offsettedHeight = 20

        this._heightmapSimplex = new SimplexCustomOctaveHelper([
            {
                amplitude: 20,
                frequency: 1/200,
            },
            {
                amplitude: 4,
                frequency: 1/70,
            },
        ], `${seed}RollingHillsBiomeHeightMap`)
    }
}

export class SnowyMountains extends Biome {
    poppyChance = 0
    daisyChance = 0
    pinkTulipChance = 0
    grassChance = 0

    ridgedNoiseAmplitude: number

    ridgedNoiseOctave1: SimplexCustomOctaveHelper
    ridgedNoiseOctave2: SimplexCustomOctaveHelper
    nonRidgedNoise: SimplexCustomOctaveHelper

    constructor(chunkSize, blockMetadata, worldGenerator, seed, biomeOpts) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}SnowyMountains`, biomeOpts)

        this.treeMinDist = 50

        this.offsettedHeight = 0

        this.ridgedNoiseOctave1 = new SimplexCustomOctaveHelper([
            {
                amplitude: 80,
                frequency: 1/200,
            },
        ], `${seed}SnowyMountainsBiomeRidgedNoise`)

        this.ridgedNoiseOctave2 = new SimplexCustomOctaveHelper([
            {
                amplitude: 20,
                frequency: 1/120,
            },
        ], `${seed}SnowyMountainsBiomeRidgedNoiseOctave2`)

        this.nonRidgedNoise = new SimplexCustomOctaveHelper([
            {
                amplitude: 8,
                frequency: 1/120,
            },
        ], `${seed}SnowyMountainsBiomeNonRidgedNoise`)

        this.ridgedNoiseAmplitude = getCustomNoiseAmplitude(this.ridgedNoiseOctave1)+getCustomNoiseAmplitude(this.ridgedNoiseOctave2)
    }

    getHeightmapVal(x, z) {
        // Compute ridged noise
        const ridgedNoise = this.ridgedNoiseAmplitude-Math.abs(this.ridgedNoiseOctave1.getOctaves(x, z))-Math.abs(this.ridgedNoiseOctave2.getOctaves(x, z))
        return this.offsettedHeight + ridgedNoise + this.nonRidgedNoise.getOctaves(x, z)
    }

    getTopsoilBlock(x, y, z) {
        if (y > 80) {
            return this.blockMetadata["Snow"].id
        }
        if (y > 60) {
            return this.blockMetadata["Stone"].id
        }

        return this.blockMetadata["Grass Block"].id
    }

    // x y z should be the co-ordinate of the block that will be lowsoils
    getLowsoilBlockType(x, y, z, groundHeight) {
        if (y > 85 && y >= groundHeight-2) {
            return this.blockMetadata["Snow"].id
        }

        if (y > 57) {
            return this.blockMetadata["Stone"].id
        }

        return this.blockMetadata["Dirt"].id
    }
}







// Unused atm
export class OceanBiome extends Biome {
    grassChance = 0
    flowerPatchDistApart = null

    offsettedHeight = -10
    constructor(chunkSize, blockMetadata, worldGenerator, seed, biomeOpts) {
        super(chunkSize, blockMetadata, worldGenerator, `${seed}Ocean`, biomeOpts)

        this.topsoilBlockType = blockMetadata["Sand"].id
        this.lowsoilBlockType = blockMetadata["Sand"].id

        this.treeMinDist = null

        // this.fillToSeaLevel = true

        this._heightmapSimplex = new SimplexCustomOctaveHelper([
            {
                amplitude: 2,
                frequency: 1/70,
            },
        ], `${seed}ForestBiomeHeightMap`)
    }
}
