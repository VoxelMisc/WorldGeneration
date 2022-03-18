import {VariableDensitySettings} from './PointsGenerator'
import Rand, {PRNG} from 'rand-seed'
import PoissonDiskSampling from 'poisson-disk-sampling'
import { VariableDensityPDS } from './QuadtreeVariableDensityPoissonDisk'
import {QuadTree, Shape} from 'fast-quadtree-ts'
// const QuadTree = require("holy-quad-tree");

export class FancyPoissonDiscGenerator {
	variableDensitySettings: VariableDensitySettings
	gridSize: number
	seed: string

	constructor(
        seed: string,
		gridSize: number,
        variableDensitySettings: VariableDensitySettings,
    ) {
		this.seed = seed
		this.gridSize = gridSize
		this.variableDensitySettings = variableDensitySettings
	}

	generateUnrestrictedCell(cellX, cellZ) {
		const rand = new Rand(`${cellX}${cellZ}${this.seed}pts`, PRNG.mulberry32);
		const randFunc = () => {
			return rand.next()
		}
		const startX = cellX*this.gridSize
		const startZ = cellZ*this.gridSize

		const minDistance = this.variableDensitySettings.min
		const maxDistance = this.variableDensitySettings.max
		const distDiff = maxDistance-minDistance

		const realDistFunc = this.variableDensitySettings.func

		// Need a number between 0-1 where 0 is minDist and 1 is maxDist
		const distFunc = (pt) => {
			const realDist = realDistFunc([pt[0]+startX, pt[1]+startZ])
			return (realDist-minDistance)/distDiff
		}
		const diskGenerator = new PoissonDiskSampling({
			shape: [this.gridSize, this.gridSize],
			minDistance: minDistance,
			maxDistance: maxDistance,
			tries: 40,
			distanceFunction: distFunc
		}, randFunc)

		const genPts = diskGenerator.fill();
		const pts = genPts.map((pt) => {
			return [Math.floor(startX+pt[0]), Math.floor(startZ+pt[1])]
		})

		console.log("Complete 1")

		return pts
	}

	generateRestrictedCell(cellX, cellZ, cantBeInRangeOf) {
		const startX = cellX*this.gridSize
		const startZ = cellZ*this.gridSize

		// const qt = new QuadTree.QuadTree(
		// 	new QuadTree.Bound(this.gridSize*3, this.gridSize*3), // Width, height
		// 	10, // Max objects before splitting
		// 	100 // Max depth
		// );

		const qt = new QuadTree({
			center: {x: this.gridSize*1.5, y: this.gridSize*1.5},
			size: {x: this.gridSize*3, y: this.gridSize*3},
		})

		const quadtreeOffsetX = startX-this.gridSize
		const quadtreeOffsetZ = startZ-this.gridSize
		console.log(cantBeInRangeOf)
		for (const cell of cantBeInRangeOf) {
			for (const pt of cell) {
				// const node = new QuadTree.Node(pt[0]-quadtreeOffsetX, pt[1]-quadtreeOffsetZ, 1, 1)
				// console.log("Adding", node)
				// qt.insert(node)

				qt.add({x: pt[0]-quadtreeOffsetX, y: pt[1]-quadtreeOffsetZ}, null)
			}
		}

		const rand = new Rand(`${cellX}${cellZ}${this.seed}pts`, PRNG.mulberry32);
		const randFunc = () => {
			return rand.next()
		}

		const minDistance = this.variableDensitySettings.min
		const maxDistance = this.variableDensitySettings.max
		const distDiff = maxDistance-minDistance

		const realDistFunc = this.variableDensitySettings.func

		// Need a number between 0-1 where 0 is minDist and 1 is maxDist
		const distFunc = (pt) => {
			const realDist = realDistFunc([pt[0]+startX, pt[1]+startZ])
			return (realDist-minDistance)/distDiff
		}
		// console.log("Running", this.gridSize)
		// console.log(qt)
		const canUseFunc = (pt) => {
			const allowedDist = realDistFunc([pt[0]+startX, pt[1]+startZ])
			// const checkNode = new QuadTree.Node(
			// 	pt[0]+this.gridSize,
			// 	pt[1]+this.gridSize,
			// 	allowedDist*2,
			// 	allowedDist*2,
			// )
			// const withinSquareDist = qt.retrieve(checkNode)

			const res = qt.queryArray(
				// Shape.createEllipse(
				// 	{ x: pt[0] + this.gridSize, y: pt[1] + this.gridSize },
				// 	1
				// )
				// Shape.createEllipse(
				// 	{ x: 10000, y: 10000 },
				// 	1
				// )
				Shape.createEllipse(
					{x: pt[0] + this.gridSize, y: pt[1] + this.gridSize}, // center
					allowedDist, // size
				),
			)

			// for (const {vec, unit} of qt.queryArray(Shape.createRectangle(
			// 	{x: 200, y: 40}, // center
			// 	{x: 1, y: 1}, // size
			// ))) {
			// 	console.log(vec, `is near by WallE`);
			// }

			// console.log(Shape.createEllipse(
			// 	{ x: pt[0] + this.gridSize, y: pt[1] + this.gridSize },
			// 	1
			// ))
			for (const {vec} of res) {
				// console.log(vec, { x: pt[0] + this.gridSize, y: pt[1] + this.gridSize }, allowedDist)
				return false
			}

			return true

			// console.log(pt[0]+this.gridSize, pt[1]+this.gridSize, allowedDist*2)
			// console.log(pt[0]+startX, pt[1]+startZ, allowedDist, checkNode, withinSquareDist)
			//
			// if (withinSquareDist.length === 0) {
			// 	console.log("WE DID IT")

			// return true
			// return withinSquareDist.length === 0
		}
		const diskGenerator = new VariableDensityPDS({
			shape: [this.gridSize, this.gridSize],
			minDistance: minDistance,
			maxDistance: maxDistance,
			tries: 40,
			distanceFunction: distFunc
		}, randFunc, canUseFunc)

		const genPts = diskGenerator.fill();
		const pts = genPts.map((pt) => {
			return [Math.floor(startX+pt[0]), Math.floor(startZ+pt[1])]
		})

		console.log("Complete 2")
		return pts
	}
}
