import SimplexNoise from 'simplex-noise';
export declare function xzId(x: any, z: any): string;
export declare function xzIdArr(arr: any): string;
export declare type TxzId = string;
export declare function xzDist(x: any, z: any): number;
export declare function xzDistNoArr(pt1: any, x: any, z: any): number;
export declare class SimplexOctaveHelper {
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
export declare class SimplexCustomOctaveHelper {
    customOctaves: any;
    frequencyMultiplier: number;
    _simplexes: SimplexNoise[];
    constructor(customOctaves: {
        amplitude: number;
        frequency: number;
    }[], seed: any);
    getOctaves(x: any, z: any): number;
}
