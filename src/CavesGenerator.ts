import {
	distToClosestLinePoint,
	dotProduct2d,
	getPerturbOffsetsInChunk,
	getXZPerturbOffsetsFromAll, len2d,
	normalise2d,
	SimplexCustomOctaveHelper, xzDistNoArr,
	xzId,
} from './util'
import {ChunkBasedPointGenerator} from './ChunkBasedPointGenerator'
import {PointsGenerator} from './PointsGenerator'
import Rand, {PRNG} from 'rand-seed'
import {dist, mag} from '@thi.ng/vectors'

export class CavesGenerator {
	spaghettCaves: {count: number,
		thresholdNoiseSetup,
		thresholdPerturbSetup,
		heightNoiseSetup,
		heightPerturbSetup,
		cutoffNoiseSetup,
		threshold,
		height,
		heightPercentCap,
		thresholdNoises,
		thresholdPerturbNoises,
		heightNoises,
		heightPerturbNoises,
		cutoffNoises,
		caveOffset,
		caveBot
	}[]

	chunkSize: number

	pitCaves = {
		count: 1,
		// count: 0,
		maxWidth: 40,
		minWidth: 15,
		distApartInChunks: 4,
		distPerturbNoiseSetup: [
			{ amplitude: 1, frequency: 1/8, },
			{ amplitude: 3, frequency: 1/20, },
			{ amplitude: 10, frequency: 1/100, },
			{ amplitude: 30, frequency: 1/500, },
			// { amplitude: 50, frequency: 1/1500, },
		],
		yPerturbNoiseSetup: [
			{ amplitude: 1, frequency: 1/10, },
			{ amplitude: 3, frequency: 1/50, },
		],
		heightPerturbNoiseSetup: [
			{ amplitude: 3, frequency: 1/10, },
			{ amplitude: 10, frequency: 1/50, },
		],
		edgesTargetMidpointNoiseSetup: [
			{ amplitude: 1, frequency: 1/3, },
			{ amplitude: 2, frequency: 1/7, },
			{ amplitude: 2, frequency: 1/15, },
		],
		minHeight: 25,
		maxHeight: 55,
		minBottomPit: -90,
		maxBottomPit: -25,
		// minBottomPit: -10,
		// maxBottomPit: -10,

		generators: [],
		distPerturbNoises: [],
		yPerturbNoises: [],
		heightPerturbNoises: [],
		edgesTargetMidpointNoise: [],
	}

	ravineCaves = {
		count: 1,
		// count: 1,
		maxWidth: 15,
		minWidth: 10,
		maxLength: 90,
		minLength: 50,
		distApartInChunks: 4,
		distPerturbNoiseSetup: [
			{ amplitude: 1, frequency: 1/8, },
			{ amplitude: 3, frequency: 1/20, },
			{ amplitude: 10, frequency: 1/100, },
			{ amplitude: 30, frequency: 1/500, },
			// { amplitude: 50, frequency: 1/1500, },
		],
		yPerturbNoiseSetup: [
			{ amplitude: 1, frequency: 1/10, },
			{ amplitude: 3, frequency: 1/50, },
		],
		// heightPerturbNoiseSetup: [
		// 	{ amplitude: 3, frequency: 1/10, },
		// 	{ amplitude: 10, frequency: 1/50, },
		// ],
		// edgesTargetMidpointNoiseSetup: [
		// 	{ amplitude: 1, frequency: 1/3, },
		// 	{ amplitude: 2, frequency: 1/7, },
		// 	{ amplitude: 2, frequency: 1/15, },
		// ],
		minHeight: 25,
		maxHeight: 55,
		maxBottomRavine: -90,
		minBottomRavine: -5,

		generators: [],
		distPerturbNoises: [],
		yPerturbNoises: [],
		// heightPerturbNoises: [],
		edgesTargetMidpointNoise: [],
	}

	sphereCaves = {
		// count: 0,
		count: 1,
		maxRadius: 6,
		minRadius: 20,
		distApartInChunks: 3,
		distPerturbNoiseSetup: [
			{ amplitude: 1, frequency: 1/8, },
			{ amplitude: 3, frequency: 1/20, },
			// { amplitude: 10, frequency: 1/100, },
			// { amplitude: 30, frequency: 1/500, },
			// { amplitude: 50, frequency: 1/1500, },
		],
		// yPerturbNoiseSetup: [
		// 	{ amplitude: 1, frequency: 1/10, },
		// 	{ amplitude: 3, frequency: 1/50, },
		// ],
		// heightPerturbNoiseSetup: [
		// 	{ amplitude: 3, frequency: 1/10, },
		// 	{ amplitude: 10, frequency: 1/50, },
		// ],
		// edgesTargetMidpointNoiseSetup: [
		// 	{ amplitude: 1, frequency: 1/3, },
		// 	{ amplitude: 2, frequency: 1/7, },
		// 	{ amplitude: 2, frequency: 1/15, },
		// ],
		// minCentreSphere: -10,
		minCentreSphere: -60,
		maxCentreSphere: 10,

		generators: [],
		distPerturbNoises: [],
		// yPerturbNoises: [],
		// heightPerturbNoises: [],
		// edgesTargetMidpointNoise: [],
	}

	seed: string
	lookOutsideChunkDist: number

	constructor(seed, chunkSize, lookOutsideChunkDist) {
		this.chunkSize = chunkSize
		this.seed = seed
		this.lookOutsideChunkDist = lookOutsideChunkDist

		this.spaghettCaves = [
			{
				count: 4,
				thresholdNoiseSetup: [
					{amplitude: 1.5, frequency: 1/300},
					{amplitude: 0.5, frequency: 1/150},
				],
				thresholdPerturbSetup: [
					{ amplitude: 1, frequency: 1/5, },
					{ amplitude: 5, frequency: 1/70, },
				],
				heightNoiseSetup: [
					{amplitude: 25, frequency: 1/200},
					{amplitude: 12, frequency: 1/150},
				],
				heightPerturbSetup: [
					{ amplitude: 1, frequency: 1/4, },
					{ amplitude: 5, frequency: 1/10, },
				],
				cutoffNoiseSetup: [
					{amplitude: 1, frequency: 1/250},
					{ amplitude: 0.1, frequency: 1/70, },
					{ amplitude: 0.01, frequency: 1/5, },
				],
				caveOffset: null, // Set below
				threshold: {low: -0.09, high: 0.09},
				height: 9,
				heightPercentCap: 0.5,
				thresholdNoises: [],
				thresholdPerturbNoises: [],
				heightNoises: [],
				heightPerturbNoises: [],
				cutoffNoises: [],
				caveBot: -30,
			},



			// to delete
			// {
			// 	count: 1,
			// 	thresholdNoiseSetup: [
			// 		{amplitude: 1, frequency: 1/300},
			// 		{amplitude: 0.3, frequency: 1/150},
			// 	],
			// 	thresholdPerturbSetup: [
			// 		{ amplitude: 1, frequency: 1/5, },
			// 		{ amplitude: 5, frequency: 1/70, },
			// 	],
			// 	heightNoiseSetup: [
			// 		{amplitude: 150, frequency: 1/2000},
			// 		{amplitude: 100, frequency: 1/1500},
			// 		{amplitude: 50, frequency: 1/700},
			// 		{amplitude: 25, frequency: 1/400},
			// 	],
			// 	heightPerturbSetup: [
			// 		{ amplitude: 1, frequency: 1/4, },
			// 		{ amplitude: 5, frequency: 1/10, },
			// 	],
			// 	cutoffNoiseSetup: [
			// 		{amplitude: 1, frequency: 1/1000},
			// 		{ amplitude: 0.1, frequency: 1/70, },
			// 		{ amplitude: 0.01, frequency: 1/5, },
			// 	],
			// 	caveOffset: null, // Set below
			// 	threshold: {low: -0.09, high: 0.09},
			// 	height: 9,
			// 	heightPercentCap: 0.5,
			// 	thresholdNoises: [],
			// 	thresholdPerturbNoises: [],
			// 	heightNoises: [],
			// 	heightPerturbNoises: [],
			// 	cutoffNoises: [],
			// 	caveBot: 300,
			// },
			// {
			// 	count: 1,
			// 	thresholdNoiseSetup: [
			// 		{amplitude: 1, frequency: 1/300},
			// 		{amplitude: 0.3, frequency: 1/150},
			// 	],
			// 	thresholdPerturbSetup: [
			// 		{ amplitude: 1, frequency: 1/5, },
			// 		{ amplitude: 5, frequency: 1/70, },
			// 	],
			// 	heightNoiseSetup: [
			// 		{amplitude: 100, frequency: 1/1200},
			// 		{amplitude: 50, frequency: 1/800},
			// 		{amplitude: 25, frequency: 1/300},
			// 		{amplitude: 12, frequency: 1/150},
			// 	],
			// 	heightPerturbSetup: [
			// 		{ amplitude: 1, frequency: 1/4, },
			// 		{ amplitude: 5, frequency: 1/10, },
			// 	],
			// 	cutoffNoiseSetup: [{}],
			// 	caveOffset: null, // Set below
			// 	threshold: {low: -0.07, high: 0.07},
			// 	height: 6,
			// 	heightPercentCap: 0.5,
			// 	thresholdNoises: [],
			// 	thresholdPerturbNoises: [],
			// 	heightNoises: [],
			// 	heightPerturbNoises: [],
			// 	cutoffNoises: [],
			// 	caveTop: 160,
			// },
		]




		for (const caveType of this.spaghettCaves) {
			let amplitudeSum = 0
			for (const {amplitude} of caveType.heightNoiseSetup) {
				amplitudeSum += amplitude
			}

			// console.log("Amplitude sum", amplitudeSum)

			// caveType.caveOffset = caveType.caveBot-amplitudeSum
			// caveType.caveOffset = -amplitudeSum + (caveType.caveBot - amplitudeSum)
			caveType.caveOffset = caveType.caveBot + amplitudeSum
		}

		for (let caveTypeI = 0; caveTypeI < this.spaghettCaves.length; caveTypeI++) {
			const caveType = this.spaghettCaves[caveTypeI]
			for (let caveI = 0; caveI < caveType.count; caveI++) {
				caveType.thresholdNoises.push(new SimplexCustomOctaveHelper(caveType.thresholdNoiseSetup, `${seed}Cave${caveTypeI}${caveI}`))
				caveType.thresholdPerturbNoises.push(new SimplexCustomOctaveHelper(caveType.thresholdPerturbSetup, `${seed}CaveThresholdPerturb${caveTypeI}${caveI}`))
				caveType.heightNoises.push(new SimplexCustomOctaveHelper(caveType.heightNoiseSetup, `${seed}CaveHeightNoise${caveTypeI}${caveI}`))
				caveType.heightPerturbNoises.push(new SimplexCustomOctaveHelper(caveType.heightPerturbSetup, `${seed}CaveHeightPerturb${caveTypeI}${caveI}`))

				caveType.cutoffNoises.push(new SimplexCustomOctaveHelper(caveType.cutoffNoiseSetup, `${seed}CaveCutoff${caveTypeI}${caveI}`))
			}
		}

		for (let pitI = 0; pitI < this.pitCaves.count; pitI++) {
			this.pitCaves.distPerturbNoises.push(new SimplexCustomOctaveHelper(this.pitCaves.distPerturbNoiseSetup, `${seed}DistPitPerturb${pitI}`))
			let totalPerturbAmplitude = 0
			for (const {amplitude} of this.pitCaves.distPerturbNoiseSetup) {
				totalPerturbAmplitude += amplitude
			}

			this.pitCaves.yPerturbNoises.push(new SimplexCustomOctaveHelper(this.pitCaves.yPerturbNoiseSetup, `${seed}yPitPerturb${pitI}`))
			this.pitCaves.heightPerturbNoises.push(new SimplexCustomOctaveHelper(this.pitCaves.heightPerturbNoiseSetup, `${seed}heightPitPerturb${pitI}`))
			this.pitCaves.edgesTargetMidpointNoise.push(new SimplexCustomOctaveHelper(this.pitCaves.edgesTargetMidpointNoiseSetup, `${seed}edgesPitPerturb${pitI}`))

			const pitPtsGen = new PointsGenerator(
				this.pitCaves.distApartInChunks,
				true,
				false,
				`${seed}PitGen${pitI}`,
				100
			)
			const chunkBasedGen = new ChunkBasedPointGenerator(chunkSize, pitPtsGen, this.pitCaves.maxWidth+2*totalPerturbAmplitude, `${seed}PitGen${pitI}`)
			this.pitCaves.generators.push(chunkBasedGen)
		}

		for (let ravineI = 0; ravineI < this.ravineCaves.count; ravineI++) {
			this.ravineCaves.distPerturbNoises.push(new SimplexCustomOctaveHelper(this.ravineCaves.distPerturbNoiseSetup, `${seed}DistRavPerturb${ravineI}`))
			let totalPerturbAmplitude = 0
			for (const {amplitude} of this.ravineCaves.distPerturbNoiseSetup) {
				totalPerturbAmplitude += amplitude
			}

			this.ravineCaves.yPerturbNoises.push(new SimplexCustomOctaveHelper(this.ravineCaves.yPerturbNoiseSetup, `${seed}yRavinePerturb${ravineI}`))
			// this.ravineCaves.heightPerturbNoises.push(new SimplexCustomOctaveHelper(this.ravineCaves.heightPerturbNoiseSetup, `${seed}heightRavinePerturb${ravineI}`))
			// this.ravineCaves.edgesTargetMidpointNoise.push(new SimplexCustomOctaveHelper(this.ravineCaves.edgesTargetMidpointNoiseSetup, `${seed}edgesRavinePerturb${ravineI}`))

			const ravinePtsGen = new PointsGenerator(
				this.ravineCaves.distApartInChunks,
				true,
				false,
				`${seed}RavineGen${ravineI}`,
				100
			)
			const chunkBasedGen = new ChunkBasedPointGenerator(chunkSize, ravinePtsGen, this.ravineCaves.maxLength+this.ravineCaves.maxWidth+2*totalPerturbAmplitude, `${seed}RavineGen${ravineI}`)
			this.ravineCaves.generators.push(chunkBasedGen)
		}

		for (let sphereI = 0; sphereI < this.sphereCaves.count; sphereI++) {
			this.sphereCaves.distPerturbNoises.push(new SimplexCustomOctaveHelper(this.sphereCaves.distPerturbNoiseSetup, `${seed}DistSpherePerturb${sphereI}`))
			let totalPerturbAmplitude = 0
			for (const {amplitude} of this.sphereCaves.distPerturbNoiseSetup) {
				totalPerturbAmplitude += amplitude
			}

			const spherePtsGen = new PointsGenerator(
				this.sphereCaves.distApartInChunks,
				true,
				false,
				`${seed}SphereGen${sphereI}`,
				100
			)
			const chunkBasedGen = new ChunkBasedPointGenerator(chunkSize, spherePtsGen, 2*this.sphereCaves.maxRadius+2*totalPerturbAmplitude, `${seed}SphereGen${sphereI}`)
			this.sphereCaves.generators.push(chunkBasedGen)
		}
	}

	// x and z are bottom left corner blocks in chunk
	getCaveInfoForChunk(x, z) {
		const caveInfos = {}
		for (let i = x-this.lookOutsideChunkDist; i < x+this.chunkSize+this.lookOutsideChunkDist; ++i) {
			for (let k = z-this.lookOutsideChunkDist; k < z+this.chunkSize+this.lookOutsideChunkDist; ++k) {
				const caveInfoList = []
				caveInfos[xzId(i, k)] = caveInfoList

				this._addSpaghettCavesForColumn(i, k, caveInfoList)
			}
		}

		this._addPitCaves(x, z, caveInfos)
		this._addSphereCaves(x, z, caveInfos)
		this._addRavineCaves(x, z, caveInfos)

		return caveInfos
	}

	/**
	 * @param x block x of column
	 * @param z block z of column
	 * @param caveInfoList
	 */
	_addSpaghettCavesForColumn(x, z, caveInfoList) {
		for (const caveType of this.spaghettCaves) {
			for (let caveI = 0; caveI < caveType.count; caveI++) {
				let perturbX = caveType.thresholdPerturbNoises[caveI].getOctaves(x, z)
				let perturbZ = caveType.thresholdPerturbNoises[caveI].getOctaves(x+390, z-270)

				let noiseVal = caveType.thresholdNoises[caveI].getOctaves(x+perturbX, z+perturbZ)
				// let noiseVal = caveType.thresholdNoises[caveI].getOctaves(x, z)
				const isCave = noiseVal > caveType.threshold.low && noiseVal < caveType.threshold.high

				if (!isCave) {
					continue
				}

				let cutoffVal = caveType.cutoffNoises[caveI].getOctaves(x, z)
				const fullCutoffAt = 0.08
				if (cutoffVal >= fullCutoffAt) {
					// console.log("cutoff", x, z)
					continue
				}


				const caveNoiseWidth = caveType.threshold.high - caveType.threshold.low
				const thresholdMidpoint = caveType.threshold.low+(caveNoiseWidth/2)

				// When at edge of cave, this is 0, at center this is 1 (or heightPercentCap including the min)
				const fractionDistFromMidpoint = Math.min(caveType.heightPercentCap
					, (1-Math.abs(noiseVal-thresholdMidpoint)/(caveNoiseWidth/2)))

				let caveHeight = caveType.height * fractionDistFromMidpoint

				if (cutoffVal > 0) {
					// Gonna be cut off soon, smooth down the end of the cave by reducing height
					caveHeight *= (fullCutoffAt-cutoffVal)/fullCutoffAt
				}

				let heightPerturbX = caveType.heightPerturbNoises[caveI].getOctaves(x, z)
				let heightPerturbZ = caveType.heightPerturbNoises[caveI].getOctaves(x+980, z-370)

				const caveYFromNoise = caveType.heightNoises[caveI].getOctaves(x+heightPerturbX, z+heightPerturbZ)
				// const caveYFromNoise = caveType.heightNoises[caveI].getOctaves(x, z)

				caveInfoList.push({
					low: caveYFromNoise-caveHeight + caveType.caveOffset,
					high: caveYFromNoise+caveHeight + caveType.caveOffset,
				})
			}
		}
	}

	/**
	 * x and z are coords of bottom left block
	 *
	 * @param x
	 * @param z
	 * @param caveInfos
	 */
	_addPitCaves(x, z, caveInfos) {
		for (let pitCaveI = 0; pitCaveI < this.pitCaves.generators.length; pitCaveI++) {
			const gen = this.pitCaves.generators[pitCaveI]
			const distPerturber = this.pitCaves.distPerturbNoises[pitCaveI]

			const distOffsets = getPerturbOffsetsInChunk(x, z, distPerturber, this.chunkSize, this.lookOutsideChunkDist)

			const nearbyPits = gen.getSurroundingFeatures(x, z)
			for (const [pitX, pitZ] of nearbyPits) {
				const rand = new Rand(`pit${pitX}|${pitZ}|${pitCaveI}${this.seed}`, PRNG.mulberry32);

				const pitWidth = Math.floor(rand.next()*(this.pitCaves.maxWidth-this.pitCaves.minWidth)) + this.pitCaves.minWidth
				const pitLength = Math.floor(rand.next()*(this.pitCaves.maxWidth-this.pitCaves.minWidth)) + this.pitCaves.minWidth

				const pitMaxX = pitX+pitWidth/2
				const pitMinX = pitX-pitWidth/2
				const pitMaxZ = pitZ+pitLength/2
				const pitMinZ = pitZ-pitLength/2

				const bottomPitY = Math.floor(rand.next()*(this.pitCaves.maxBottomPit-this.pitCaves.minBottomPit)) + this.pitCaves.minBottomPit
				const pitHeight = Math.floor(rand.next()*(this.pitCaves.maxHeight-this.pitCaves.minHeight)) + this.pitCaves.minHeight

				for (let localI = -this.lookOutsideChunkDist; localI < this.chunkSize+this.lookOutsideChunkDist; ++localI) {
					for (let localK = -this.lookOutsideChunkDist; localK < this.chunkSize+this.lookOutsideChunkDist; ++localK) {
						const i = x+localI
						const k = z+localK

						const perturbDists = getXZPerturbOffsetsFromAll(localI, localK, distOffsets, this.chunkSize, this.lookOutsideChunkDist)

						const useX = i+perturbDists[0]
						const useZ = k+perturbDists[1]

						if (useX > pitMaxX || useX < pitMinX || useZ > pitMaxZ || useZ < pitMinZ) {
							continue
						}

						const yPerturb = this.pitCaves.yPerturbNoises[pitCaveI].getOctaves(i, k)
						const heightPerturb = this.pitCaves.heightPerturbNoises[pitCaveI].getOctaves(i, k)

						let bot = bottomPitY+yPerturb
						let top = bottomPitY+pitHeight+heightPerturb

						const modifyAtDist = 4
						const distToEdgeX = Math.min(pitMaxX-useX, useX-pitMinX)
						const distToEdgeZ = Math.min(pitMaxZ-useZ, useZ-pitMinZ)
						const combinedDist = Math.min(distToEdgeX, distToEdgeZ)
						if (combinedDist < modifyAtDist) {
							// const targetMid = 5 // The y point above floor where the cave edges meet
							const targetMid = 5+this.pitCaves.edgesTargetMidpointNoise[pitCaveI].getOctaves(i, k)

							const edgeDistFrac = 1-(combinedDist/modifyAtDist)
							bot += targetMid*edgeDistFrac

							const topDistFromMid = top-bot
							top -= topDistFromMid*edgeDistFrac
						}

						const caveInfoList = caveInfos[xzId(i, k)]
						caveInfoList.push({low: bot, high: top})
					}
				}
			}
		}
	}

	/**
	 * x and z are coords of bottom left block
	 *
	 * @param x
	 * @param z
	 * @param caveInfos
	 */
	_addRavineCaves(x, z, caveInfos) {
		for (let ravineCaveI = 0; ravineCaveI < this.ravineCaves.generators.length; ravineCaveI++) {
			const gen = this.ravineCaves.generators[ravineCaveI]
			const distPerturber = this.ravineCaves.distPerturbNoises[ravineCaveI]

			const distOffsets = getPerturbOffsetsInChunk(x, z, distPerturber, this.chunkSize, this.lookOutsideChunkDist)

			const nearbyRavines = gen.getSurroundingFeatures(x, z)
			for (const ravinePos of nearbyRavines) {
				const [ravineX, ravineZ] = ravinePos
				const rand = new Rand(`rav${ravineX}|${ravineZ}|${ravineCaveI}${this.seed}`, PRNG.mulberry32);

				const ravineWidth = Math.floor(rand.next()*(this.ravineCaves.maxWidth-this.ravineCaves.minWidth)) + this.ravineCaves.minWidth
				const ravineLength = Math.floor(rand.next()*(this.ravineCaves.maxLength-this.ravineCaves.minLength)) + this.ravineCaves.minLength

				// const pitMaxX = pitX+pitWidth/2
				// const pitMinX = pitX-pitWidth/2
				// const pitMaxZ = pitZ+pitLength/2
				// const pitMinZ = pitZ-pitLength/2

				const bottomPitY = Math.floor(rand.next()*(this.ravineCaves.maxBottomRavine-this.ravineCaves.minBottomRavine)) + this.ravineCaves.minBottomRavine
				const ravineHeight = Math.floor(rand.next()*(this.ravineCaves.maxHeight-this.ravineCaves.minHeight)) + this.ravineCaves.minHeight

				let ravineDir = [rand.next()*2 - 1, rand.next()*2 - 1]
				normalise2d(ravineDir)

				for (let localI = -this.lookOutsideChunkDist; localI < this.chunkSize+this.lookOutsideChunkDist; ++localI) {
					for (let localK = -this.lookOutsideChunkDist; localK < this.chunkSize+this.lookOutsideChunkDist; ++localK) {
						const i = x+localI
						const k = z+localK

						const perturbDists = getXZPerturbOffsetsFromAll(localI, localK, distOffsets, this.chunkSize, this.lookOutsideChunkDist)

						const useX = i+perturbDists[0]
						const useZ = k+perturbDists[1]
						const usePt = [useX, useZ]

						// if (useX > pitMaxX || useX < pitMinX || useZ > pitMaxZ || useZ < pitMinZ) {
						// 	continue
						// }

						const dirToCenter = [useX-ravineX, useZ-ravineZ]
						normalise2d(dirToCenter)

						// const absDotProd = Math.abs(dotProduct2d(ravineDir, dirToCenter))

						// const allowedDist = ravineWidth + (Math.pow(absDotProd, 15))*ravineLength

						const distToCenter = xzDistNoArr(ravinePos, useX, useZ)
						// if (distToCenter > allowedDist) {
						// 	continue
						// }

						// Get the dist to the line segment representing the ravine
						// I.e. our dist along the ravine's cross-axis

						if (distToCenter > ravineLength) {
							continue
						}

						const distAlongCrossAxis = distToClosestLinePoint(usePt, ravinePos, [ravinePos[0]+ravineDir[0], ravinePos[1]+ravineDir[1]])

						const ravineWidthToUse = ravineWidth*(1 - distToCenter/ravineLength)

						if (distAlongCrossAxis > ravineWidthToUse) {
							continue
						}


						const yPerturb = this.ravineCaves.yPerturbNoises[ravineCaveI].getOctaves(i, k)
						// const heightPerturb = this.ravineCaves.heightPerturbNoises[ravineCaveI].getOctaves(i, k)
						let bot = bottomPitY+yPerturb
						let top = bottomPitY+ravineHeight+yPerturb

						const modifyAtDist = 3

						const distFromEdge = ravineWidthToUse-distAlongCrossAxis

						// const combinedDist = Math.min(distToEdgeX, distToEdgeZ)
						if (distFromEdge < modifyAtDist) {
							const edgeDistFrac = 1-(distFromEdge/modifyAtDist)

							bot += ravineHeight*edgeDistFrac
						}

						const caveInfoList = caveInfos[xzId(i, k)]
						caveInfoList.push({low: bot, high: top})

					}
				}
			}
		}
	}

	/**
	 * x and z are coords of bottom left block
	 *
	 * @param x
	 * @param z
	 * @param caveInfos
	 */
	_addSphereCaves(x, z, caveInfos) {
		for (let sphereCaveI = 0; sphereCaveI < this.sphereCaves.generators.length; sphereCaveI++) {
			const gen = this.sphereCaves.generators[sphereCaveI]
			const distPerturber = this.sphereCaves.distPerturbNoises[sphereCaveI]

			const distOffsets = getPerturbOffsetsInChunk(x, z, distPerturber, this.chunkSize, this.lookOutsideChunkDist)

			const nearbySpheres = gen.getSurroundingFeatures(x, z)
			for (const [sphereX, sphereZ] of nearbySpheres) {
				const rand = new Rand(`sph${sphereX}|${sphereZ}|${sphereCaveI}${this.seed}`, PRNG.mulberry32);

				const radius = Math.floor(rand.next()*(this.sphereCaves.maxRadius-this.sphereCaves.minRadius)) + this.sphereCaves.minRadius
				const radiusSq = radius*radius

				const sphereCenterY = Math.floor(rand.next()*(this.sphereCaves.maxCentreSphere-this.sphereCaves.minCentreSphere)) + this.sphereCaves.minCentreSphere

				for (let localI = -this.lookOutsideChunkDist; localI < this.chunkSize+this.lookOutsideChunkDist; ++localI) {
					for (let localK = -this.lookOutsideChunkDist; localK < this.chunkSize+this.lookOutsideChunkDist; ++localK) {
						const i = x+localI
						const k = z+localK

						const perturbDists = getXZPerturbOffsetsFromAll(localI, localK, distOffsets, this.chunkSize, this.lookOutsideChunkDist)

						const useX = i+perturbDists[0]
						const useZ = k+perturbDists[1]

						const xDist = sphereX-useX
						const zDist = sphereZ-useZ
						const xzDistSq = xDist*xDist + zDist*zDist
						if (xzDistSq > radiusSq) {
							// We're outside the sphere at this point, continue
							// console.log("P", xzDistSq, radiusSq)
							continue
						}

						// Now we need to solve for the two possible y's that fall on the edge of the sphere
						// Solve pythagoras in 3d for y
						// Our max and min yoffsets from the center is:
						const y = Math.sqrt(radiusSq-xzDistSq)

						const caveInfoList = caveInfos[xzId(i, k)]
						caveInfoList.push({low: sphereCenterY-y, high: sphereCenterY+y})
					}
				}
			}
		}
	}
}