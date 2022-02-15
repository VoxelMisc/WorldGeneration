import { Perlin } from "libnoise-ts/module/generator"
import SimplexNoise from 'simplex-noise'
import { PointsGenerator } from './PointsGenerator'
import {makeProfileHook} from './profileHook'

const profileGetChunk = false
const profiler = profileGetChunk ? makeProfileHook(50, 'getChunk') : () => {}

class WorldGenerator {
	constructor(chunkSize, blockMetadata) {
		this.chunkSize = chunkSize
		this.blockMetadata = blockMetadata

		this.simplex = new SimplexNoise('seed')

		this.initialAmplitude = 50
		this.offsettedHeight = -this.initialAmplitude
		this.initialFrequency = 1/300

		this.numOctaves = 5

		this.ptGen = new PointsGenerator(20)
	}

	// x, y, z are the co-ordinates of the bottom left block in the chunk
	getChunk(array, x, y, z) {
		profiler('start')
		console.time("getChunk")
	    for (let i = 0; i < array.shape[0]; ++i) {
	        for (let k = 0; k < array.shape[2]; ++k) {
		        const heightMapVal = this._getHeightmapVal(x + i, z + k)
	            for (let j = 0; j < array.shape[1]; ++j) {

					if (this.ptGen.isPoint(x+i, z+k)) {
						// console.log(x+i, y+j, z+k, "IS POINT\n\n")
						array.set(i, j, k, this.blockMetadata["Grass Block"].id)
					}
					else {
						array.set(i, j, k, 0)
					}
		            // continue

		            // let blockId = this._getBlock(x + i, y + j, z + k, heightMapVal)
		            // array.set(i, j, k, blockId)
	            }
	        }
	    }
		console.timeEnd("getChunk")
		profiler('getChunk')
		profiler('end')
	}

	_getBlock(x, y, z, heightMapVal) {
		if (y < heightMapVal) {
			return this.blockMetadata["Grass Block"].id
		}
		return 0
	}

	//
	// _getHeightmapVal(x, z) {
	//
	//
	// 	const offset = this.simplex.noise2D(x*this.initialFrequency, z*this.initialFrequency)*this.initialAmplitude
	//
	// 	return this.offsettedHeight+Math.floor(offset)
	// }

	_getHeightmapVal(x, z) {
		let amplitude = this.initialAmplitude
		let frequency = this.initialFrequency
		let result = 0
		for (let i = 0; i < this.numOctaves; i++) {
			result += this.simplex.noise2D(x*frequency, z*frequency)*amplitude

			amplitude *= 0.5
			frequency *= 2
		}

		return this.offsettedHeight+Math.floor(result)

	}
}

export default { PointsGenerator, WorldGenerator }
