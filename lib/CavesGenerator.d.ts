export declare class CavesGenerator {
    caves: {
        count: number;
        thresholdNoiseSetup: any;
        thresholdPerturbSetup: any;
        heightNoiseSetup: any;
        heightPerturbSetup: any;
        threshold: any;
        height: any;
        heightPercentCap: any;
        thresholdNoises: any;
        thresholdPerturbNoises: any;
        heightNoises: any;
        heightPerturbNoises: any;
        caveOffset: any;
        caveTop: any;
    }[];
    chunkSize: number;
    constructor(seed: any, chunkSize: any);
    getCaveInfoForChunk(x: any, z: any): {};
}
