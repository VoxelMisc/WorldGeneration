import SimplexNoise from 'simplex-noise'

export function xzId(x, z) {
	return `${x}|${z}`
}

export function xzIdArr(arr) {
	return `${arr[0]}|${arr[1]}`
}

export type TxzId = string

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

export function sortDistFromPointAscendingFunction(sourcePoint, point1, point2) {
	const distA = xzDist(sourcePoint, point1)
	const distB = xzDist(sourcePoint, point2)
	return distA-distB
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
			result += this._simplexes[i].noise2D(x*frequency, z*frequency)*amplitude
		}

		return result
	}
}
