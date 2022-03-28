import {WorldGenerator} from './index'
import Rand, {PRNG} from 'rand-seed'
import {distToLineSegmentWithInfo} from './util'

type RiverInfo = {
	origin: number[],
	originNoRiverHeight: number,
	downhill: DownhillInfo | null,
	uphills: UphillsInfo,
	incomingFlux: number,
	selfFlux: number,

	lakeWaterHeight: number,
	lakeBedHeight: number,
	lakeRadius: number,
	hasLake: boolean,
	lakeCreationHasBeenAttempted: boolean,
}

type UphillsInfo = {
	incomingFlux: number,
	selfFlux: number,
	origin: number[],
	originNoRiverHeight: number,
}[]

type DownhillInfo = {
	cell: number[],
	origin: number[],
	originNoRiverHeight: number,
}

export class RiverGenerator {
	worldGenerator: WorldGenerator

	// Todo: makes sense to increase in final game
	gridSize: number = 192

	cellCenterMaxOffset: number

	maxRiverSettings = {
		width: 20,
		atFlux: 1000,
	}

	lakeSettings = {
		maxRadius: 40,
		maxRadiusAtFlux: 2000,

		noLakeFluxCutoff: 50,
	}

	widthOffset = 2

	seed: string

	private riverInfos = new Map()
	private lastReadInfo = {lastId: null, info: null}

	constructor(worldGenerator: WorldGenerator, seed: string, heightmapPerturbAmplitude: number, needOutsideRiverDist: number) {
		this.worldGenerator = worldGenerator

		// Don't generate near edge of cell to ensure we always find out about the river we are near enough to to be modifying terrain
		// (heightmapPerturbAmplitude is only included so as to prevent thrashing between cells while generating a single chunk)
		const cellCenterDistFromEdge = Math.max(this.lakeSettings.maxRadius, this.maxRiverSettings.width/2 + this.widthOffset)
			+ needOutsideRiverDist + heightmapPerturbAmplitude

		this.cellCenterMaxOffset = this.gridSize/2 - cellCenterDistFromEdge
		console.log("Dist from edge", cellCenterDistFromEdge, this.cellCenterMaxOffset)

		this.seed = seed
	}

	getInfoNeededForRiverGen(x, z): {distFromRiver: number, riverRadius: number, riverHeight: number, riverbedHeight: number} {
		const pt = [x, z]

		const cellRiverInfo = this.getRiverInfo(x, z)

		let closestDistToRiverEdge = 10000
		let closestDistToRiverCenter = 0
		let closestRiverWidth = 0

		let closestFluxFrac = 0

		let fracAlongRiver = 0
		let uphillNoRiverHeight = 0
		let downhillNoRiverHeight = 0

		if (cellRiverInfo.downhill) {
			const {dist: distFlt, fracAlong} = distToLineSegmentWithInfo(pt, cellRiverInfo.origin, cellRiverInfo.downhill.origin)
			closestDistToRiverCenter = Math.floor(distFlt)

			let flux = cellRiverInfo.incomingFlux
			flux += fracAlong*cellRiverInfo.selfFlux

			closestFluxFrac = Math.min(1, flux/this.maxRiverSettings.atFlux)
			closestRiverWidth = Math.max(1, Math.ceil(closestFluxFrac*this.maxRiverSettings.width))

			closestDistToRiverEdge = closestDistToRiverCenter-(closestRiverWidth/2)

			fracAlongRiver = fracAlong
			uphillNoRiverHeight = cellRiverInfo.originNoRiverHeight
			downhillNoRiverHeight = cellRiverInfo.downhill.originNoRiverHeight
		}

		for (const uphill of cellRiverInfo.uphills) {
			const {dist: distFlt, fracAlong} = distToLineSegmentWithInfo(pt, uphill.origin, cellRiverInfo.origin)
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

				fracAlongRiver = fracAlong
				uphillNoRiverHeight = uphill.originNoRiverHeight
				downhillNoRiverHeight = cellRiverInfo.originNoRiverHeight
			}
		}

		if (closestDistToRiverEdge !== 10000) {
			let lerpNoRiverHeight = Math.floor(downhillNoRiverHeight + (uphillNoRiverHeight-downhillNoRiverHeight)*(1-fracAlongRiver))
			if (cellRiverInfo.hasLake) {

			}
			else {

			}

			const riverDown = 3
			const riverHeight = lerpNoRiverHeight-riverDown
			const riverbedHeight = riverHeight-(Math.ceil(20*closestFluxFrac)+2)

			const riverRadius = (closestRiverWidth+this.widthOffset)/2

			return {
				distFromRiver: closestDistToRiverCenter,
				riverRadius,
				riverHeight,
				riverbedHeight,
				// closestPoint,
			}
		}
		else {
			return {
				distFromRiver: 10000,
				riverRadius: 0,
				riverHeight: 0,
				riverbedHeight: 0,
				// closestPoint,
			}
		}
	}

	private getRiverInfo(x, z): RiverInfo {
		const cellX = Math.floor(x/this.gridSize)
		const cellZ = Math.floor(z/this.gridSize)

		const cellInfo = this.getCellInfo(cellX, cellZ)

		if (!cellInfo.uphills) {
			this.fillInUphillInfo(cellX, cellZ, cellInfo)
		}
		if (!cellInfo.downhill && !cellInfo.lakeCreationHasBeenAttempted) {
			this.fillInLakeInfo(cellX, cellZ, cellInfo)
			cellInfo.lakeCreationHasBeenAttempted = true
		}

		return cellInfo
	}

	private getCellInfo(cellX, cellZ): RiverInfo {
		const cellId = `${cellX}|${cellZ}`
		if (cellId === this.lastReadInfo.lastId) {
			return this.lastReadInfo.info
		}

		if (this.riverInfos.has(cellId)) {
			const riverInfo = this.riverInfos.get(cellId)

			this.lastReadInfo.lastId = cellId
			this.lastReadInfo.info = riverInfo

			return riverInfo
		}

		const origin = this.getCellOrigin(cellX, cellZ)

		const closestBiomePts = this.worldGenerator.getClosestBiomes(origin[0], origin[1])
		const centerHeight = this.worldGenerator.getNoRiverHeightmapVal(origin[0], origin[1], closestBiomePts)
		const downhill = this.getDownhillFromCell(cellX, cellZ, centerHeight)

		const selfFlux = this.getRainfall(origin[0], origin[1])

		const cellInfo: RiverInfo = {
			origin,
			originNoRiverHeight: centerHeight,
			downhill,
			uphills: null,
			incomingFlux: null,
			selfFlux,

			hasLake: false,
			lakeCreationHasBeenAttempted: false,
			lakeWaterHeight: 0,
			lakeRadius: 0,
			lakeBedHeight: 0
		}

		this.lastReadInfo.lastId = cellId
		this.lastReadInfo.info = cellInfo

		this.riverInfos.set(cellId, cellInfo)
		// Prevent indefinite memory leak
		if (this.riverInfos.size > 500) {
			this.riverInfos.delete(this.riverInfos.keys().next().value)
		}

		return cellInfo
	}

	fillInUphillInfo(cellX, cellZ, existingRiverInfo: RiverInfo) {
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
						originNoRiverHeight: checkInfo.originNoRiverHeight,
					})
				}
			}
		}

		return uphills
	}

	private getDownhillFromCell(cellX, cellZ, cellOriginHeight): DownhillInfo {
		const downHill: DownhillInfo = {cell: [0, 0], origin: null, originNoRiverHeight: 0}
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
				const cellHeight = this.worldGenerator.getNoRiverHeightmapVal(checkCellOrigin[0], checkCellOrigin[1], closestBiomePts)

				const distDown = cellOriginHeight-cellHeight
				if (distDown > 0 && distDown > farthestDown) {
					farthestDown = distDown
					downHill.cell[0] = cellI
					downHill.cell[1] = cellK
					downHill.origin = checkCellOrigin
					downHill.originNoRiverHeight = cellHeight
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

	private fillInLakeInfo(cellX, cellZ, existingRiverInfo: RiverInfo) {
		// const lakeCenter = existingRiverInfo.origin
		const totalFlux = existingRiverInfo.incomingFlux + existingRiverInfo.selfFlux

		if (totalFlux < this.lakeSettings.noLakeFluxCutoff) {
			return
		}

		existingRiverInfo.hasLake = true

		const fluxFracOfMax = totalFlux/this.lakeSettings.maxRadiusAtFlux
		const radius = Math.ceil(fluxFracOfMax * this.lakeSettings.maxRadius)
		existingRiverInfo.lakeRadius = radius

		// const minSeenNoRiverHeightmapVal = 10000
		// for (let x = lakeCenter[0]-radius; x <= lakeCenter[0]+radius; x++) {
		// 	for (let z = lakeCenter[1]-radius; z <= lakeCenter[1]+radius; z++) {
		//
		// 	}
		// }

		existingRiverInfo.lakeWaterHeight = existingRiverInfo.originNoRiverHeight-7

		const lakeBedOffset = 3 + 0.25*radius
		existingRiverInfo.lakeBedHeight = existingRiverInfo.lakeWaterHeight - lakeBedOffset
	}

	private getRainfall(x, z) {
		return 100
	}

	private getRiverbedHeightFromNoRiverHeight(noRiverHeight, flux) {
		return noRiverHeight - Math.ceil((0.1*flux))
	}
}
