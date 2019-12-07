// import { me as device } from 'device';
// import { display, Display } from 'display';
// // import * as C2S from 'canvas2svg';
// import document from 'document';

// function randomBetween(min: number, max: number) {
// 	return min + Math.random() * (max - min);
// }

// class Snowflake {
// 	alpha = 0;
// 	radius = 0;
// 	x = 0;
// 	y = 0;

// 	private _vx = 0;
// 	private _vy = 0;

// 	constructor() {
// 		this.reset();
// 	}

// 	reset() {
// 		this.alpha = randomBetween(0.1, 0.9);
// 		this.radius = randomBetween(1, 4);
// 		this.x = randomBetween(0, device.screen.width);
// 		this.y = randomBetween(0, -device.screen.height);
// 		this._vx = randomBetween(-3, 3);
// 		this._vy = randomBetween(2, 5);
// 	}

// 	update() {
// 		this.x += this._vx;
// 		this.y += this._vy;

// 		if (this.y + this.radius > device.screen.height) {
// 			this.reset();
// 		}
// 	}
// }

// export class Snow {
// 	snowing = false;

// 	private readonly $snow: Element;
// 	private readonly _ctx: any;
// 	private _height: number = 0;
// 	private _width: number = 0;
// 	private readonly _snowflakes: Snowflake[] = [];

// 	private readonly _clearBound: () => void;
// 	private readonly _updateBound: () => void;

// 	constructor() {
// 		this._clearBound = this.clear.bind(this);
// 		this._updateBound = this.update.bind(this);

// 		this.$snow = document.getElementById('snow')!;
// 		// this._ctx = new C2S(device.screen.width, device.screen.height);

// 		// const trigger = document.querySelector('.snow__trigger');
// 		// if (trigger) {
// 		// 	trigger.addEventListener('click', () => this.onToggle());
// 		// }

// 		display.addEventListener('change', () => this.onDisplayChanged(display));
// 		this.onDisplayChanged(display);

// 		// window.addEventListener('resize', () => this.onResize());
// 		this.onResize();

// 		// this.onToggle();
// 	}

// 	private onDisplayChanged(sensor: Display) {
// 		this.snowing = sensor.on;

// 		if (this.snowing) {
// 			this.createSnowflakes();
// 			requestAnimationFrame(this._updateBound);
// 		}
// 	}

// 	// onToggle() {
// 	// 	this.snowing = !this.snowing;
// 	// 	if (this.snowing) {
// 	// 		this.createSnowflakes();
// 	// 		requestAnimationFrame(this._updateBound);
// 	// 	}
// 	// }

// 	onResize() {
// 		this._height = device.screen.height;
// 		this._width = device.screen.width;
// 	}

// 	clear() {
// 		this._ctx.clearRect(0, 0, this._width, this._height);
// 		this._snowflakes.length = 0;
// 	}

// 	createSnowflakes() {
// 		const flakes = device.screen.width / 4;

// 		for (let i = 0; i < flakes; i++) {
// 			this._snowflakes.push(new Snowflake());
// 		}
// 	}

// 	update() {
// 		this._ctx.clearRect(0, 0, this._width, this._height);

// 		const color = '#fff';

// 		for (const flake of this._snowflakes) {
// 			flake.update();

// 			this._ctx.save();
// 			this._ctx.fillStyle = color;
// 			this._ctx.beginPath();
// 			this._ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
// 			this._ctx.closePath();
// 			this.$snow.style.opacity = flake.alpha;
// 			this._ctx.globalAlpha = flake.alpha;
// 			this._ctx.fill();
// 			this._ctx.restore();
// 		}

// 		requestAnimationFrame(this.snowing ? this._updateBound : this._clearBound);
// 	}
// }
