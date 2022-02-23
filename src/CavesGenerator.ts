import {SimplexCustomOctaveHelper, xzId} from './util'

export class CavesGenerator {
	caves: {count: number,
		thresholdNoiseSetup,
		thresholdPerturbSetup,
		heightNoiseSetup,
		heightPerturbSetup,
		threshold,
		height,
		heightPercentCap,
		thresholdNoises,
		thresholdPerturbNoises,
		heightNoises,
		heightPerturbNoises,
		caveOffset,
		caveTop
	}[]

	chunkSize: number

	constructor(seed, chunkSize) {
		this.chunkSize = chunkSize

		this.caves = [
			{
				count: 2,
				thresholdNoiseSetup: [
					{amplitude: 1, frequency: 1/300},
					{amplitude: 0.5, frequency: 1/150},
				],
				thresholdPerturbSetup: [
					{ amplitude: 1, frequency: 1/5, },
					{ amplitude: 5, frequency: 1/70, },
				],
				heightNoiseSetup: [
					{amplitude: 150, frequency: 1/2000},
					{amplitude: 100, frequency: 1/1500},
					{amplitude: 50, frequency: 1/700},
					{amplitude: 25, frequency: 1/400},
				],
				heightPerturbSetup: [
					{ amplitude: 1, frequency: 1/4, },
					{ amplitude: 5, frequency: 1/10, },
				],
				caveOffset: null, // Set below
				threshold: {low: -0.09, high: 0.09},
				height: 9,
				heightPercentCap: 0.5,
				thresholdNoises: [],
				thresholdPerturbNoises: [],
				heightNoises: [],
				heightPerturbNoises: [],
				caveTop: 300,
			},
			{
				count: 1,
				thresholdNoiseSetup: [
					{amplitude: 1, frequency: 1/300},
					{amplitude: 0.5, frequency: 1/150},
				],
				thresholdPerturbSetup: [
					{ amplitude: 1, frequency: 1/5, },
					{ amplitude: 5, frequency: 1/70, },
				],
				heightNoiseSetup: [
					{amplitude: 100, frequency: 1/1200},
					{amplitude: 50, frequency: 1/800},
					{amplitude: 25, frequency: 1/300},
					{amplitude: 12, frequency: 1/150},
				],
				heightPerturbSetup: [
					{ amplitude: 1, frequency: 1/4, },
					{ amplitude: 5, frequency: 1/10, },
				],
				caveOffset: null, // Set below
				threshold: {low: -0.07, high: 0.07},
				height: 6,
				heightPercentCap: 0.5,
				thresholdNoises: [],
				thresholdPerturbNoises: [],
				heightNoises: [],
				heightPerturbNoises: [],
				caveTop: 160,
			},
		]

		for (const caveType of this.caves) {
			let amplitudeSum = 0
			for (const {amplitude} of caveType.heightNoiseSetup) {
				amplitudeSum += amplitude
			}

			caveType.caveOffset = caveType.caveTop-amplitudeSum
		}

		for (let caveTypeI = 0; caveTypeI < this.caves.length; caveTypeI++) {
			const caveType = this.caves[caveTypeI]
			for (let caveI = 0; caveI < caveType.count; caveI++) {
				caveType.thresholdNoises.push(new SimplexCustomOctaveHelper(caveType.thresholdNoiseSetup, `${seed}Cave${caveTypeI}${caveI}`))
				caveType.thresholdPerturbNoises.push(new SimplexCustomOctaveHelper(caveType.thresholdPerturbSetup, `${seed}CaveThresholdPerturb${caveTypeI}${caveI}`))
				caveType.heightNoises.push(new SimplexCustomOctaveHelper(caveType.heightNoiseSetup, `${seed}CaveHeightNoise${caveTypeI}${caveI}`))
				caveType.heightPerturbNoises.push(new SimplexCustomOctaveHelper(caveType.heightPerturbSetup, `${seed}CaveHeightPerturb${caveTypeI}${caveI}`))
			}
		}
	}

	// x and z are bottom left corner blocks in chunk
	getCaveInfoForChunk(x, z) {
		const caveInfos = {}
		for (let i = x; i < x+this.chunkSize; ++i) {
			for (let k = z; k < z+this.chunkSize; ++k) {
				const caveInfoList = []
				caveInfos[xzId(i, k)] = caveInfoList

				for (const caveType of this.caves) {
					for (let caveI = 0; caveI < caveType.count; caveI++) {
						let perturbX = caveType.thresholdPerturbNoises[caveI].getOctaves(i, k)
						let perturbZ = caveType.thresholdPerturbNoises[caveI].getOctaves(i+390, k-270)

						let noiseVal = caveType.thresholdNoises[caveI].getOctaves(i+perturbX, k+perturbZ)
						// let noiseVal = caveType.thresholdNoises[caveI].getOctaves(i, k)
						const isCave = noiseVal > caveType.threshold.low && noiseVal < caveType.threshold.high

						if (!isCave) {
							continue
						}

						const caveNoiseWidth = caveType.threshold.high - caveType.threshold.low
						const thresholdMidpoint = caveType.threshold.low+(caveNoiseWidth/2)

						// When at edge of cave, this is 0, at center this is 1 (or heightPercentCap including the min)
						const fractionDistFromMidpoint = Math.min(caveType.heightPercentCap
							, (1-Math.abs(noiseVal-thresholdMidpoint)/(caveNoiseWidth/2)))

						const caveHeight = caveType.height * fractionDistFromMidpoint

						let heightPerturbX = caveType.heightPerturbNoises[caveI].getOctaves(i, k)
						let heightPerturbZ = caveType.heightPerturbNoises[caveI].getOctaves(i+980, k-370)

						const caveYFromNoise = caveType.heightNoises[caveI].getOctaves(i+heightPerturbX, k+heightPerturbZ)
						// const caveYFromNoise = caveType.heightNoises[caveI].getOctaves(i, k)

						caveInfoList.push({
							low: caveYFromNoise-caveHeight + caveType.caveOffset,
							high: caveYFromNoise+caveHeight + caveType.caveOffset,
						})
					}
				}
			}
		}

		return caveInfos
	}
}