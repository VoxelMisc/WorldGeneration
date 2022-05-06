import {Random, xzDistNoArr} from './util'
import PoissonDiskSampling from 'poisson-disk-sampling'

import {getIsServer} from './index'

export type VariableDensitySettings = {func: Function, min: number, max: number}

export class PointsGenerator {
	minDist: number
	variableDensitySettings: VariableDensitySettings

	gridSize: number

	maxStoredCells = getIsServer() ? 100 : 50

	_currCells = new Map()
	_tempCellCoord = [0, 0]

	useIsPoint: boolean
	useKthClosestPoint: boolean

	seed: string

	useJitteredGrid: boolean

	customCellGap: number

	mostRecentlyAccessedCell = null

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

		this.useIsPoint = useIsPoint
		this.useKthClosestPoint = useKthClosestPoint

		this.seed = seed
	}

	isPoint(x, z) {
		const cellCoord = this.getCellCoordFromGlobalCoord(x, z);
		const {pointsSet} = this.getCell(cellCoord[0], cellCoord[1])

		if (pointsSet.has(`${x}|${z}`)) {
			return true
		}

		return false
	}

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
		// Find closest pt
		let closestPt: [number, number] = [0, 0]
		let closestDist = 100000
		for (const pt of cell.surroundingPoints) {
			const distToPt = xzDistNoArr(pt, x, z)
			if (distToPt < closestDist) {
				closestPt = pt
				closestDist = distToPt
			}
		}

		// Find all points whose dist to x, z is within smoothDist difference from closest point

		const returnedPoints = [{pt: closestPt, distDiffFromFirstPt: 0, weight: 0}]

		// Initialise to smoothDist as we already have weight from first point
		let weightTotal = smoothDist

		for (let i = 0; i < cell.surroundingPoints.length; i++) {
			const pt = cell.surroundingPoints[i]
			if (pt[0] === closestPt[0] && pt[1] === closestPt[1]) {
				continue
			}

			const dist = xzDistNoArr(pt, x, z)
			const distDiff = dist-closestDist
			if (distDiff < smoothDist) {
				returnedPoints.push({
					pt,
					distDiffFromFirstPt: distDiff,
					weight: 0,
				})

				weightTotal += smoothDist-distDiff
			}
		}

		for (const pt of returnedPoints) {
			pt.weight = (smoothDist-pt.distDiffFromFirstPt)/weightTotal
		}

		return returnedPoints
	}

	getCellCoordFromGlobalCoord(x, z) {
		this._tempCellCoord[0] = Math.floor(x/this.gridSize)
		this._tempCellCoord[1] = Math.floor(z/this.gridSize)

		return this._tempCellCoord
	}

	getCell(cellX, cellZ) {
		if (this.mostRecentlyAccessedCell
			&& this.mostRecentlyAccessedCell.coord[0] === cellX
			&& this.mostRecentlyAccessedCell.coord[1] === cellZ) {
			return this.mostRecentlyAccessedCell
		}

		const cellId = `${cellX}|${cellZ}`
		const cachedCell = this._currCells.get(cellId)
		if (cachedCell) {
			this.mostRecentlyAccessedCell = cachedCell
			return cachedCell
		}

		const {points, pointsSet} = this.generateRandomPointsForCell(cellX, cellZ)

		const cell = {
			coord: [cellX, cellZ],
			points,
			pointsSet,
			surroundingPoints: null,
		}

		this._currCells.set(cellId, cell)

		if (this._currCells.size > this.maxStoredCells) {
			this._currCells.delete(this._currCells.keys().next().value)
		}

		this.mostRecentlyAccessedCell = cell
		return cell
	}

	generateRandomPointsForCell(cellX, cellZ) {
		const startX = cellX*this.gridSize
		const startZ = cellZ*this.gridSize

		let pts
		if (!this.useJitteredGrid) {
			const rand = new Random(`${cellX}${cellZ}${this.seed}pts`);
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
			const jitterRandGen = new Random(`${cellX}${cellZ}${this.seed}jitter`);

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
