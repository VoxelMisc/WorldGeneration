import { ArrayLikeIterable, Fn } from '@thi.ng/api';
export declare class PointsGenerator {
    minDist: number;
    densityFunc: Fn<ArrayLikeIterable<number>, number>;
    gridSize: number;
    maxStoredCells: number;
    pointsPerCell: number;
    _currCells: any[];
    _tempCellCoord: number[];
    useIsPoint: boolean;
    useKthClosestPoint: boolean;
    seed: string;
    constructor(minDistanceBetweenPoints: number, useIsPoint: boolean, useKthClosestPoint: boolean, seed: string, pointsPerCell: number, densityFunc?: any);
    isPoint(x: any, z: any): boolean;
    getClosestPoint(x: any, z: any): number[];
    getKClosestPointsWithWeights(x: any, z: any, distanceToSmoothAt: number): {
        pt: any;
        distDiffFromFirstPt: number;
        weight: any;
    }[];
    _getPointsSurroundingCell(cellCoord: any, cell: any): any;
    _getClosestPointsForGeneratedCell(cell: any, x: any, z: any, smoothDist: any): {
        pt: any;
        distDiffFromFirstPt: number;
        weight: any;
    }[];
    getCellCoordFromGlobalCoord(x: any, z: any): number[];
    getCell(cellX: any, cellZ: any): any;
    generateRandomPointsForCell(cellX: any, cellZ: any): {
        pointsSet: any;
        points: import("@thi.ng/vectors").Vec[];
    };
}
