import { KdTreeSet } from "@thi.ng/geom-accel";
import { fit01 } from "@thi.ng/math";
import { samplePoisson } from "@thi.ng/poisson";
import { dist, randMinMax2 } from "@thi.ng/vectors";
import { makeProfileHook } from './profileHook'
const gen = require('random-seed')
const StopWatch = require("@slime/stopwatch");

const profilePoints = true
const profiler = profilePoints ? makeProfileHook(1000000, 'isPoint') : () => {}

export class PointsGenerator {

	minDist: number
	gridSize: number

	maxStoredCells = 40
	pointsPerCell = 200

	_currCells = []
	_tempCellCoord = [0, 0]

	// genStopwatch = new StopWatch()
	// findCellStopwatch = new StopWatch()
	// findPointStopwatch = new StopWatch()

	constructor(minDistanceBetweenPoints: number) {
		console.assert(Number.isInteger(minDistanceBetweenPoints))

		this.minDist = minDistanceBetweenPoints
		// this.gridSize = minDistanceBetweenPoints * 10

		this.gridSize = Math.sqrt(this.pointsPerCell*Math.pow(minDistanceBetweenPoints, 2))
		// const circleRadius = minDistanceBetweenPoints/2
		// this.gridSize = Math.floor(Math.sqrt(this.pointsPerCell*Math.PI*circleRadius*circleRadius))
		console.log("grid size", this.gridSize, "for minDist", minDistanceBetweenPoints)

		// setInterval(() => {
		// 	console.log(this.genStopwatch.getTimeElapsedInStopWatchFormatString, this.findCellStopwatch.getTimeElapsedInStopWatchFormatString, this.findPointStopwatch.getTimeElapsedInStopWatchFormatString)
		// }, 4000)
	}

	isPoint(x, z) {
		const cellCoord = this.getCellCoordFromGlobalCoord(x, z)
		profiler('start')
		const cellPts = this.getCellPoints(cellCoord[0], cellCoord[1])

		// this.findPointStopwatch.startTimer()
		for (let pt of cellPts) {
			if (ptEqual(pt, x, z)) {
				profiler('findPt')
				profiler('end')
				return true
			}
		}
		profiler('findPt')
		// this.findPointStopwatch.stopTimer()
		profiler('end')
		return false
	}

	getCellCoordFromGlobalCoord(x, z) {
		this._tempCellCoord[0] = Math.floor(x/this.gridSize)
		this._tempCellCoord[1] = Math.floor(z/this.gridSize)

		return this._tempCellCoord
	}

	getCellPoints(cellX, cellZ) {
		// this.findCellStopwatch.startTimer()
		for (let {coord, pts} of this._currCells) {
			if (coord[0] === cellX && coord[1] === cellZ) {
				profiler('findCell')
				return pts
			}
		}
		profiler('findCell')
		// this.findCellStopwatch.stopTimer()

		// this.genStopwatch.startTimer()
		const pts = this.generateRandomPointsForCell(cellX, cellZ)
		profiler('generatePts')
		// this.genStopwatch.stopTimer()

		this._currCells.unshift({
			coord: [cellX, cellZ],
			pts,
		})
		console.log("Generating for", cellX, cellZ, "minDist", this.minDist, "length", pts.length)

		if (this._currCells.length > this.maxStoredCells) {
			this._currCells.pop()
		}

		return pts
	}

	generateRandomPointsForCell(cellX, cellZ) {
		const cellRand = gen(`${cellX}|${cellZ}`)

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

		return pts
	}
}

function ptEqual(pt: number[], x: number, z: number) {
	return pt[0] === x && pt[1] === z
}

function ptsEqual(pt1: number[], pt2: number[]) {
	return pt1[0] === pt2[0] && pt1[1] === pt2[1]
}
