import {PointsGenerator} from './PointsGenerator'
import {Random} from './util'

// Generates points
export class ChunkBasedPointGenerator {
	chunkSize: number
	pointsGenerator: PointsGenerator

	_tempChunkCoord = [0, 0]

	maxRadiusChunk: number

	seed: string

	/**
	 *
	 * @param chunkSize
	 * @param pointsGenerator
	 * 	should generate points where the point co-ordinates represent the CHUNK co-ordinates
	 * e.g. 0, 0 is one chunk, 0, 1 is the chunk above that
	 * @param maxFeatureWidth Should be the max width of the feature in block width.
	 * @param seed
	 */
	constructor(chunkSize: number, pointsGenerator: PointsGenerator, maxFeatureWidth: number, seed: string) {
		this.chunkSize = chunkSize
		this.pointsGenerator = pointsGenerator

		this.maxRadiusChunk = Math.floor((maxFeatureWidth*0.5)/this.chunkSize)+1

		this.seed = seed
	}

	private getChunkCoordFromGlobalCoord(x, z) {
		this._tempChunkCoord[0] = Math.floor(x/this.chunkSize)
		this._tempChunkCoord[1] = Math.floor(z/this.chunkSize)

		return this._tempChunkCoord
	}

	/**
	 * Will search for features in chunks within maxFeatureWidth/2 range
	 *
	 * x and z should be the coords of the bottom left block in the chunk
	 *
	 * @param x
	 * @param z
	 *
	 * @return
	 */
	getSurroundingFeatures(x: number, z: number): [blockX: number, blockZ: number][] {
		const chunkCoord = this.getChunkCoordFromGlobalCoord(x, z);
		const points = []
		for (let i = chunkCoord[0]-this.maxRadiusChunk; i <= chunkCoord[0]+this.maxRadiusChunk; i++) {
			for (let k = chunkCoord[1]-this.maxRadiusChunk; k <= chunkCoord[1]+this.maxRadiusChunk; k++) {
				if (this.pointsGenerator.isPoint(i, k)) {
					points.push(this._getRandomPointInChunk(i, k))
				}
			}
		}

		return points
	}

	_getRandomPointInChunk(chunkX, chunkZ) {
		const botLeftX = chunkX*this.chunkSize
		const botLeftZ = chunkZ*this.chunkSize

		const rand = new Random(`${chunkX}|${chunkZ}|${this.seed}`);
		const xOffset = Math.floor(rand.next()*this.chunkSize)
		const zOffset = Math.floor(rand.next()*this.chunkSize)

		return [botLeftX+xOffset, botLeftZ+zOffset]
	}
}