import ndarray from 'ndarray'
import Rand, {PRNG} from 'rand-seed'

// Requires understanding of Cellular automata - loosely based upon https://dl.acm.org/doi/pdf/10.1145/1814256.1814266
export class CACavesGenerator {
	seed: string
	chunkSize: number

	chunkY = -96

	savedCaves = new Map()

	maxSavedCaves = 30

	left = null
	right = null
	up = null
	down = null

	constructor(seed, chunkSize) {
		this.seed = seed
		this.chunkSize = chunkSize
	}

	// x, y, z are bottom left of chunk
	carveCAIntoChunk(array, x, y, z) {
		if (y !== this.chunkY) {
			return
		}

		const cellX = x/this.chunkSize
		const cellZ = z/this.chunkSize

		const cave = this.getCave(cellX, cellZ)

		for (let y = 0; y < this.chunkSize; y++) {
			for (let x = 0; x < this.chunkSize; x++) {
				for (let z = 0; z < this.chunkSize; z++) {
					if (cave.get(x, y, z) === 0) {
						array.set(x, y, z, 0)
					}
				}
			}
		}
	}

	getCave(cellX, cellZ) {
		const caveId = `${cellX}|${cellZ}`
		if (this.savedCaves.has(caveId)) {
			return this.savedCaves.get(caveId)
		}

		let cave

		const xEven = cellX%2 === 0
		const zEven = cellZ%2 === 0

		const existingLeft = this.left
		const existingRight = this.right
		const existingUp = this.up
		const existingDown = this.down

		if (xEven && zEven) {
			this.left = null
			this.right = null
			this.up = null
			this.down = null

			cave = this.generateCave(cellX, cellZ)
		}
		else if (xEven) {
			this.left = null
			this.right = null
			this.up = this.getCave(cellX, cellZ+1)
			this.down = this.getCave(cellX, cellZ-1)

			cave = this.generateCave(cellX, cellZ)
		}
		else if (zEven) {
			this.left = this.getCave(cellX-1, cellZ)
			this.right = this.getCave(cellX+1, cellZ)
			this.up = null
			this.down = null

			cave = this.generateCave(cellX, cellZ)
		}
		else {
			this.left = this.getCave(cellX-1, cellZ)
			this.right = this.getCave(cellX+1, cellZ)
			this.up = this.getCave(cellX, cellZ+1)
			this.down = this.getCave(cellX, cellZ-1)

			cave = this.generateCave(cellX, cellZ)
		}

		this.left = existingLeft
		this.right = existingRight
		this.up = existingUp
		this.down = existingDown

		this.savedCaves.set(caveId, cave)
		if (this.savedCaves.size > this.maxSavedCaves) {
			// The map is ordered by insertion - delete the first thing we saw
			this.savedCaves.delete(this.savedCaves.keys().next().value)
		}

		return cave
	}

	private generateCave(cellX, cellZ) {
		// console.log("HI")
		// console.log("cell", cellX, cellZ)
		const cs = this.chunkSize
		let read = ndarray(new Uint8Array(cs * cs * cs), [cs, cs, cs])

		// let write = ndarray(new Uint8Array(cs * cs * cs), [cs, cs, cs])
		let write = read

		const caveRand = new Rand(`${cellX}${cellZ}${this.seed}CA`, PRNG.mulberry32);

		// Initialise array to 1s and 0s with 50/50 split
		for (let y = 0; y < this.chunkSize; y++) {
			for (let x = 0; x < this.chunkSize; x++) {
				for (let z = 0; z < this.chunkSize; z++) {
					read.set(x, y, z, caveRand.next() < 0.5)
				}
			}
		}

		// console.log(cellX, cellZ)

		const numIter = 4

		// Do operations all on the same array without swapping (to save memory) - it shouldn't drastically effect outcome
		for (let iter = 0; iter < numIter; iter++) {

			// Do center
			for (let y = 1; y < this.chunkSize-1; y++) {
				const transitionReq = this.getStoneTransitionReq(y)
				for (let x = 1; x < this.chunkSize-1; x++) {
					for (let z = 1; z < this.chunkSize-1; z++) {
			// for (let y = 0; y < this.chunkSize; y++) {
			// 	const transitionReq = this.getStoneTransitionReq(y)
			// 	for (let x = 0; x < this.chunkSize; x++) {
			// 		for (let z = 0; z < this.chunkSize; z++) {
						let surroundingSum = 0

						// Get surrounding cells
						for (let i = x-1; i <= x+1; i++) {
							for (let j = y-1; j <= y+1; j++) {
								for (let k = z-1; k <= z+1; k++) {
									surroundingSum += read.get(i, j, k)
								}
							}
						}

						// this.handleEdgeBlock(read, write, x, y, z, transitionReq)
						// continue

						if (surroundingSum >= transitionReq) {
							write.set(x, y, z, 1)
						}
						else {
							write.set(x, y, z, 0)
						}
					}
				}
			}

			// Do y-top and y-bottom
			const yEdgeTransition = this.getStoneTransitionReq(0)
			for (let x = 0; x < this.chunkSize; x++) {
				for (let z = 0; z < this.chunkSize; z++) {
					this.handleEdgeBlock(read, write, x, 0, z, yEdgeTransition)
					this.handleEdgeBlock(read, write, x, this.chunkSize-1, z, yEdgeTransition)
				}
			}

			for (let y = 0; y < this.chunkSize; y++) {
				const yEdgeTransition = this.getStoneTransitionReq(y)

				// Z edges
				for (let x = 0; x < this.chunkSize; x++) {
					this.handleEdgeBlock(read, write, x, y, 0, yEdgeTransition)
					this.handleEdgeBlock(read, write, x, y, this.chunkSize-1, yEdgeTransition)
				}

				// X edges
				for (let z = 0; z < this.chunkSize; z++) {
					this.handleEdgeBlock(read, write, 0, y, z, yEdgeTransition)
					this.handleEdgeBlock(read, write,this.chunkSize-1, y, z, yEdgeTransition)
				}
			}

			// Swap arrs over
			const temp = read
			read = write
			write = temp
		}

		return write
	}

	private handleEdgeBlock(readArr, writeArr, x, y, z, yTransition) {
		let queriedBlocks = 0
		let surroundingSum = 0
		let edgeBlocks = 0

		const edgeMultiplier = 1
		const radius = 1

		for (let i = x-radius; i <= x+radius; i++) {
			// for (let j = Math.max(0, y-1); j <= Math.min(this.chunkSize-1, y+1); j++) {
			for (let j = y-radius; j <= y+radius; j++) {
				for (let k = z-radius; k <= z+radius; k++) {

					if (i === x && k === z && j === y) {
						// continue
					}

					if (j >= this.chunkSize || j < 0) {
						surroundingSum += 0.5
						continue
					}

					if (i >= this.chunkSize) {
						// Ignore diagonal cell requirements
						if (this.right && k >= 0 && k < this.chunkSize) {
							queriedBlocks++
							surroundingSum += this.right.get(i-this.chunkSize, j, k)*edgeMultiplier
							edgeBlocks++
							continue
						}
						surroundingSum += 0.5
						continue
					}
					if (i < 0) {
						if (this.left && k >= 0 && k < this.chunkSize) {
							queriedBlocks++
							surroundingSum += this.left.get(this.chunkSize+i, j, k)*edgeMultiplier
							edgeBlocks++
							continue
						}
						surroundingSum += 0.5
						continue
					}

					if (k >= this.chunkSize) {
						if (this.up && i >= 0 && i < this.chunkSize) {
							queriedBlocks++
							surroundingSum += this.up.get(i, j, k-this.chunkSize)*edgeMultiplier
							edgeBlocks++
							continue
						}
						surroundingSum += 0.5
						continue
					}
					if (k < 0) {
						if (this.down && i >= 0 && i < this.chunkSize) {
							queriedBlocks++
							surroundingSum += this.down.get(i, j, this.chunkSize+k)*edgeMultiplier
							edgeBlocks++
							continue
						}
						surroundingSum += 0.5
						continue
					}

					queriedBlocks++
					surroundingSum += readArr.get(i, j, k)
				}
			}
		}

		// if (x === 30 && y === 0 && z === 22) {
		// 	console.log(surroundingSum)
		// }

		// const requiredTransition = Math.floor(yTransition * (queriedBlocks/27))
		// console.log(requiredTransition, surroundingSum, queriedBlocks)
		// console.log(queriedBlocks)

		if (surroundingSum >= yTransition) {
		// if (surroundingSum >= requiredTransition) {
			writeArr.set(x, y, z, 1)
		}
		else {
			writeArr.set(x, y, z, 0)
		}
	}

	private getStoneTransitionReq(localY) {
		// return 14
		// return 64
		// return 170

		const standardReq = 15
		// const standardReq = 64

		const edgeReq = 12
		// const edgeReq = 62

		const edgeStart = this.chunkSize/4

		const distFromEdge = Math.min(localY, this.chunkSize-localY-1)

		if (distFromEdge >= edgeStart) {
			return standardReq
		}
		else {
			if (localY === 0) {
				// console.log(Math.floor(standardReq + (edgeReq-standardReq)*((edgeStart - distFromEdge)/edgeStart)))
			}
			if (distFromEdge < edgeStart && this.chunkSize-localY-1 < localY) {
				// console.log(this.chunkSize-localY-1)
			}

			// Lerp between standardreq and edgereq at the very edge
			return Math.floor(standardReq + (edgeReq-standardReq)*((edgeStart - distFromEdge)/edgeStart))
		}
	}
}