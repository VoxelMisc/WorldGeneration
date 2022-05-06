import SimplexNoise from 'simplex-noise'
import {CANNOT_MEET_THRESHOLD} from './constants'
const ndarray = require('ndarray')

export function manhattanXzDist(pt1, x, z) {
	return Math.abs(pt1[0]-x)+Math.abs(pt1[1]-z)
}

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
export function distToLineSegmentWithInfo(pt, linePt1, linePt2): {dist, fracAlong, lineSegmentLength} {
	const len_sq = xzDistSq(linePt1, linePt2)

	const t = (
		(pt[0] - linePt1[0]) * (linePt2[0] - linePt1[0]) +
		(pt[1] - linePt1[1]) * (linePt2[1] - linePt1[1])
	) / len_sq;

	let closestX
	let closestZ
	let fracAlong
	if (t < 0) {
		// first endpoint is the closest
		closestX = linePt1[0];
		closestZ = linePt1[1]
		fracAlong = 0
	}
	else if (t > 1) {
		// last endpoint is the closest
		closestX = linePt2[0];
		closestZ = linePt2[1]
		fracAlong = 1
	}
	else {
		closestX = linePt1[0] + t * (linePt2[0] - linePt1[0])
		closestZ = linePt1[1] + t * (linePt2[1] - linePt1[1])
		fracAlong = t
	}

	return {
		dist: xzDistNoArr(pt, closestX, closestZ),
		fracAlong,
		lineSegmentLength: Math.sqrt(len_sq),
	}
}

// taken from https://github.com/pirxpilot/distance-to-line/blob/master/index.js
/**
 *
 *
 * @param pt
 * @param linePt1
 * @param linePt2
 */
export function distToLineSegment(pt, linePt1, linePt2) {
	const len_sq = xzDistSq(linePt1, linePt2)

	const t = (
		(pt[0] - linePt1[0]) * (linePt2[0] - linePt1[0]) +
		(pt[1] - linePt1[1]) * (linePt2[1] - linePt1[1])
	) / len_sq;

	let closestX
	let closestZ
	if (t < 0) {
		// first endpoint is the closest
		closestX = linePt1[0];
		closestZ = linePt1[1]
	}
	else if (t > 1) {
		// last endpoint is the closest
		closestX = linePt2[0];
		closestZ = linePt2[1]
	}
	else {
		closestX = linePt1[0] + t * (linePt2[0] - linePt1[0])
		closestZ = linePt1[1] + t * (linePt2[1] - linePt1[1])
	}

	return xzDistNoArr(pt, closestX, closestZ)
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

	return xzDistNoArr(pt, linePt1[0] + t * (linePt2[0] - linePt1[0]), linePt1[1] + t * (linePt2[1] - linePt1[1]))
}

export function getPerturbOffsetsInChunk(x, z, perturber, chunkSize, lookOutsideChunkDist) {
	const offsets = []
	// const offsets = {}
	for (let i = x-lookOutsideChunkDist; i < x+chunkSize+lookOutsideChunkDist; ++i) {
		for (let k = z-lookOutsideChunkDist; k < z + chunkSize+lookOutsideChunkDist; ++k) {
			offsets.push([perturber.getOctaves(i, k), perturber.getOctaves(i+430, k-330)])
		}
	}
	return offsets
}

export function getXZPerturbOffsetsFromAll(localI, localK, allOffsets, chunkSize, lookOutsideChunkDist) {
	const rowLen = chunkSize+2*lookOutsideChunkDist
	const arrX = (localI+lookOutsideChunkDist)*rowLen
	const arrZ = localK+lookOutsideChunkDist

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

export function getCustomNoiseAmplitude(customNoise: SimplexCustomOctaveHelper) {
	let totalAmplitude = 0
	for (const {amplitude} of customNoise.customOctaves) {
		totalAmplitude += amplitude
	}
	return totalAmplitude
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
			result += this._simplexes[i].noise2D(x*frequency, z*frequency)*amplitude
		}

		return result
	}
}


// A helper that exits out early from getOctaves if it is impossible for the result of the octaves to lie within a certain threshold
// Improves execution time
export class SimplexThresholdOctaveHelper implements NoiseHelper {
	customOctaves

	_simplexes: SimplexNoise[] = []

	// Contains the amplitude remaining before applying each simplex
	private remainingAmplitudes: number[]

	threshold: {low: number, high: number}

	constructor(customOctaves: {amplitude: number, frequency: number}[], threshold: {low: number, high: number}, seed: string) {
		console.assert(seed !== undefined, "Seed must be defined")

		this.customOctaves = customOctaves
		this.threshold = threshold

		for (let i = 0; i < customOctaves.length; i++) {
			this._simplexes.push(new SimplexNoise(`${seed}${i}`))
		}

		this.remainingAmplitudes = new Array(customOctaves.length)
		let amplitudeSum = 0
		for (let i = this.remainingAmplitudes.length-1; i >= 0; i--) {
			amplitudeSum += this.customOctaves[i].amplitude
			this.remainingAmplitudes[i] = amplitudeSum
		}
	}

	getOctaves(x, z) {
		let result = 0
		for (let i = 0; i < this.customOctaves.length; i++) {
			if (result-this.remainingAmplitudes[i] > this.threshold.high || result+this.remainingAmplitudes[i] < this.threshold.low) {
				return CANNOT_MEET_THRESHOLD
			}

			const {amplitude, frequency} = this.customOctaves[i]
			result += this._simplexes[i].noise2D(x*frequency, z*frequency)*amplitude
		}

		return result
	}
}

// Code taken from https://github.com/michaeldzjap/rand-seed (using Mulberry32).
// Removed function calls to improve perf but core maths remains very similar
// I removed the ability to get multiple seeds which wasn't needed for mul32, improving perf
// This means the seed calculation is slightly different to rand-seed's seeding
export class Random {
	private a: number

	constructor(seed) {
		let h = 2166136261 >>> 0;

		for (let i = 0; i < seed.length; i++) {
			h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
		}

		this.a = h
	}

	public next(): number {
		let t = (this.a += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}
}

export class Int16TwoDArray {
	private array
	private chunkBottomLeft: [number, number]
	private needOutsideChunkDist

	constructor(chunkSize: number, chunkXZBottomLeft: [number, number], needOutsideChunkDist=0) {
		this.chunkBottomLeft = chunkXZBottomLeft
		this.needOutsideChunkDist = needOutsideChunkDist

		const sideLen = chunkSize+needOutsideChunkDist*2
		this.array = ndarray(new Int16Array(sideLen*sideLen), [sideLen, sideLen])
	}

	// Access with global co-ordinates
	set(x: number, z: number, val: number): void {
		this.array.set(x-this.chunkBottomLeft[0]+this.needOutsideChunkDist, z-this.chunkBottomLeft[1]+this.needOutsideChunkDist, val)
	}

	// Access with global co-ordinates
	get(x: number, z: number): number {
		return this.array.get(x-this.chunkBottomLeft[0]+this.needOutsideChunkDist, z-this.chunkBottomLeft[1]+this.needOutsideChunkDist)
	}
}

export class Int16FourDArray {
	private array
	private chunkBottomLeft: [number, number]
	private needOutsideChunkDist

	constructor(chunkSize: number, chunkXZBottomLeft: [number, number], threeDDim: number, fourDDim: number, needOutsideChunkDist=0) {
		this.chunkBottomLeft = chunkXZBottomLeft
		this.needOutsideChunkDist = needOutsideChunkDist

		const sideLen = chunkSize+needOutsideChunkDist*2
		this.array = ndarray(new Int16Array(sideLen*sideLen*threeDDim*fourDDim), [sideLen, sideLen, threeDDim, fourDDim])
	}

	// Access with global co-ordinates
	set(x: number, z: number, thirdDim: number, fourthDim: number, val: number): void {
		this.array.set(x-this.chunkBottomLeft[0]+this.needOutsideChunkDist, z-this.chunkBottomLeft[1]+this.needOutsideChunkDist, thirdDim, fourthDim, val)
	}

	// Access with global co-ordinates
	get(x: number, z: number, thirdDim: number, fourthDim: number): number {
		return this.array.get(x-this.chunkBottomLeft[0]+this.needOutsideChunkDist, z-this.chunkBottomLeft[1]+this.needOutsideChunkDist, thirdDim, fourthDim)
	}

	fill(value) {
		for (let i = 0; i < this.array.shape[0]; i++) {
			for (let j = 0; j < this.array.shape[1]; j++) {
				for (let k = 0; k < this.array.shape[2]; k++) {
					for (let l = 0; l < this.array.shape[3]; l++) {
						this.array.set(i, j, k, l, value)
					}
				}
			}
		}
	}
}

export class ObjectTwoDArray<ValType> {
	private array
	private chunkBottomLeft: [number, number]
	private needOutsideChunkDist

	constructor(chunkSize: number, chunkXZBottomLeft: [number, number], needOutsideChunkDist=0) {
		this.chunkBottomLeft = chunkXZBottomLeft
		this.needOutsideChunkDist = needOutsideChunkDist

		const sideLen = chunkSize+needOutsideChunkDist*2
		const oneDArray = new Array(sideLen*sideLen)

		this.array = ndarray(oneDArray, [sideLen, sideLen])
	}

	// Access with global co-ordinates
	set(x: number, z: number, val: ValType): void {
		this.array.set(x-this.chunkBottomLeft[0]+this.needOutsideChunkDist, z-this.chunkBottomLeft[1]+this.needOutsideChunkDist, val)
	}

	// Access with global co-ordinates
	get(x: number, z: number): ValType {
		return this.array.get(x-this.chunkBottomLeft[0]+this.needOutsideChunkDist, z-this.chunkBottomLeft[1]+this.needOutsideChunkDist)
	}
}