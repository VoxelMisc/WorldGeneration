import { makeProfileHook } from './profileHook'
import {xzDistNoArr} from './util'
import PoissonDiskSampling from 'poisson-disk-sampling'

import Rand, {PRNG} from 'rand-seed'

const profilePoints = false
// const profiler = profilePoints ? makeProfileHook(110000, 'isPoint') : () => {}

export type VariableDensitySettings = {func: Function, min: number, max: number}

export class PointsGenerator {
	minDist: number
	variableDensitySettings: VariableDensitySettings

	gridSize: number

	maxStoredCells = 50

	_currCells = []
	_tempCellCoord = [0, 0]

	useIsPoint: boolean
	useKthClosestPoint: boolean

	seed: string

	useJitteredGrid: boolean

	customCellGap: number

	constructor(
		minDistanceBetweenPoints: number,
        useIsPoint: boolean,
        useKthClosestPoint: boolean,
        seed: string,
        pointsPerCell: number,
		chunkSize,
		variableDensitySettings: VariableDensitySettings=null,
		useJitteredGrid=false, // When true, many of the other above settings are ignored
		customCellGap=undefined,
	) {
		console.assert(Number.isInteger(minDistanceBetweenPoints))

		this.minDist = minDistanceBetweenPoints
		this.variableDensitySettings = variableDensitySettings
		this.customCellGap = customCellGap
		// this.gridSize = minDistanceBetweenPoints * 10
		this.useJitteredGrid = useJitteredGrid

		this.gridSize = Math.floor(Math.sqrt(pointsPerCell*Math.pow(minDistanceBetweenPoints, 2)))

		// Round our grid size

		if (useJitteredGrid) {
			// Make sure we are multiple of the minDistance
			const remainder = this.gridSize%minDistanceBetweenPoints

			if (remainder !== 0) {
				this.gridSize += minDistanceBetweenPoints-remainder
			}
		}
		else {
			// Otherwise ensure we are chunk-aligned to minimise thrashing
			const remainder = this.gridSize%chunkSize

			if (remainder !== 0) {
				// Round gridsize up to the nearest multiple of minDistanceBetweenPoints
				// Needed for jittered grid
				this.gridSize += chunkSize-remainder
			}
		}

		// const circleRadius = minDistanceBetweenPoints/2
		// this.gridSize = Math.floor(Math.sqrt(pointsPerCell*Math.PI*circleRadius*circleRadius))
		// console.log("grid size", this.gridSize, "for minDist", minDistanceBetweenPoints)

		this.useIsPoint = useIsPoint
		this.useKthClosestPoint = useKthClosestPoint

		this.seed = seed
	}

	isPoint(x, z) {
		const cellCoord = this.getCellCoordFromGlobalCoord(x, z);
		// profiler('start')
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
			// profiler('end')
			return true
		}

		// profiler('findPt')
		// profiler('end')
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

	getPointsAroundPoint(x, z) {
		const cellCoord = this.getCellCoordFromGlobalCoord(x, z)
		const cell = this.getCell(cellCoord[0], cellCoord[1])

		return this._getPointsSurroundingCell(cellCoord, cell)
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

		if (this._currCells.length > this.maxStoredCells) {
			this._currCells.pop()
		}

		return cell
	}

	generateRandomPointsForCell(cellX, cellZ) {
		const startX = cellX*this.gridSize
		const startZ = cellZ*this.gridSize

		let pts
		if (!this.useJitteredGrid) {
			const rand = new Rand(`${cellX}${cellZ}${this.seed}pts`, PRNG.mulberry32);
			const randFunc = () => {
				return rand.next()
			}

			let diskGenerator
			const shapeSize = this.gridSize-(this.customCellGap || this.minDist)

			if (this.variableDensitySettings === null) {
				diskGenerator = new PoissonDiskSampling({
					shape: [shapeSize, shapeSize],
					minDistance: this.minDist,
					maxDistance: this.minDist,
					tries: 40,
				}, randFunc)
			}
			else {
				const minDistance = this.variableDensitySettings.min
				const maxDistance = this.variableDensitySettings.max
				const distDiff = maxDistance-minDistance

				const realDistFunc = this.variableDensitySettings.func

				// Need a number between 0-1 where 0 is minDist and 1 is maxDist
				const distFunc = (pt) => {
					const realDist = realDistFunc([pt[0]+startX, pt[1]+startZ])
					return (realDist-minDistance)/distDiff
				}
				diskGenerator = new PoissonDiskSampling({
					shape: [shapeSize, shapeSize],
					minDistance: minDistance,
					maxDistance: maxDistance,
					tries: 10,
					distanceFunction: distFunc
				}, randFunc)
			}

			const genPts = diskGenerator.fill();

			// Map to a new list to make type smi instead of float
			pts = genPts.map((pt) => {
				return [Math.floor(startX+pt[0]), Math.floor(startZ+pt[1])]
			})
		}
		else {
			const jitterRandGen = new Rand(`${cellX}${cellZ}${this.seed}jitter`, PRNG.mulberry32);

			pts = []

			const endX = startX+this.gridSize
			const endZ = startZ+this.gridSize
			for (let x = startX; x < endX; x += this.minDist) {
				for (let z = startZ; z < endZ; z += this.minDist) {
					const xPt = x+Math.floor(jitterRandGen.next()*this.minDist)
					const zPt = z+Math.floor(jitterRandGen.next()*this.minDist)
					pts.push([xPt, zPt])
				}
			}
		}


		let pointsSet
		if (this.useIsPoint) {
			pointsSet = new Set()
			for (let pt of pts) {
				pointsSet.add(`${pt[0]}|${pt[1]}`)
			}
		}


		return {
			pointsSet,
			points: this.useKthClosestPoint ? pts : null,
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
