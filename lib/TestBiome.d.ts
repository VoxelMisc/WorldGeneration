import { SimplexOctaveHelper } from './util';
export declare class TestBiome {
    initialAmplitude: number;
    offsettedHeight: number;
    initialFrequency: number;
    numOctaves: number;
    treeHeight: number;
    treeRadius: number;
    groundBlockType: number;
    blockMetadata: any;
    chunkSize: any;
    _heightmapSimplex: SimplexOctaveHelper;
    constructor(chunkSize: any, blockMetadata: any, seed: any, { treeHeight, treeRadius }: {
        treeHeight: any;
        treeRadius: any;
    });
    getChunkColumn({ array, globalX, globalY, globalZ, localX, localZ, heightMapVals, nearbyTrunks }: {
        array: any;
        globalX: any;
        globalY: any;
        globalZ: any;
        localX: any;
        localZ: any;
        heightMapVals: any;
        nearbyTrunks: any;
    }): void;
    xzId(x: any, z: any): string;
    _getBlock(x: any, y: any, z: any, heightMapVals: any, treeTrunks: any): any;
    _getTreeBlock(x: any, y: any, z: any, heightMapVals: any, treeTrunks: any): any;
    getHeightmapVal(x: any, z: any): number;
}
export declare class DesertBiome extends TestBiome {
    constructor(chunkSize: any, blockMetadata: any, seed: any, { treeHeight, treeRadius }: {
        treeHeight: any;
        treeRadius: any;
    });
}
