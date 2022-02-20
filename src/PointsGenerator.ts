import { KdTreeSet } from "@thi.ng/geom-accel";
import { fit01 } from "@thi.ng/math";
import { samplePoisson } from "@thi.ng/poisson";
import { dist, randMinMax2 } from "@thi.ng/vectors";
import { makeProfileHook } from './profileHook'
import {xzDist, xzDistNoArr} from './util'
const gen = require('random-seed')
const createKDTree = require("static-kdtree")

const profilePoints = false
const profiler = profilePoints ? makeProfileHook(110000, 'isPoint') : () => {}

export class PointsGenerator {
	minDist: number
	gridSize: number

	maxStoredCells = 30
	pointsPerCell = 20

	_currCells = []
	_tempCellCoord = [0, 0]

	useIsPoint: boolean
	useKthClosestPoint: boolean

	seed: string

	constructor(minDistanceBetweenPoints: number, useIsPoint: boolean, useKthClosestPoint: boolean, seed: string) {
		console.assert(Number.isInteger(minDistanceBetweenPoints))

		this.minDist = minDistanceBetweenPoints
		// this.gridSize = minDistanceBetweenPoints * 10

		this.gridSize = Math.floor(Math.sqrt(this.pointsPerCell*Math.pow(minDistanceBetweenPoints, 2)))
		// const circleRadius = minDistanceBetweenPoints/2
		// this.gridSize = Math.floor(Math.sqrt(this.pointsPerCell*Math.PI*circleRadius*circleRadius))
		// console.log("grid size", this.gridSize, "for minDist", minDistanceBetweenPoints)

		this.useIsPoint = useIsPoint
		this.useKthClosestPoint = useKthClosestPoint

		this.seed = seed
	}

	isPoint(x, z) {
		const cellCoord = this.getCellCoordFromGlobalCoord(x, z);
		profiler('start')
		const {pointsSet} = this.getCell(cellCoord[0], cellCoord[1])

		// for (let pt of cellPts) {
		// 	if (ptEqual(pt, x, z)) {
		// 		profiler('findPt')
		// 		profiler('end')
		// 		return true
		// 	}
		// }

		if (pointsSet.has(`${x}|${z}`)) {
			// profiler('findPt')
			profiler('end')
			return true
		}

		// profiler('findPt')
		profiler('end')
		return false
	}

	// getKthClosestPoint(x, z, kthClosest) {
	// 	const kClosest = this.getKClosestPoints(x, z, kthClosest)
	// 	return kClosest[kClosest.length-1]
	// }

	getKClosestPoints(x, z) {
		const cellCoord = this.getCellCoordFromGlobalCoord(x, z)
		const cell = this.getCell(cellCoord[0], cellCoord[1])
		if (!cell.pointsInKdTree) {
			const pointsForKdTree = [...cell.points]
			for (let i = cellCoord[0]-1; i <= cellCoord[0]+1; i++) {
				for (let k = cellCoord[1]-1; k <= cellCoord[1]+1; k++) {
					if (ptEqual(cellCoord, i, k)) {
						continue
					}

					pointsForKdTree.push(...this.getCell(i, k).points)
				}
			}

			cell.pointsInKdTree = pointsForKdTree
			// cell.kdTree = createKDTree(pointsForKdTree)
		}

		// const idxsOfClosest = cell.kdTree.knn([x, z], k)
		// const closestPts = []
		// for (let i of idxsOfClosest) {
		// 	closestPts.push(cell.pointsInKdTree[i])
		// }

		return this._get2ClosestPtsForAlrdyGeneratedCell(cell, x, z)
	}

	_get2ClosestPtsForAlrdyGeneratedCell(cell, x, z) {
		let closestPt = [0, 0]
		let secondClosestPt = [0, 0]
		let closest = 10000
		let secondClosest = 10000
		for (let tryPt of cell.pointsInKdTree) {
			const dist = xzDistNoArr(tryPt, x, z)
			if (dist < closest) {
				secondClosestPt = closestPt
				closestPt = tryPt

				secondClosest = closest
				closest = dist
			}
			else if (dist < secondClosest) {
				secondClosestPt = tryPt
				secondClosest = dist
			}
		}

		return [closestPt, secondClosestPt]
	}

	getCellCoordFromGlobalCoord(x, z) {
		this._tempCellCoord[0] = Math.floor(x/this.gridSize)
		this._tempCellCoord[1] = Math.floor(z/this.gridSize)

		return this._tempCellCoord
	}

	getCell(cellX, cellZ) {
		// profiler('callFunc')
		for (let cell of this._currCells) {
			if (cell.coord[0] === cellX && cell.coord[1] === cellZ) {
				// profiler('findCell')
				return cell
			}
		}
		// profiler('findCell')

		const {points, pointsSet} = this.generateRandomPointsForCell(cellX, cellZ)
		// profiler('generatePts')

		const cell = {
			coord: [cellX, cellZ],
			points,
			pointsSet,
			kdTree: null,
			pointsInKdTree: null,
		}
		this._currCells.unshift(cell)
		if (this.minDist === 50) {
			// console.log(cell.points)
		}
		// console.log("Generating for", cellX, cellZ, "minDist", this.minDist)

		if (this._currCells.length > this.maxStoredCells) {
			this._currCells.pop()
		}

		return cell
	}

	generateRandomPointsForCell(cellX, cellZ) {
		const cellRand = gen(`${cellX}|${cellZ}|${this.seed}`)

		const startX = cellX*this.gridSize
		const startZ = cellZ*this.gridSize

		const index = new KdTreeSet(2);
		const pts = samplePoisson({
			index,
			points: () => {
				return [startX+cellRand(Math.floor(this.gridSize-this.minDist)-1), startZ+cellRand(Math.floor(this.gridSize-this.minDist)-1)]
			},
			density: this.minDist,
			max: 10000,
			quality: 300,
			// points: () => {
			// 	return randMinMax2(null, [0, 0], [20, 20])
			// },
			// density: (p) => fit01(Math.pow(dist(p, [250, 250]) / 250, 2), 2, 10),
		});

		let pointsSet
		if (this.useIsPoint) {
			pointsSet = new Set()
			for (let pt of pts) {
				pointsSet.add(`${pt[0]}|${pt[1]}`)
			}
		}

		return {
			pointsSet,
			points: this.useKthClosestPoint ? pts : undefined,
		}

		// return pts
	}
}

function ptEqual(pt: number[], x: number, z: number) {
	return pt[0] === x && pt[1] === z
}

function ptsEqual(pt1: number[], pt2: number[]) {
	return pt1[0] === pt2[0] && pt1[1] === pt2[1]
}
