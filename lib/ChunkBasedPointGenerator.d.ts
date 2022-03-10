import { PointsGenerator } from './PointsGenerator';
export declare class ChunkBasedPointGenerator {
    chunkSize: number;
    pointsGenerator: PointsGenerator;
    _tempChunkCoord: number[];
    _maxRadiusChunk: number;
    seed: string;
    /**
     *
     * @param chunkSize
     * @param pointsGenerator
     * 	should generate points where the point co-ordinates represent the CHUNK co-ordinates
     * e.g. 0, 0 is one chunk, 0, 1 is the chunk above that
     * @param maxFeatureWidth Should be the max width of the feature in block width.
     * @param seed
     */
    constructor(chunkSize: number, pointsGenerator: PointsGenerator, maxFeatureWidth: number, seed: string);
    getChunkCoordFromGlobalCoord(x: any, z: any): number[];
    /**
     * Will search for features in chunks within maxFeatureWidth/2 range
     *
     * x and z should be the coords of the bottom left block in the chunk
     *
     * @param x
     * @param z
     *
     * @return
     */
    getSurroundingFeatures(x: number, z: number): [blockX: number, blockZ: number][];
    _getRandomPointInChunk(chunkX: any, chunkZ: any): number[];
}
