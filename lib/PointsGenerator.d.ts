export declare class PointsGenerator {
    minDist: number;
    gridSize: number;
    maxStoredCells: number;
    pointsPerCell: number;
    _currCells: any[];
    _tempCellCoord: number[];
    useIsPoint: boolean;
    useKthClosestPoint: boolean;
    seed: string;
    constructor(minDistanceBetweenPoints: number, useIsPoint: boolean, useKthClosestPoint: boolean, seed: string);
    isPoint(x: any, z: any): boolean;
    getKClosestPoints(x: any, z: any): number[][];
    _get2ClosestPtsForAlrdyGeneratedCell(cell: any, x: any, z: any): number[][];
    getCellCoordFromGlobalCoord(x: any, z: any): number[];
    getCell(cellX: any, cellZ: any): any;
    generateRandomPointsForCell(cellX: any, cellZ: any): {
        pointsSet: any;
        points: import("@thi.ng/vectors").Vec[];
    };
}
