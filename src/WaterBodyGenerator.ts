import {WorldGenerator} from './index'
import Rand, {PRNG} from 'rand-seed'
import {
	distToLineSegmentWithInfo,
	getCustomNoiseAmplitude,
	SimplexCustomOctaveHelper,
	xzDist,
	xzDistNoArr,
} from './util'

type CellWaterInfo = {
	origin: number[],
	originNoWaterHeight: number,
	downhill: DownhillInfo | null,
	uphills: UphillsInfo,
	incomingFlux: number,
	selfFlux: number,

	lakeInfo: LakeInfo,
}

class LakeInfo {
	hasLake = false
	lakeCreationHasBeenAttempted = false
	lakeWaterHeight = 0
	lakeRadius = 0
	lakeBedHeight = 0
}

type UphillsInfo = {
	incomingFlux: number,
	selfFlux: number,
	origin: number[],
	originNoWaterHeight: number,
}[]

type DownhillInfo = {
	cell: number[],
	origin: number[],
	originNoWaterHeight: number,
	lakeInfo: LakeInfo,
}

export class WaterBodyGenerator {
	worldGenerator: WorldGenerator

	gridSize: number = 224

	cellCenterMaxOffset: number

	maxRiverSettings = {
		width: 23,
		atFlux: 1000,
	}

	lakeSettings = {
		maxRadius: 60,
		maxRadiusAtFlux: 2000,

		noLakeFluxCutoff: 50,
	}

	widthOffset = 2

	seed: string

	lakeRadiusNoiseModifier: SimplexCustomOctaveHelper
	lakeRadiusNoiseAmplitude: number

	private waterBodyInfos = new Map()
	private lastReadInfo = {lastId: null, info: null}

	constructor(worldGenerator: WorldGenerator, seed: string, heightmapPerturbAmplitude: number, needOutsideWaterBodyDist: number) {
		this.worldGenerator = worldGenerator

		// Don't generate near edge of cell to ensure we always find out about the river we are near enough to to be modifying terrain
		// (heightmapPerturbAmplitude is only included so as to prevent thrashing between cells while generating a single chunk)
		const cellCenterDistFromEdge = Math.max(this.lakeSettings.maxRadius, this.maxRiverSettings.width/2 + this.widthOffset)
			+ needOutsideWaterBodyDist + heightmapPerturbAmplitude

		this.cellCenterMaxOffset = this.gridSize/2 - cellCenterDistFromEdge
		console.log("Dist from edge", cellCenterDistFromEdge, this.cellCenterMaxOffset)

		this.seed = seed

		this.lakeRadiusNoiseModifier = new SimplexCustomOctaveHelper([
			{
				amplitude: 10,
				frequency: 1/55,
			},
			{
				amplitude: 4,
				frequency: 1/25,
			},
		], `${seed}GlobalHeightmapOffset`)

		this.lakeRadiusNoiseAmplitude = getCustomNoiseAmplitude(this.lakeRadiusNoiseModifier)
	}

	getInfoNeededForWaterGen(x, z): {distFromWater: number, waterRadius: number, waterHeight: number, waterbedHeight: number, isLake: boolean} {
		const pt = [x, z]

		const cellWaterInfo = this.getWaterInfo(x, z, true)

		// We need to find the river/lake we are closest to (closestDistToRiverEdge) and compute subsequently needed values

		let closestDistToRiverEdge = 10000
		let closestDistToRiverCenter = 0
		let closestRiverWidth = 0

		let closestFluxFrac = 0

		let fracAlongRiver = 0
		let uphillWaterHeight = 0
		let downhillWaterHeight = 0

		const riverWaterOffsetFromNoRiver = -3

		if (cellWaterInfo.downhill) {
			const {dist: distFlt, fracAlong, lineSegmentLength} = distToLineSegmentWithInfo(pt, cellWaterInfo.origin, cellWaterInfo.downhill.origin)
			closestDistToRiverCenter = Math.floor(distFlt)

			let flux = cellWaterInfo.incomingFlux
			flux += fracAlong*cellWaterInfo.selfFlux

			closestFluxFrac = Math.min(1, flux/this.maxRiverSettings.atFlux)
			closestRiverWidth = Math.max(1, Math.ceil(closestFluxFrac*this.maxRiverSettings.width))

			closestDistToRiverEdge = closestDistToRiverCenter-(closestRiverWidth/2)

			uphillWaterHeight = cellWaterInfo.originNoWaterHeight + riverWaterOffsetFromNoRiver

			if (cellWaterInfo.downhill.lakeInfo.hasLake) {
				downhillWaterHeight = cellWaterInfo.downhill.lakeInfo.lakeWaterHeight

				// Rescale fracAlongRiver to be from the uphill origin to the downhill lake edge (not lake center)
				const downhillLakeRadius = cellWaterInfo.downhill.lakeInfo.lakeRadius
				const lineSegmentLengthToLake = lineSegmentLength - downhillLakeRadius

				const existingAlong = lineSegmentLength*fracAlong
				fracAlongRiver = Math.min(1, existingAlong / lineSegmentLengthToLake)
			}
			else {
				downhillWaterHeight = cellWaterInfo.downhill.originNoWaterHeight + riverWaterOffsetFromNoRiver
				fracAlongRiver = fracAlong
			}
		}

		for (const uphill of cellWaterInfo.uphills) {
			const {dist: distFlt, fracAlong, lineSegmentLength} = distToLineSegmentWithInfo(pt, uphill.origin, cellWaterInfo.origin)
			const distToCenter = Math.floor(distFlt)

			let flux = uphill.incomingFlux
			flux += fracAlong*uphill.selfFlux

			const fluxFrac = Math.min(1, flux/this.maxRiverSettings.atFlux)
			const riverWidth = Math.max(1, Math.ceil(fluxFrac*this.maxRiverSettings.width))

			const distToRiverEdge = distToCenter-(riverWidth/2)

			if (distToRiverEdge < closestDistToRiverEdge) {
				closestDistToRiverEdge = distToRiverEdge
				closestDistToRiverCenter = distToCenter

				closestFluxFrac = fluxFrac
				closestRiverWidth = riverWidth

				uphillWaterHeight = uphill.originNoWaterHeight + riverWaterOffsetFromNoRiver

				if (cellWaterInfo.lakeInfo.hasLake) {
					downhillWaterHeight = cellWaterInfo.lakeInfo.lakeWaterHeight

					// Rescale fracAlongRiver to be from the uphill origin to the downhill lake edge (not lake center)
					const downhillLakeRadius = cellWaterInfo.lakeInfo.lakeRadius
					const lineSegmentLengthToLake = lineSegmentLength - downhillLakeRadius

					const existingAlong = lineSegmentLength*fracAlong
					fracAlongRiver = Math.min(1, existingAlong / lineSegmentLengthToLake)
				}
				else {
					downhillWaterHeight = cellWaterInfo.originNoWaterHeight + riverWaterOffsetFromNoRiver
					fracAlongRiver = fracAlong
				}
			}
		}

		if (closestDistToRiverEdge !== 10000) {
			let distToLakeEdge = 10000
			let effectiveLakeRadius = 0
			if  (cellWaterInfo.lakeInfo.hasLake) {
				// Get dist to lake edge

				const lakeInfo = cellWaterInfo.lakeInfo

				// Offset the lake radius with noise to make lakes non-circle

				let radiusOffset = this.lakeRadiusNoiseModifier.getOctaves(x, z)
				// Ensure noise is entirely positive
				radiusOffset += this.lakeRadiusNoiseAmplitude

				// Radius offset effects larger lakes more
				const radiusFracOfMax = lakeInfo.lakeRadius / this.lakeSettings.maxRadius
				radiusOffset *= radiusFracOfMax
				effectiveLakeRadius = lakeInfo.lakeRadius - radiusOffset

				distToLakeEdge = xzDistNoArr(cellWaterInfo.origin, x, z) - effectiveLakeRadius
			}

			let lerpRiverWaterHeight = Math.floor(downhillWaterHeight + (uphillWaterHeight-downhillWaterHeight)*(1-fracAlongRiver))
			const riverbedHeight = lerpRiverWaterHeight-(Math.ceil(10*closestFluxFrac)+2)

			if (closestDistToRiverEdge < distToLakeEdge) {
				const riverRadius = (closestRiverWidth+this.widthOffset)/2

				return {
					distFromWater: closestDistToRiverCenter,
					waterRadius: riverRadius,
					waterHeight: lerpRiverWaterHeight,
					waterbedHeight: riverbedHeight,
					isLake: false,
				}
			}
			else {
				const distToLakeCenter = xzDistNoArr(cellWaterInfo.origin, x, z)
				const lakeInfo = cellWaterInfo.lakeInfo

				return {
					distFromWater: distToLakeCenter,
					waterRadius: effectiveLakeRadius,
					waterHeight: lakeInfo.lakeWaterHeight,
					waterbedHeight: lakeInfo.lakeBedHeight,
					isLake: true,
				}
			}
		}
		else {
			return {
				distFromWater: 10000,
				waterRadius: 0,
				waterHeight: 0,
				waterbedHeight: 0,
				isLake: false,
			}
		}
	}

	private getWaterInfo(x, z, needDownhillLakeInfo): CellWaterInfo {
		const cellX = Math.floor(x/this.gridSize)
		const cellZ = Math.floor(z/this.gridSize)

		const cellInfo = this.getCellInfo(cellX, cellZ)

		if (!cellInfo.uphills) {
			this.fillInUphillInfo(cellX, cellZ, cellInfo)
		}
		if (!cellInfo.downhill && !cellInfo.lakeInfo.lakeCreationHasBeenAttempted) {
			this.fillInLakeInfo(cellInfo)
			cellInfo.lakeInfo.lakeCreationHasBeenAttempted = true
		}
		if (needDownhillLakeInfo && cellInfo.downhill) {
			const downhill = this.getWaterInfo(cellInfo.downhill.origin[0], cellInfo.downhill.origin[1], false)
			cellInfo.downhill.lakeInfo = downhill.lakeInfo
		}

		return cellInfo
	}

	private getCellInfo(cellX, cellZ): CellWaterInfo {
		const cellId = `${cellX}|${cellZ}`
		if (cellId === this.lastReadInfo.lastId) {
			return this.lastReadInfo.info
		}

		if (this.waterBodyInfos.has(cellId)) {
			const riverInfo = this.waterBodyInfos.get(cellId)

			this.lastReadInfo.lastId = cellId
			this.lastReadInfo.info = riverInfo

			return riverInfo
		}

		const origin = this.getCellOrigin(cellX, cellZ)

		const closestBiomePts = this.worldGenerator.getClosestBiomes(origin[0], origin[1])
		const centerHeight = this.worldGenerator.getNoWaterHeightmapVal(origin[0], origin[1], closestBiomePts)
		const downhill = this.getDownhillFromCell(cellX, cellZ, centerHeight)

		const selfFlux = this.getRainfall(origin[0], origin[1])

		const cellInfo: CellWaterInfo = {
			origin,
			originNoWaterHeight: centerHeight,
			downhill,
			uphills: null,
			incomingFlux: null,
			selfFlux,

			lakeInfo: new LakeInfo(),
		}

		this.lastReadInfo.lastId = cellId
		this.lastReadInfo.info = cellInfo

		this.waterBodyInfos.set(cellId, cellInfo)
		// Prevent indefinite memory leak
		if (this.waterBodyInfos.size > 500) {
			this.waterBodyInfos.delete(this.waterBodyInfos.keys().next().value)
		}

		return cellInfo
	}

	fillInUphillInfo(cellX, cellZ, existingRiverInfo: CellWaterInfo) {
		const uphills = this.getUphillsFromCell(cellX, cellZ)

		let incomingFlux = 0
		for (const {incomingFlux: uphillsIncFlux, selfFlux} of uphills) {
			incomingFlux += uphillsIncFlux+selfFlux
		}

		existingRiverInfo.uphills = uphills
		existingRiverInfo.incomingFlux = incomingFlux
	}

	private getUphillsFromCell(cellX, cellZ): UphillsInfo {
		const uphills: UphillsInfo = []
		for (let dI = -1; dI <= 1; dI++) {
			for (let dK = -1; dK <= 1; dK++) {
				const cellI = cellX+dI
				const cellK = cellZ+dK

				const distFromCtr = Math.abs(dI)+Math.abs(dK)
				if (distFromCtr === 2 || distFromCtr === 0) {
					// Can't travel diagonally or to ourself
					continue
				}

				const checkInfo = this.getCellInfo(cellI, cellK)
				if (checkInfo.downhill?.cell[0] === cellX && checkInfo.downhill?.cell[1] === cellZ) {
					// We are the downhill

					if (!checkInfo.uphills) {
						this.fillInUphillInfo(cellI, cellK, checkInfo)
					}

					uphills.push({
						incomingFlux: checkInfo.incomingFlux,
						selfFlux: checkInfo.selfFlux,
						origin: checkInfo.origin,
						originNoWaterHeight: checkInfo.originNoWaterHeight,
					})
				}
			}
		}

		return uphills
	}

	private getDownhillFromCell(cellX, cellZ, cellOriginHeight): DownhillInfo {
		const downHill: DownhillInfo = {cell: [0, 0], origin: null, originNoWaterHeight: 0, lakeInfo: new LakeInfo()}
		let farthestDown = -1

		for (let dI = -1; dI <= 1; dI++) {
			for (let dK = -1; dK <= 1; dK++) {
				const cellI = cellX+dI
				const cellK = cellZ+dK

				const distFromCtr = Math.abs(dI)+Math.abs(dK)
				if (distFromCtr === 2 || distFromCtr === 0) {
					// Can't travel diagonally or to ourself
					continue
				}

				const checkCellOrigin = this.getCellOrigin(cellI, cellK)

				const closestBiomePts = this.worldGenerator.getClosestBiomes(checkCellOrigin[0], checkCellOrigin[1])
				const cellHeight = this.worldGenerator.getNoWaterHeightmapVal(checkCellOrigin[0], checkCellOrigin[1], closestBiomePts)

				const distDown = cellOriginHeight-cellHeight
				if (distDown > 0 && distDown > farthestDown) {
					farthestDown = distDown
					downHill.cell[0] = cellI
					downHill.cell[1] = cellK
					downHill.origin = checkCellOrigin
					downHill.originNoWaterHeight = cellHeight
				}
			}
		}

		if (farthestDown !== -1) {
			return downHill
		}

		return null
	}

	private getCellOrigin(cellX, cellZ) {
		const realCenterX = cellX*this.gridSize + this.gridSize/2
		const realCenterZ = cellZ*this.gridSize + this.gridSize/2

		const rand = new Rand(`${cellX}${cellZ}${this.seed}riverCell`, PRNG.mulberry32);
		const offsetX = Math.floor(rand.next()*this.cellCenterMaxOffset*2 - this.cellCenterMaxOffset)
		const offsetZ = Math.floor(rand.next()*this.cellCenterMaxOffset*2 - this.cellCenterMaxOffset)

		return [realCenterX+offsetX, realCenterZ+offsetZ]
	}

	private fillInLakeInfo(existingInfo: CellWaterInfo) {
		const lakeInfo = existingInfo.lakeInfo

		// const lakeCenter = existingInfo.origin
		const totalFlux = existingInfo.incomingFlux + existingInfo.selfFlux

		if (totalFlux < this.lakeSettings.noLakeFluxCutoff) {
			return
		}

		lakeInfo.hasLake = true

		const fluxFracOfMax = totalFlux/this.lakeSettings.maxRadiusAtFlux
		const radius = Math.ceil(fluxFracOfMax * this.lakeSettings.maxRadius)
		lakeInfo.lakeRadius = radius

		// const minSeenNoRiverHeightmapVal = 10000
		// for (let x = lakeCenter[0]-radius; x <= lakeCenter[0]+radius; x++) {
		// 	for (let z = lakeCenter[1]-radius; z <= lakeCenter[1]+radius; z++) {
		//
		// 	}
		// }

		lakeInfo.lakeWaterHeight = Math.floor(existingInfo.originNoWaterHeight-7)

		const lakeBedOffset = 4 + 0.35*radius
		lakeInfo.lakeBedHeight = Math.floor(lakeInfo.lakeWaterHeight - lakeBedOffset)
	}

	private getRainfall(x, z) {
		return 100
	}

	private getRiverbedHeightFromNoRiverHeight(noWaterHeight, flux) {
		return noWaterHeight - Math.ceil((0.1*flux))
	}
}
