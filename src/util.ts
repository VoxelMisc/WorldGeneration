import SimplexNoise from 'simplex-noise'

export function xzId(x, z) {
	return `${x}|${z}`
}

export function getxzFromId(id) {
	return id.split('|')
}

export function xzIdArr(arr) {
	return `${arr[0]}|${arr[1]}`
}

export type TxzId = string

export function xzDistSq(x, z) {
	const a = x[0]-z[0]
	const b = x[1]-z[1]
	return a*a + b*b
}

export function xzDist(x, z) {
	const a = x[0]-z[0]
	const b = x[1]-z[1]
	return Math.sqrt(a*a + b*b)
}

export function xzDistNoArr(pt1, x, z) {
	const a = pt1[0]-x
	const b = pt1[1]-z
	return Math.sqrt(a*a + b*b)
}

export function len2d(vec) {
	return Math.sqrt(vec[0]*vec[0] + vec[1]*vec[1])
}

// taken from https://github.com/pirxpilot/distance-to-line/blob/master/index.js
/**
 *
 *
 * @param pt
 * @param linePt1
 * @param linePt2
 */
export function distToClosestLinePoint(pt, linePt1, linePt2) {
	// var len_2 = p2p_2(linePt1, linePt2);
	// if (len_2 === 0) {
	// 	return linePt1; // u === v so it does not matter which is returned
	// }

	const len_sq = xzDistSq(linePt1, linePt2)

	const t = (
		(pt[0] - linePt1[0]) * (linePt2[0] - linePt1[0]) +
		(pt[1] - linePt1[1]) * (linePt2[1] - linePt1[1])
	) / len_sq;
	// first endpoint is the closest
	// if (t < 0) {
	// 	return linePt1;
	// }
	// last endpoint is the closest
	// if (t > 1) {
	// 	return linePt2;
	// }

	const closestPt = [
		linePt1[0] + t * (linePt2[0] - linePt1[0]),
		linePt1[1] + t * (linePt2[1] - linePt1[1])
	];

	return xzDist(pt, closestPt)
}

export function getPerturbOffsetsInChunk(x, z, perturber, chunkSize, lookOutsideChunkDist) {
	const offsets = []
	// const offsets = {}
	for (let i = x-lookOutsideChunkDist; i < x+chunkSize+lookOutsideChunkDist; ++i) {
		for (let k = z-lookOutsideChunkDist; k < z + chunkSize+lookOutsideChunkDist; ++k) {
			offsets.push([perturber.getOctaves(i, k), perturber.getOctaves(i+430, k-330)])
			// offsets[xzId(i, k)] = [perturber.getOctaves(i, k), perturber.getOctaves(i+430, k-330)]
		}
	}
	return offsets
}

export function getXZPerturbOffsetsFromAll(localI, localK, allOffsets, chunkSize, lookOutsideChunkDist) {
	// const rowSize = chunkSize+2*this.lookOutsideChunkDist
	// const arrX = mod(x+lookOutsideChunkDist, chunkSize)*chunkSize
	// const arrZ = mod(z, chunkSize)
	// console.log(arrX, arrZ)
	// if (arr[arrX+arrZ] === undefined) {
	// 	throw new Error("")
	// }
	// return arr[arrX+arrZ]

	// return allOffsets[xzId(x, z)]

	const rowLen = chunkSize+2*lookOutsideChunkDist
	const arrX = (localI+lookOutsideChunkDist)*rowLen
	const arrZ = localK+lookOutsideChunkDist

	if (arrX < 0 || arrZ < 0 || arrX+arrZ >= allOffsets.length || allOffsets[arrX+arrZ] === undefined) {
		console.error("Error!")
		throw new Error(`${localI} ${localK} ${arrX} ${arrZ}`)
	}

	return allOffsets[arrX+arrZ]
}

// Returns 0, 1 if arr is ~0, 0
export function normalise2d(arr) {
	if (Math.abs(arr[0]) < 0.0001) {
		arr[0] = 0
		arr[1] = 1
	}
	else {
		// Normalise our 2d ravine vector direction
		const magnitude = Math.sqrt(arr[0]*arr[0] + arr[1]*arr[1])
		arr[0] = arr[0]/magnitude
		arr[1] = arr[1]/magnitude
	}
}

export function dotProduct2d(arr1, arr2) {
	return arr1[0]*arr2[0] + arr1[1]*arr2[1]
}

export function mod(n, m) {
	return ((n % m) + m) % m;
}


export interface NoiseHelper {
	getOctaves(x: number, z: number): number
}

export class SimplexOctaveHelper implements NoiseHelper {
	amplitude
	frequency
	numOctaves
	amplitudeMultiplier

	frequencyMultiplier=2

	_simplexes: SimplexNoise[] = []
	seed
	constructor({
        amplitude,
        frequency,
        numOctaves,
        amplitudeMultiplier,
		seed,
        frequencyMultiplier=2,
    }) {
		this.amplitude = amplitude
		this.frequency = frequency
		this.numOctaves = numOctaves
		this.amplitudeMultiplier = amplitudeMultiplier
		this.frequencyMultiplier = frequencyMultiplier

		console.assert(seed !== undefined, "Seed must be defined")

		// this._simplex = new SimplexNoise(seed)

		console.log("Made simplex with seedxxx", seed)
		for (let i = 0; i < numOctaves; i++) {
			this._simplexes.push(new SimplexNoise(`${seed}${i}`))
		}

		this.seed = seed
	}

	getOctaves(x, z) {
	    let amplitude = this.amplitude
	    let frequency = this.frequency
		let result = 0
		for (let i = 0; i < this.numOctaves; i++) {
			result += this._simplexes[i].noise2D(x*frequency, z*frequency)*amplitude

			amplitude *= this.amplitudeMultiplier
			frequency *= this.frequencyMultiplier
		}

		return result
	}
}

export class SimplexCustomOctaveHelper implements NoiseHelper {
	customOctaves

	_simplexes: SimplexNoise[] = []

	constructor(customOctaves: {amplitude: number, frequency: number}[], seed) {
		console.assert(seed !== undefined, "Seed must be defined")

		this.customOctaves = customOctaves

		for (let i = 0; i < customOctaves.length; i++) {
			this._simplexes.push(new SimplexNoise(`${seed}${i}`))
		}
	}

	getOctaves(x, z) {
		let result = 0
		for (let i = 0; i < this.customOctaves.length; i++) {
			const {amplitude, frequency} = this.customOctaves[i]
			// console.log(this._simplexes[i].noise2D(x*frequency, z*frequency))
			result += this._simplexes[i].noise2D(x*frequency, z*frequency)*amplitude
		}

		return result
	}
}
