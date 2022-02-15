
export class VoronoiGenerator {

}

function circumcenter(a, b, c) {
	const ad = a[0] * a[0] + a[1] * a[1];
	const bd = b[0] * b[0] + b[1] * b[1];
	const cd = c[0] * c[0] + c[1] * c[1];
	const D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
	return [
		1 / D * (ad * (b[1] - c[1]) + bd * (c[1] - a[1]) + cd * (a[1] - b[1])),
		1 / D * (ad * (c[0] - b[0]) + bd * (a[0] - c[0]) + cd * (b[0] - a[0])),
	];
}