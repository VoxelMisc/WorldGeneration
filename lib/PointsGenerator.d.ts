export declare class PointsGenerator {
    minDist: number;
    gridSize: number;
    maxStoredCells: number;
    pointsPerCell: number;
    _currCells: any[];
    _tempCellCoord: number[];
    constructor(minDistanceBetweenPoints: number);
    isPoint(x: any, z: any): boolean;
    getCellCoordFromGlobalCoord(x: any, z: any): number[];
    getCellPoints(cellX: any, cellZ: any): any;
    generateRandomPointsForCell(cellX: any, cellZ: any): import("@thi.ng/vectors").Vec[];
}
