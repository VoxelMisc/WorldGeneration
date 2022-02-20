const { PointsGenerator } = require('../dist/bundle').default
const WorldGeneration = require('../dist/bundle')

test(50, 4, 4)
testNearestNeighbours()

function test(minDist, cellX, cellZ) {
    const pointsGenerator = new PointsGenerator(minDist, false, true)
    const pointsGenerator2 = new PointsGenerator(minDist, true, true)

    const pts = pointsGenerator.getCell(cellX, cellZ).points
    const pts2 = pointsGenerator2.getCell(cellX, cellZ).points

    console.assert(pts.length === pts2.length)

    for (let i = 0; i < pts.length; i++) {
        console.assert(pts[i][0] === pts2[i][0] && pts[i][1] === pts2[i][1])
    }
}


function testNearestNeighbours() {
    const pointsGenerator = new PointsGenerator(3, false, true)
    const kClosestResult = pointsGenerator.getKClosestPointsWithWeights(-500, 1500, 5).map(pt => `${pt[0]}|${pt[1]}`)
    // console.log("kClosest", kClosestResult)

    console.assert(kClosestResult.length === 5, "there are 5 kClosest")
    const fiveClosest = [
        [-500, 1498],
        [-503, 1499],
        [-501, 1503],
        [-497, 1498],
        [-496, 1502]
    ].map(pt => `${pt[0]}|${pt[1]}`)

    for (let pt of kClosestResult) {
        console.assert(fiveClosest.includes(pt), "Results must contain same points")
    }

    // console.log(kClosestResult, "\n", fiveClosest)
}


console.log("TestPointsGenerator passed")
