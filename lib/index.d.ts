import { PointsGenerator } from './PointsGenerator';
import { DesertBiome, TestBiome } from './TestBiome';
import { SimplexCustomOctaveHelper } from './util';
declare class WorldGenerator {
    chunkSize: number;
    biomePointGen: PointsGenerator;
    testBiome: TestBiome;
    desertBiome: DesertBiome;
    treeRadius: number;
    treeHeight: number;
    treeGen: PointsGenerator;
    neededOutsideChunkHeightRadius: number;
    seed: string;
    biomes: TestBiome[];
    biomeOffsetSimplex: SimplexCustomOctaveHelper;
    constructor(chunkSize: any, blockMetadata: any, seed: any);
    getChunk(array: any, x: any, y: any, z: any): void;
    _getClosest2BiomePoints(x: any, z: any): {};
    _getBiomeForBiomePoint(biomePt: any): TestBiome;
    _getBiome(x: any, z: any): TestBiome;
    _getBiomeXOffset(x: any, z: any): number;
    _getBiomeZOffset(x: any, z: any): number;
    _getHeightMapVals(x: any, z: any, allClosestBiomePoints: any): {};
    _getTrunksAroundPoint(x: any, z: any, treeTrunks: any): any[];
    _getTreeTrunksNearChunk(x: any, z: any, allClosestBiomePoints: any): Set<unknown>;
}
declare const _default: {
    PointsGenerator: typeof PointsGenerator;
    WorldGenerator: typeof WorldGenerator;
};
export default _default;
