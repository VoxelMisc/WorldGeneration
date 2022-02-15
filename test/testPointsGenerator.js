const { PointsGenerator } = require('../dist/bundle').default
const WorldGeneration = require('../dist/bundle')

function test(minDist, cellX, cellZ) {
    const pointsGenerator = new PointsGenerator(minDist)
    const pointsGenerator2 = new PointsGenerator(minDist)

    const pts = pointsGenerator.getCellPoints(cellX, cellZ)
    const pts2 = pointsGenerator2.getCellPoints(cellX, cellZ)

    console.assert(pts.length === pts2.length)

    for (let i = 0; i < pts.length; i++) {
        console.assert(pts[i][0] === pts2[i][0] && pts[i][1] === pts2[i][1])
    }

    console.log(pts, pts2, pts.length)
}


test(50, 4, 4)


console.log("TestPointsGenerator passed")
