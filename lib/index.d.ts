import { PointsGenerator } from './PointsGenerator';
import { TestBiome } from './TestBiome';
import { SimplexCustomOctaveHelper } from './util';
import { CavesGenerator } from './CavesGenerator';
declare class WorldGenerator {
    chunkSize: number;
    biomePointGen: PointsGenerator;
    treeRadius: number;
    treeHeight: number;
    treeGen: PointsGenerator;
    neededOutsideChunkHeightRadius: number;
    seed: string;
    biomes: {
        biome: TestBiome;
        frequency: number;
        cumuFreq: number;
    }[];
    biomeOffsetSimplex: SimplexCustomOctaveHelper;
    biomesTotalFrequency: number;
    cavesGenerator: CavesGenerator;
    baseBiome: TestBiome;
    constructor(chunkSize: any, blockMetadata: any, seed: any);
    getChunk(array: any, x: any, y: any, z: any): void;
    _getChunk(array: any, x: any, y: any, z: any): void;
    _getClosest2BiomePoints(x: any, z: any): {};
    _getBiomeForBiomePoint(biomePt: any): TestBiome;
    _getBiome(x: any, z: any): TestBiome;
    _getBiomeXOffset(x: any, z: any): number;
    _getBiomeZOffset(x: any, z: any): number;
    _getHeightMapVals(x: any, z: any, allClosestBiomePoints: any): {};
    _getTrunksAroundPoint(x: any, z: any, treeTrunks: any): any[];
    _getTreeTrunksNearChunk(x: any, z: any, heightMapVals: any, allClosestBiomePoints: any, caveInfos: any): Set<unknown>;
}
declare const _default: {
    WorldGenerator: typeof WorldGenerator;
};
export default _default;
