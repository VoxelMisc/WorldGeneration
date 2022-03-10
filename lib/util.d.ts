import SimplexNoise from 'simplex-noise';
export declare function xzId(x: any, z: any): string;
export declare function xzIdArr(arr: any): string;
export declare type TxzId = string;
export declare function xzDistSq(x: any, z: any): number;
export declare function xzDist(x: any, z: any): number;
export declare function xzDistNoArr(pt1: any, x: any, z: any): number;
export declare function len2d(vec: any): number;
/**
 *
 *
 * @param pt
 * @param linePt1
 * @param linePt2
 */
export declare function distToClosestLinePoint(pt: any, linePt1: any, linePt2: any): number;
export declare function getPerturbOffsetsInChunk(x: any, z: any, perturber: any, chunkSize: any, lookOutsideChunkDist: any): any[];
export declare function getXZPerturbOffsetsFromAll(localI: any, localK: any, allOffsets: any, chunkSize: any, lookOutsideChunkDist: any): any;
export declare function normalise2d(arr: any): void;
export declare function dotProduct2d(arr1: any, arr2: any): number;
export declare function mod(n: any, m: any): number;
export interface NoiseHelper {
    getOctaves(x: number, z: number): number;
}
export declare class SimplexOctaveHelper implements NoiseHelper {
    amplitude: any;
    frequency: any;
    numOctaves: any;
    amplitudeMultiplier: any;
    frequencyMultiplier: number;
    _simplexes: SimplexNoise[];
    seed: any;
    constructor({ amplitude, frequency, numOctaves, amplitudeMultiplier, seed, frequencyMultiplier, }: {
        amplitude: any;
        frequency: any;
        numOctaves: any;
        amplitudeMultiplier: any;
        seed: any;
        frequencyMultiplier?: number;
    });
    getOctaves(x: any, z: any): number;
}
export declare class SimplexCustomOctaveHelper implements NoiseHelper {
    customOctaves: any;
    _simplexes: SimplexNoise[];
    constructor(customOctaves: {
        amplitude: number;
        frequency: number;
    }[], seed: any);
    getOctaves(x: any, z: any): number;
}
