function adjustLight(color: number, amount: number) {
	const cc = color + amount;
	const c = amount < 0 ? (cc < 0 ? 0 : cc) : cc > 255 ? 255 : cc;

	return Math.round(c);
}

export function darken(color: [number, number, number], percentage: number) {
	return lighten(color, -percentage);
}

export function lighten([r, g, b]: [number, number, number], percentage: number) {
	const amount = (255 * percentage) / 100;
	return rgbToHex([adjustLight(r, amount), adjustLight(g, amount), adjustLight(b, amount)]);
}

function rgbToHex(color: [number, number, number]): string {
	return `#${color
		.map(c => {
			const hex = c.toString(16);
			return hex.length < 2 ? `0${hex}` : hex;
		})
		.join('')}`;
}

export const heartRateZoneColorMap: { [key: string]: string } = {
	unknown: darken([255, 255, 255], 25),
	resting: rgbToHex([51, 153, 255]),
	'out-of-range': darken([255, 255, 255], 25),
	'fat-burn': rgbToHex([58, 219, 118]),
	'below-custom': rgbToHex([58, 219, 118]),
	cardio: rgbToHex([255, 140, 25]),
	custom: rgbToHex([255, 140, 25]),
	peak: rgbToHex([255, 51, 68]),
	'above-custom': rgbToHex([255, 51, 68])
};

// function generateColorGradient(
// 	startColor: [number, number, number],
// 	endColor: [number, number, number],
// 	steps: number
// ): string[] {
// 	const stepFactor = 1 / (steps - 1);
// 	const colors: string[] = [];

// 	for (let i = 0; i < steps; i++) {
// 		colors.push(
// 			rgbToHex(
// 				startColor.map((c, ci) => Math.round(c + stepFactor * i * (endColor[ci] - c))) as [
// 					number,
// 					number,
// 					number
// 				]
// 			)
// 		);
// 	}

// 	return colors;
// }

// const colors = generateColorGradient([255, 255, 255], [255, 0, 0], 201);
// const colors = generateColorGradient([10, 96, 246], [246, 106, 10], 200);
