export declare class CavesGenerator {
    spaghettCaves: {
        count: number;
        thresholdNoiseSetup: any;
        thresholdPerturbSetup: any;
        heightNoiseSetup: any;
        heightPerturbSetup: any;
        cutoffNoiseSetup: any;
        threshold: any;
        height: any;
        heightPercentCap: any;
        thresholdNoises: any;
        thresholdPerturbNoises: any;
        heightNoises: any;
        heightPerturbNoises: any;
        cutoffNoises: any;
        caveOffset: any;
        caveBot: any;
    }[];
    chunkSize: number;
    pitCaves: {
        count: number;
        maxWidth: number;
        minWidth: number;
        distApartInChunks: number;
        distPerturbNoiseSetup: {
            amplitude: number;
            frequency: number;
        }[];
        yPerturbNoiseSetup: {
            amplitude: number;
            frequency: number;
        }[];
        heightPerturbNoiseSetup: {
            amplitude: number;
            frequency: number;
        }[];
        edgesTargetMidpointNoiseSetup: {
            amplitude: number;
            frequency: number;
        }[];
        minHeight: number;
        maxHeight: number;
        minBottomPit: number;
        maxBottomPit: number;
        generators: any[];
        distPerturbNoises: any[];
        yPerturbNoises: any[];
        heightPerturbNoises: any[];
        edgesTargetMidpointNoise: any[];
    };
    ravineCaves: {
        count: number;
        maxWidth: number;
        minWidth: number;
        maxLength: number;
        minLength: number;
        distApartInChunks: number;
        distPerturbNoiseSetup: {
            amplitude: number;
            frequency: number;
        }[];
        yPerturbNoiseSetup: {
            amplitude: number;
            frequency: number;
        }[];
        minHeight: number;
        maxHeight: number;
        maxBottomRavine: number;
        minBottomRavine: number;
        generators: any[];
        distPerturbNoises: any[];
        yPerturbNoises: any[];
        edgesTargetMidpointNoise: any[];
    };
    sphereCaves: {
        count: number;
        maxRadius: number;
        minRadius: number;
        distApartInChunks: number;
        distPerturbNoiseSetup: {
            amplitude: number;
            frequency: number;
        }[];
        minCentreSphere: number;
        maxCentreSphere: number;
        generators: any[];
        distPerturbNoises: any[];
    };
    seed: string;
    lookOutsideChunkDist: number;
    constructor(seed: any, chunkSize: any, lookOutsideChunkDist: any);
    getCaveInfoForChunk(x: any, z: any): {};
    /**
     * @param x block x of column
     * @param z block z of column
     * @param caveInfoList
     */
    _addSpaghettCavesForColumn(x: any, z: any, caveInfoList: any): void;
    /**
     * x and z are coords of bottom left block
     *
     * @param x
     * @param z
     * @param caveInfos
     */
    _addPitCaves(x: any, z: any, caveInfos: any): void;
    /**
     * x and z are coords of bottom left block
     *
     * @param x
     * @param z
     * @param caveInfos
     */
    _addRavineCaves(x: any, z: any, caveInfos: any): void;
    /**
     * x and z are coords of bottom left block
     *
     * @param x
     * @param z
     * @param caveInfos
     */
    _addSphereCaves(x: any, z: any, caveInfos: any): void;
}
