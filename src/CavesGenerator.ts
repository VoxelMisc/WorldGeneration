import {
	distToClosestLinePoint,
	// dotProduct2d,
	getPerturbOffsetsInChunk,
	getXZPerturbOffsetsFromAll, Int16FourDArray, Int16TwoDArray,
	normalise2d, Random,
	SimplexCustomOctaveHelper, SimplexThresholdOctaveHelper, xzDistNoArr,
} from './util'
import {ChunkBasedPointGenerator} from './ChunkBasedPointGenerator'
import {PointsGenerator} from './PointsGenerator'
import {CaveInfos, HeightmapVals} from './types'
import {CANNOT_MEET_THRESHOLD, NO_CAVE, NO_CAVES_RESTRICTION_FROM_WATER} from './constants'

export class CavesGenerator {
	spaghettCaves: {count: number,
		thresholdNoiseSetup,
		// We could just include the perturb noise in the threshold noise itself
		// But I tuned the setup to look good before realising this
		heightNoiseSetup,
		heightPerturbSetup,
		cutoffNoiseSetup,
		threshold,
		height,
		heightPercentCap,
		thresholdNoises,
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
		distApartInChunks: 5,
		distPerturbNoiseSetup: [
			{ amplitude: 1, frequency: 1/8, },
			{ amplitude: 3, frequency: 1/20, },
			{ amplitude: 10, frequency: 1/100, },
			{ amplitude: 29, frequency: 1/500, },
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
		maxHeight: 45,
		minBottomPit: -99,
		maxBottomPit: -25,

		generators: [],
		distPerturbNoises: [],
		yPerturbNoises: [],
		heightPerturbNoises: [],
		edgesTargetMidpointNoise: [],
	}

	ravineCaves = {
		count: 2,
		// count: 1,
		maxWidth: 15,
		minWidth: 10,
		maxLength: 90,
		minLength: 50,
		// This dist apart is the same as if we had count 1 and distApart 5
		// We could reduce it to 6 if we want more ravines
		distApartInChunks: 7,
		distPerturbNoiseSetup: [
			{ amplitude: 1, frequency: 1/8, },
			{ amplitude: 3, frequency: 1/20, },
			{ amplitude: 10, frequency: 1/100, },
			{ amplitude: 30, frequency: 1/500, },
		],
		yPerturbNoiseSetup: [
			{ amplitude: 1, frequency: 1/10, },
			{ amplitude: 3, frequency: 1/50, },
		],
		minHeight: 25,
		maxHeight: 45,
		maxBottomRavine: -99,
		minBottomRavine: -5,

		generators: [],
		distPerturbNoises: [],
		yPerturbNoises: [],
		edgesTargetMidpointNoise: [],
	}

	sphereCaves = {
		count: 1,
		maxRadius: 6,
		minRadius: 20,
		distApartInChunks: 4,
		distPerturbNoiseSetup: [
			{ amplitude: 1, frequency: 1/8, },
			{ amplitude: 3, frequency: 1/20, },
		],
		minCentreSphere: -79,
		maxCentreSphere: 10,

		generators: [],
		distPerturbNoises: [],
	}

	seed: string
	lookOutsideChunkDist: number

	numCaves: number
	numSpaghettiCaves: number

	constructor(seed, chunkSize, lookOutsideChunkDist) {
		this.chunkSize = chunkSize
		this.seed = seed
		this.lookOutsideChunkDist = lookOutsideChunkDist

		const mainSpaghettCave = {
			count: 1,
			thresholdNoiseSetup: [
				{amplitude: 1.5, frequency: 1 / 300},
				{amplitude: 0.5, frequency: 1 / 150},
				{amplitude: 0.35, frequency: 1 / 70,},
				{amplitude: 0.04, frequency: 1 / 5,},
			],
			heightNoiseSetup: [
				{amplitude: 25, frequency: 1 / 200},
				{amplitude: 12, frequency: 1 / 150},
			],
			heightPerturbSetup: [
				{amplitude: 1, frequency: 1 / 4,},
				{amplitude: 5, frequency: 1 / 10,},
			],
			cutoffNoiseSetup: [
				{amplitude: 1, frequency: 1 / 300},
			],
			caveOffset: null, // Set below
			threshold: {low: -0.1, high: 0.1},
			height: 9,
			heightPercentCap: 0.5,
			thresholdNoises: [],
			heightNoises: [],
			heightPerturbNoises: [],
			cutoffNoises: [],
			caveBot: 0, // set below for each copy of spaghett cave
		}


		const spaghettCaveBots = [{caveBot: -15, amt: 1}, {caveBot: -35, amt: 1}, {caveBot: -55, amt: 2}, {caveBot: -75, amt: 1}, {caveBot: -99, amt: 1}]
		this.spaghettCaves = []
		for (const {caveBot, amt} of spaghettCaveBots) {
			this.spaghettCaves.push({
				...JSON.parse(JSON.stringify(mainSpaghettCave)),
				caveBot,
				count: amt,
			})
		}

		// The same as above but with a low bot and low height changes (designed for gold/diamond discovery)
		this.spaghettCaves.push({
			count: 1,
			thresholdNoiseSetup: [
				{amplitude: 1.5, frequency: 1 / 300},
				{amplitude: 0.5, frequency: 1 / 150},
				{amplitude: 0.35, frequency: 1 / 70,},
				{amplitude: 0.04, frequency: 1 / 5,},
			],
			heightNoiseSetup: [
				{amplitude: 15, frequency: 1 / 100},
				{amplitude: 4, frequency: 1 / 75},
			],
			heightPerturbSetup: [
				{amplitude: 1, frequency: 1 / 4,},
				{amplitude: 5, frequency: 1 / 10,},
			],
			cutoffNoiseSetup: [
				{amplitude: 1, frequency: 1 / 300},
			],
			caveOffset: null, // Set below
			threshold: {low: -0.1, high: 0.1},
			height: 9,
			heightPercentCap: 0.5,
			thresholdNoises: [],
			heightNoises: [],
			heightPerturbNoises: [],
			cutoffNoises: [],
			caveBot: -95, // set below for each copy of spaghett cave
		})


		for (const caveType of this.spaghettCaves) {
			let amplitudeSum = 0
			for (const {amplitude} of caveType.heightNoiseSetup) {
				amplitudeSum += amplitude
			}

			caveType.caveOffset = caveType.caveBot + amplitudeSum
		}

		this.numSpaghettiCaves = 0
		this.numCaves = 0

		for (let caveTypeI = 0; caveTypeI < this.spaghettCaves.length; caveTypeI++) {
			const caveType = this.spaghettCaves[caveTypeI]
			for (let caveI = 0; caveI < caveType.count; caveI++) {
				caveType.thresholdNoises.push(new SimplexThresholdOctaveHelper(caveType.thresholdNoiseSetup, caveType.threshold, `${seed}Cave${caveTypeI}${caveI}`))
				caveType.heightNoises.push(new SimplexCustomOctaveHelper(caveType.heightNoiseSetup, `${seed}CaveHeightNoise${caveTypeI}${caveI}`))
				caveType.heightPerturbNoises.push(new SimplexCustomOctaveHelper(caveType.heightPerturbSetup, `${seed}CaveHeightPerturb${caveTypeI}${caveI}`))

				caveType.cutoffNoises.push(new SimplexCustomOctaveHelper(caveType.cutoffNoiseSetup, `${seed}CaveCutoff${caveTypeI}${caveI}`))

				this.numCaves++
				this.numSpaghettiCaves++
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
				100,
				chunkSize,
			)
			const chunkBasedGen = new ChunkBasedPointGenerator(chunkSize, pitPtsGen, this.pitCaves.maxWidth+2*totalPerturbAmplitude, `${seed}PitGen${pitI}`)
			this.pitCaves.generators.push(chunkBasedGen)

			// They cannot overlap - use distApartInChunks/2 as caves dist is evaluated poisson-disk style and so can lie outside that circle dist
			// (while they then may still overlap as a result of the perturbation noise being applied to both x and z axis - chunkbasedpointgen queries in a square)
			console.assert(chunkBasedGen.maxRadiusChunk <= (this.pitCaves.distApartInChunks)/2, `cannot have overlapping cave features, ${chunkBasedGen.maxRadiusChunk} ${(this.pitCaves.distApartInChunks)/2}`)

			this.numCaves++
		}

		for (let ravineI = 0; ravineI < this.ravineCaves.count; ravineI++) {
			this.ravineCaves.distPerturbNoises.push(new SimplexCustomOctaveHelper(this.ravineCaves.distPerturbNoiseSetup, `${seed}DistRavPerturb${ravineI}`))
			let totalPerturbAmplitude = 0
			for (const {amplitude} of this.ravineCaves.distPerturbNoiseSetup) {
				totalPerturbAmplitude += amplitude
			}

			this.ravineCaves.yPerturbNoises.push(new SimplexCustomOctaveHelper(this.ravineCaves.yPerturbNoiseSetup, `${seed}yRavinePerturb${ravineI}`))

			const ravinePtsGen = new PointsGenerator(
				this.ravineCaves.distApartInChunks,
				true,
				false,
				`${seed}RavineGen${ravineI}`,
				100,
				chunkSize,
			)
			const chunkBasedGen = new ChunkBasedPointGenerator(chunkSize, ravinePtsGen, Math.max(this.ravineCaves.maxLength, this.ravineCaves.maxWidth)+2*totalPerturbAmplitude, `${seed}RavineGen${ravineI}`)
			this.ravineCaves.generators.push(chunkBasedGen)

			// They cannot overlap
			console.assert(chunkBasedGen.maxRadiusChunk <= (this.ravineCaves.distApartInChunks)/2, `cannot have overlapping cave features, ${chunkBasedGen.maxRadiusChunk} ${(this.ravineCaves.distApartInChunks)/2}`)

			this.numCaves++
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
				100,
				chunkSize,
			)
			const chunkBasedGen = new ChunkBasedPointGenerator(chunkSize, spherePtsGen, 2*this.sphereCaves.maxRadius+2*totalPerturbAmplitude, `${seed}SphereGen${sphereI}`)
			this.sphereCaves.generators.push(chunkBasedGen)

			console.assert(chunkBasedGen.maxRadiusChunk <= (this.sphereCaves.distApartInChunks)/2, `cannot have overlapping cave features, ${chunkBasedGen.maxRadiusChunk} ${(this.sphereCaves.distApartInChunks)/2}`)

			this.numCaves++
		}
	}

	// x and z are bottom left corner blocks in chunk
	getCaveInfoForChunk(x, z, heightmapVals: HeightmapVals): CaveInfos {
		// CaveInfos details the cave location for each cave type in each x/z column
		// I.e. dims are x/z/caveType/[y-start and end]
		// Do this to save memory over a normal js array/object for when we cache it
		const caveInfos = new Int16FourDArray(this.chunkSize, [x, z], this.numCaves, 2, this.lookOutsideChunkDist)
		// Default caveinfos to NO_CAVE
		caveInfos.fill(NO_CAVE)


		for (let i = x-this.lookOutsideChunkDist; i < x+this.chunkSize+this.lookOutsideChunkDist; ++i) {
			for (let k = z-this.lookOutsideChunkDist; k < z+this.chunkSize+this.lookOutsideChunkDist; ++k) {
				this._addSpaghettCavesForColumn(i, k, caveInfos, heightmapVals.groundHeights, 0)
			}
		}

		let numCaveTypesDone = this.numSpaghettiCaves

		this._addPitCaves(x, z, caveInfos, heightmapVals.groundHeights, numCaveTypesDone)
		numCaveTypesDone += this.pitCaves.count
		this._addSphereCaves(x, z, caveInfos, heightmapVals.groundHeights, numCaveTypesDone)
		numCaveTypesDone += this.sphereCaves.count
		this._addRavineCaves(x, z, caveInfos, heightmapVals.groundHeights, numCaveTypesDone)

		this.removeCavesNearWater(x, z, caveInfos, heightmapVals)

		return caveInfos
	}

	/**
	 * @param x block x of column
	 * @param z block z of column
	 * @param caveInfos
	 * @param groundHeights
	 * @param caveTypeStartI
	 */
	_addSpaghettCavesForColumn(x, z, caveInfos: CaveInfos, groundHeights: Int16TwoDArray, caveTypeStartI: number) {
		for (const caveType of this.spaghettCaves) {
			for (let caveI = 0; caveI < caveType.count; caveI++) {
				caveTypeStartI++

				let cutoffVal = caveType.cutoffNoises[caveI].getOctaves(x, z)
				const fullCutoffAt = 0.08
				if (cutoffVal >= fullCutoffAt) {
					continue
				}

				let noiseVal = caveType.thresholdNoises[caveI].getOctaves(x, z)

				if (noiseVal === CANNOT_MEET_THRESHOLD) {
					continue
				}

				const isCave = noiseVal > caveType.threshold.low && noiseVal < caveType.threshold.high

				if (!isCave) {
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

				const bot = Math.floor(caveYFromNoise-caveHeight + caveType.caveOffset)
				let top = Math.floor(caveYFromNoise+caveHeight + caveType.caveOffset)

				// Don't want hovering grass, so if we are one block away from the surface increase top by one
				if (top+1 === groundHeights.get(x, z)) {
					top++
				}

				caveInfos.set(x, z, caveTypeStartI-1, 0, bot)
				caveInfos.set(x, z, caveTypeStartI-1, 1, top)
			}
		}
	}

	/**
	 * x and z are coords of bottom left block
	 *
	 * @param x
	 * @param z
	 * @param caveInfos
	 * @param groundHeights
	 * @param caveTypeStartI
	 */
	_addPitCaves(x, z, caveInfos: CaveInfos, groundHeights: Int16TwoDArray, caveTypeStartI: number) {
		for (let pitCaveI = 0; pitCaveI < this.pitCaves.generators.length; pitCaveI++) {
			caveTypeStartI++

			const gen = this.pitCaves.generators[pitCaveI]
			const distPerturber = this.pitCaves.distPerturbNoises[pitCaveI]

			const distOffsets = getPerturbOffsetsInChunk(x, z, distPerturber, this.chunkSize, this.lookOutsideChunkDist)

			const nearbyPits = gen.getSurroundingFeatures(x, z)
			for (const [pitX, pitZ] of nearbyPits) {
				const rand = new Random(`pit${pitX}|${pitZ}|${pitCaveI}${this.seed}`);

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

						bot = Math.floor(bot)
						top = Math.floor(top)

						// Don't want hovering grass, so if we are one block away from the surface increase top by one
						if (top+1 === groundHeights.get(i, k)) {
							top++
						}

						caveInfos.set(i, k, caveTypeStartI-1, 0, bot)
						caveInfos.set(i, k, caveTypeStartI-1, 1, top)
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
	 * @param groundHeights
	 * @param caveTypeStartI
	 */
	_addRavineCaves(x, z, caveInfos: CaveInfos, groundHeights: Int16TwoDArray, caveTypeStartI: number) {
		for (let ravineCaveI = 0; ravineCaveI < this.ravineCaves.generators.length; ravineCaveI++) {
			caveTypeStartI++

			const gen = this.ravineCaves.generators[ravineCaveI]
			const distPerturber = this.ravineCaves.distPerturbNoises[ravineCaveI]

			const distOffsets = getPerturbOffsetsInChunk(x, z, distPerturber, this.chunkSize, this.lookOutsideChunkDist)

			const nearbyRavines = gen.getSurroundingFeatures(x, z)
			for (const ravinePos of nearbyRavines) {
				const [ravineX, ravineZ] = ravinePos
				const rand = new Random(`rav${ravineX}|${ravineZ}|${ravineCaveI}${this.seed}`);

				const ravineWidth = Math.floor(rand.next()*(this.ravineCaves.maxWidth-this.ravineCaves.minWidth)) + this.ravineCaves.minWidth
				const ravineLength = Math.floor(rand.next()*(this.ravineCaves.maxLength-this.ravineCaves.minLength)) + this.ravineCaves.minLength

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

						const dirToCenter = [useX-ravineX, useZ-ravineZ]
						normalise2d(dirToCenter)

						const distToCenter = xzDistNoArr(ravinePos, useX, useZ)

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
						let bot = bottomPitY+yPerturb
						let top = bottomPitY+ravineHeight+yPerturb

						const modifyAtDist = 3

						const distFromEdge = ravineWidthToUse-distAlongCrossAxis

						if (distFromEdge < modifyAtDist) {
							const edgeDistFrac = 1-(distFromEdge/modifyAtDist)

							bot += ravineHeight*edgeDistFrac
						}

						bot = Math.floor(bot)
						top = Math.floor(top)

						// Don't want hovering grass, so if we are one block away from the surface increase top by one
						if (top+1 === groundHeights.get(i, k)) {
							top++
						}

						caveInfos.set(i, k, caveTypeStartI-1, 0, bot)
						caveInfos.set(i, k, caveTypeStartI-1, 1, top)
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
	 * @param groundHeights
	 * @param caveTypeStartI
	 */
	_addSphereCaves(x, z, caveInfos: CaveInfos, groundHeights: Int16TwoDArray, caveTypeStartI: number) {
		for (let sphereCaveI = 0; sphereCaveI < this.sphereCaves.generators.length; sphereCaveI++) {
			caveTypeStartI++

			const gen = this.sphereCaves.generators[sphereCaveI]
			const distPerturber = this.sphereCaves.distPerturbNoises[sphereCaveI]

			const distOffsets = getPerturbOffsetsInChunk(x, z, distPerturber, this.chunkSize, this.lookOutsideChunkDist)

			const nearbySpheres = gen.getSurroundingFeatures(x, z)
			for (const [sphereX, sphereZ] of nearbySpheres) {
				const rand = new Random(`sph${sphereX}|${sphereZ}|${sphereCaveI}${this.seed}`);

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
							continue
						}

						// Now we need to solve for the two possible y's that fall on the edge of the sphere
						// Solve pythagoras in 3d for y
						// Our max and min yoffsets from the center is:
						const y = Math.sqrt(radiusSq-xzDistSq)

						const bot = Math.floor(sphereCenterY-y)
						let top = Math.floor(sphereCenterY+y)

						// Don't want hovering grass, so if we are one block away from the surface increase top by one
						if (top+1 === groundHeights.get(i, k)) {
							top++
						}

						caveInfos.set(i, k, caveTypeStartI-1, 0, bot)
						caveInfos.set(i, k, caveTypeStartI-1, 1, top)
					}
				}
			}
		}
	}

	isCave(x, y, z, caveInfos: CaveInfos) {
		for (let caveTypeI = 0; caveTypeI < this.numCaves; caveTypeI++) {
			const low = caveInfos.get(x, z, caveTypeI, 0)
			const high = caveInfos.get(x, z, caveTypeI, 1)

			if (y >= low && y <= high) {
				return true
			}
		}
		return false
	}

	addCavesToChunk(array, startX, startY, startZ, caveInfos: CaveInfos) {
		for (let x = startX; x < startX+this.chunkSize; x++) {
			for (let z = startZ; z < startZ + this.chunkSize; z++) {
				for (let caveTypeI = 0; caveTypeI < this.numCaves; caveTypeI++) {
					const low = caveInfos.get(x, z, caveTypeI, 0)
					const high = caveInfos.get(x, z, caveTypeI, 1)

					if (low === NO_CAVE) {
						continue
					}

					const caveMaxY = Math.min(high+1, startY+this.chunkSize)
					for (let y = Math.max(low, startY); y < caveMaxY; y++) {
						array.set(x-startX, y-startY, z-startZ, 0)
					}
				}
			}
		}
	}

	private removeCavesNearWater(x, z, caveInfos: CaveInfos, heightmapVals: HeightmapVals) {
		for (let i = x-this.lookOutsideChunkDist; i < x+this.chunkSize+this.lookOutsideChunkDist; ++i) {
			for (let k = z-this.lookOutsideChunkDist; k < z+this.chunkSize + this.lookOutsideChunkDist; ++k) {
				const cavesAllowedBelowY = heightmapVals.cavesAllowedBelowY.get(i, k)
				if (cavesAllowedBelowY !== NO_CAVES_RESTRICTION_FROM_WATER) {
					for (let caveTypeI = 0; caveTypeI < this.numCaves; caveTypeI++) {
						const low = caveInfos.get(i, k, caveTypeI, 0)
						const high = caveInfos.get(i, k, caveTypeI, 1)

						if (high > cavesAllowedBelowY) {
							if (low > cavesAllowedBelowY) {
								caveInfos.set(i, k, caveTypeI, 0, NO_CAVE)
								caveInfos.set(i, k, caveTypeI, 1, NO_CAVE)
							}
							else {
								caveInfos.set(i, k, caveTypeI, 1, cavesAllowedBelowY)
							}
						}
					}
				}
			}
		}
	}
}