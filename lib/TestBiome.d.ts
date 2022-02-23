import { NoiseHelper } from './util';
export declare class TestBiome {
    initialAmplitude: number;
    offsettedHeight: number;
    initialFrequency: number;
    fillToSeaLevel: boolean;
    numOctaves: number;
    treeHeight: number;
    treeRadius: number;
    topsoilBlockType: number;
    lowsoilBlockType: number;
    blockMetadata: any;
    chunkSize: any;
    treeMinDist: number;
    _heightmapSimplex: NoiseHelper;
    constructor(chunkSize: any, blockMetadata: any, seed: any, { treeHeight, treeRadius }: {
        treeHeight: any;
        treeRadius: any;
    });
    getChunkColumn({ array, globalX, globalY, globalZ, localX, localZ, heightMapVals, nearbyTrunks, caveInfos }: {
        array: any;
        globalX: any;
        globalY: any;
        globalZ: any;
        localX: any;
        localZ: any;
        heightMapVals: any;
        nearbyTrunks: any;
        caveInfos: any;
    }): void;
    xzId(x: any, z: any): string;
    _getBlock(x: any, y: any, z: any, heightMapVals: any, treeTrunks: any, caveInfos: any): any;
    _isCave(x: any, y: any, z: any, caveInfos: any): boolean;
    _getTreeBlock(x: any, y: any, z: any, heightMapVals: any, treeTrunks: any): any;
    getHeightmapVal(x: any, z: any): number;
}
export declare class DesertBiome extends TestBiome {
    constructor(chunkSize: any, blockMetadata: any, seed: any, { treeHeight, treeRadius }: {
        treeHeight: any;
        treeRadius: any;
    });
}
export declare class PlainsBiome extends TestBiome {
    constructor(chunkSize: any, blockMetadata: any, seed: any, { treeHeight, treeRadius }: {
        treeHeight: any;
        treeRadius: any;
    });
}
export declare class ForestBiome extends TestBiome {
    constructor(chunkSize: any, blockMetadata: any, seed: any, { treeHeight, treeRadius }: {
        treeHeight: any;
        treeRadius: any;
    });
}
export declare class OceanBiome extends TestBiome {
    offsettedHeight: number;
    constructor(chunkSize: any, blockMetadata: any, seed: any, { treeHeight, treeRadius }: {
        treeHeight: any;
        treeRadius: any;
    });
}
export declare class RollingHillsBiome extends TestBiome {
    constructor(chunkSize: any, blockMetadata: any, seed: any, { treeHeight, treeRadius }: {
        treeHeight: any;
        treeRadius: any;
    });
}
