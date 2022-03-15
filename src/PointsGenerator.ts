import { KdTreeSet } from "@thi.ng/geom-accel";
import { samplePoisson } from "@thi.ng/poisson";
import { makeProfileHook } from './profileHook'
import {xzDist, xzDistNoArr} from './util'
import {ArrayLikeIterable, Fn} from '@thi.ng/api'
const gen = require('random-seed')

const profilePoints = false
const profiler = profilePoints ? makeProfileHook(110000, 'isPoint') : () => {}

export class PointsGenerator {
	minDist: number
	densityFunc: Fn<ArrayLikeIterable<number>, number>

	gridSize: number

	maxStoredCells = 50

	_currCells = []
	_tempCellCoord = [0, 0]

	useIsPoint: boolean
	useKthClosestPoint: boolean

	seed: string

	constructor(
		minDistanceBetweenPoints: number,
        useIsPoint: boolean,
        useKthClosestPoint: boolean,
        seed: string,
        pointsPerCell: number,
        densityFunc=null,
		useJitteredGrid=false // When true, many of the other above settings are ignored
	) {
		console.assert(Number.isInteger(minDistanceBetweenPoints))

		this.minDist = minDistanceBetweenPoints
		this.densityFunc = densityFunc
		// this.gridSize = minDistanceBetweenPoints * 10

		this.gridSize = Math.floor(Math.sqrt(pointsPerCell*Math.pow(minDistanceBetweenPoints, 2)))
		const remainder = this.gridSize%minDistanceBetweenPoints
		if (remainder !== 0) {
			// Round gridsize up to the nearest multiple of minDistanceBetweenPoints
			// Needed for jittered grid
			this.gridSize += minDistanceBetweenPoints-remainder
		}

		// const circleRadius = minDistanceBetweenPoints/2
		// this.gridSize = Math.floor(Math.sqrt(pointsPerCell*Math.PI*circleRadius*circleRadius))
		// console.log("grid size", this.gridSize, "for minDist", minDistanceBetweenPoints)

		this.useIsPoint = useIsPoint
		this.useKthClosestPoint = useKthClosestPoint

		this.seed = seed

		console.log(this.minDist, this.gridSize)
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

	getClosestPoint(x, z) {
		const cellCoord = this.getCellCoordFromGlobalCoord(x, z)
		const cell = this.getCell(cellCoord[0], cellCoord[1])

		const surroundingPoints = this._getPointsSurroundingCell(cellCoord, cell)

		let closestPt = [0, 0]
		let closestDist = 10000
		for (let tryPt of surroundingPoints) {
			const dist = xzDistNoArr(tryPt, x, z)
			if (dist < closestDist) {
				closestPt = tryPt
				closestDist = dist
			}
		}

		return closestPt
	}

	getKClosestPointsWithWeights(x, z, distanceToSmoothAt: number) {
		const cellCoord = this.getCellCoordFromGlobalCoord(x, z)
		const cell = this.getCell(cellCoord[0], cellCoord[1])

		this._getPointsSurroundingCell(cellCoord, cell)

		return this._getClosestPointsForGeneratedCell(cell, x, z, distanceToSmoothAt)
	}

	_getPointsSurroundingCell(cellCoord, cell) {
		if (!cell.surroundingPoints) {
			const surroundingPoints = [...cell.points]
			for (let i = cellCoord[0]-1; i <= cellCoord[0]+1; i++) {
				for (let k = cellCoord[1]-1; k <= cellCoord[1]+1; k++) {
					if (ptEqual(cellCoord, i, k)) {
						continue
					}

					surroundingPoints.push(...this.getCell(i, k).points)
				}
			}

			cell.surroundingPoints = surroundingPoints
		}

		return cell.surroundingPoints
	}

	_getClosestPointsForGeneratedCell(cell, x, z, smoothDist) {
		cell.surroundingPoints.sort((a, b) => {
			const distA = xzDistNoArr(a, x, z)
			const distB = xzDistNoArr(b, x, z)
			return distA-distB
		})

		const firstPtDist = xzDistNoArr(cell.surroundingPoints[0], x, z)
		const returnResult = [{pt: cell.surroundingPoints[0], distDiffFromFirstPt: 0, weight: null,}]

		// Initialise to smoothDist as we already have weight from first point
		let weightTotal = smoothDist

		for (let i = 1; i < cell.surroundingPoints.length; i++) {
			const dist = xzDistNoArr(cell.surroundingPoints[i], x, z)
			const distDiff = dist-firstPtDist
			if (distDiff < smoothDist) {
				returnResult.push({
					pt: cell.surroundingPoints[i],
					distDiffFromFirstPt: distDiff,
					weight: null,
				})

				weightTotal += smoothDist-distDiff
			}
			else {
				break
			}
		}

		// let totalWeights = 0
		for (const res of returnResult) {
			res.weight = (smoothDist-res.distDiffFromFirstPt)/weightTotal
			// totalWeights += res.weight
		}
		// Ensure total sum of weights is exactly 1 - actually mby not needed
		// returnResult[0].weight += (1-totalWeights)

		return returnResult
	}

	// _get2ClosestPtsForAlrdyGeneratedCell(cell, x, z) {
	// 	let closestPt = [0, 0]
	// 	let secondClosestPt = [0, 0]
	// 	let closest = 10000
	// 	let secondClosest = 10000
	// 	for (let tryPt of cell.surroundingPoints) {
	// 		const dist = xzDistNoArr(tryPt, x, z)
	// 		if (dist < closest) {
	// 			secondClosestPt = closestPt
	// 			closestPt = tryPt
	//
	// 			secondClosest = closest
	// 			closest = dist
	// 		}
	// 		else if (dist < secondClosest) {
	// 			secondClosestPt = tryPt
	// 			secondClosest = dist
	// 		}
	// 	}
	//
	// 	return [closestPt, secondClosestPt]
	// }

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
			surroundingPoints: null,
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

		// let times = 0
		const index = new KdTreeSet(2);
		const pts = samplePoisson({
			index,
			points: () => {
				return [startX+cellRand(Math.floor(this.gridSize-this.minDist)-1), startZ+cellRand(Math.floor(this.gridSize-this.minDist)-1)]
			},
			density: this.densityFunc ? this.densityFunc : this.minDist,
			max: 10000,
			quality: 40,
			// density: (p) => fit01(Math.pow(dist(p, [250, 250]) / 250, 2), 2, 10),
		});

		let pointsSet
		if (this.useIsPoint) {
			pointsSet = new Set()
			for (let pt of pts) {
				pointsSet.add(`${pt[0]}|${pt[1]}`)
			}
		}

		// console.log("Times", times)

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
