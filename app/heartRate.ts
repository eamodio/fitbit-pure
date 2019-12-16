import { me as app } from 'appbit';
import { me as device } from 'device';
import { display, Display } from 'display';
import { BodyPresenceSensor } from 'body-presence';
import { HeartRateSensor } from 'heart-rate';
import { user } from 'user-profile';
import { ConfigChanged, configuration } from './configuration';
import { debounce, defer, log } from '../common/system';

if (device.screen == null) {
	(device as any).screen = { width: 348, height: 250 };
}

const iconWidth = 32;
const screenWidth = device.screen.width;

export class HeartRateDisplay {
	private readonly bodyPresenceSensor: BodyPresenceSensor | undefined;
	private readonly heartRateSensor: HeartRateSensor | undefined;

	private readonly _hasUserProfileAccess: boolean;
	private _isOnBody: boolean | undefined;
	private _rate: number | undefined;

	constructor(
		private readonly $container: GraphicsElement,
		private readonly $icon: { off: GraphicsElement; interval: GraphicsElement; pulse: GraphicsElement },
		private readonly $rate: TextElement,
		private readonly $restingRate: TextElement
	) {
		this._hasUserProfileAccess = app.permissions.granted('access_user_profile');

		if (HeartRateSensor == null || !app.permissions.granted('access_heart_rate')) {
			this.$container.style.display = 'none';
			return;
		}

		const sensor = new HeartRateSensor({ frequency: 5 });
		this.heartRateSensor = sensor;

		sensor.addEventListener('activate', () => this.onHeartRateChanged(sensor));
		sensor.addEventListener('reading', () => this.onHeartRateChanged(sensor));

		display.addEventListener('change', () => this.onDisplayChanged(display));

		if (BodyPresenceSensor) {
			const sensor = new BodyPresenceSensor();
			this.bodyPresenceSensor = sensor;

			sensor.addEventListener('activate', () => this.onBodyPresenceChanged(sensor));
			sensor.addEventListener('reading', () => this.onBodyPresenceChanged(sensor));
		} else {
			this._isOnBody = true;
		}

		configuration.onDidChange(this.onConfigurationChanged, this);

		this.updateState();
		this.render();
	}

	@log('HeartRateDisplay', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (!display.on && e?.key != null && e.key !== 'animateHeartRate' && e.key !== 'showRestingHeartRate') {
			return;
		}

		if (e?.key == null || e.key === 'animateHeartRate') {
			this.$icon.off.style.display = 'none';
			this.$icon.interval.style.display = 'none';
			this.$icon.pulse.style.display = 'none';

			this.stopAnimation();
		}

		this.render();
	}

	@debounce(250)
	@log('HeartRateDisplay', {
		0: sensor => `present=${sensor.present}`
	})
	private onBodyPresenceChanged(sensor: BodyPresenceSensor) {
		this._isOnBody = sensor.present ?? undefined;
		this.updateState();
	}

	@log('HeartRateDisplay', {
		0: sensor => `on=${sensor.on}`
	})
	private onDisplayChanged(sensor: Display) {
		this.updateState();
	}

	@debounce(100)
	@log('HeartRateDisplay', {
		0: sensor => `heartRate=${sensor.heartRate}`
	})
	private onHeartRateChanged(sensor: HeartRateSensor) {
		if (this._rate === sensor.heartRate) return;

		this._rate = sensor.heartRate ?? undefined;
		this.render();
	}

	@defer()
	@log('HeartRateDisplay')
	private render() {
		const rate = this._rate ?? 0;

		this.$rate.text = `${rate > 0 ? rate : '--'}`;

		// const iconWidth = this.$icon.getBBox().width;
		let x = screenWidth - iconWidth - this.$rate.getBBox().width - 20;
		this.$rate.x = x;

		if (configuration.get('showRestingHeartRate') && this._hasUserProfileAccess && user.restingHeartRate != null) {
			this.$restingRate.text = `${user.restingHeartRate ?? ''}`;

			x -= 10;
			this.$restingRate.x = x;

			x -= this.$restingRate.getBBox().width + 10;
		} else {
			this.$restingRate.text = '';
		}

		const color = getHeartRateColor(rate);

		const $icon = this.$icon[configuration.get('animateHeartRate')];
		$icon.style.fill = color;
		$icon.style.display = 'inline';

		this.startAnimation(rate);
	}

	private _animationHandle: number | undefined;
	private _animationInterval: number | undefined;

	@log('HeartRateDisplay', { 0: rate => `rate=${rate}` })
	private startAnimation(rate: number) {
		if (rate <= 0) return;

		const animation = configuration.get('animateHeartRate');

		// console.log(`HeartRateDisplay.startAnimation: rate=${rate}, animation=${animation}`);

		if (animation === 'off') return;

		const $icon = this.$icon[animation];

		if (animation === 'pulse') {
			const interval = Math.round(1000 / (rate / 60) / 50) * 50;
			if (interval === this._animationInterval) return;

			this._animationInterval = interval;
			if (this._animationHandle !== undefined) {
				clearInterval(this._animationHandle);
			}
			this._animationHandle = setInterval(() => $icon.animate('enable'), interval);
		} else {
			if (this._animationInterval === 1000) return;

			this._animationInterval = 1000;
			$icon.animate('enable');
		}
	}

	@log('HeartRateDisplay')
	private stopAnimation() {
		if (this._animationHandle !== undefined) {
			clearInterval(this._animationHandle);
			this._animationHandle = undefined;
		}
		this._animationInterval = undefined;

		this.$icon.interval.animate('disable');
		this.$icon.pulse.animate('disable');
	}

	private updateState() {
		if (this.heartRateSensor == null) return;

		if (!display.on) {
			// console.log(`HeartRateDisplay.updateState: display.on=${display.on}; stopping sensors...`);

			this.stopAnimation();

			this.heartRateSensor?.stop();
			this.bodyPresenceSensor?.stop();

			this._isOnBody = undefined;
			this._rate = undefined;

			return;
		}

		if (this.bodyPresenceSensor != null && !this.bodyPresenceSensor.activated) {
			// console.log(`HeartRateDisplay.updateState: display.on=${display.on}; starting body presence sensor...`);

			this.bodyPresenceSensor.start();

			return;
		}

		if (this._isOnBody) {
			if (!this.heartRateSensor.activated) {
				// console.log(
				// 	`HeartRateDisplay.updateState: display.on=${display.on}, onBody=${this._isOnBody}; starting heart rate sensor...`
				// );

				this.heartRateSensor.start();
			} else {
				// console.log(`HeartRateDisplay.updateState: display.on=${display.on}, onBody=${this._isOnBody}`);
			}
		} else {
			if (this.heartRateSensor.activated) {
				// console.log(
				// 	`HeartRateDisplay.updateState: display.on=${display.on}, onBody=${this._isOnBody}; stopping heart rate sensor...`
				// );

				this.heartRateSensor.stop();
			} else {
				// console.log(`HeartRateDisplay.updateState: display.on=${display.on}, onBody=${this._isOnBody}`);
			}

			this._rate = undefined;
			this.render();
		}
	}
}

function getHeartRateColor(rate: number) {
	// if (rate === 0) return heartRateZoneColorMap['unknown'];

	// let zone: ReturnType<UserProfile['heartRateZone']> | 'resting' = user.heartRateZone(rate) ?? 'out-of-range';

	// const restingHeartRate = user.restingHeartRate ?? 0;
	// if (rate <= Math.round(restingHeartRate + restingHeartRate * 0.1) && zone === 'out-of-range') {
	// 	zone = 'resting';
	// }
	// return heartRateZoneColorMap[zone];
	return heartRateColors[Math.max(Math.min(rate - 20, 200), 0)];
}

export const heartRateColors = [
	'#3399ff',
	'#3799ff',
	'#3a98ff',
	'#3d98ff',
	'#4097ff',
	'#4397ff',
	'#4696ff',
	'#4996ff',
	'#4b96ff',
	'#4e95ff',
	'#5195ff',
	'#5394ff',
	'#5594ff',
	'#5893ff',
	'#5a93ff',
	'#5c92fe',
	'#5f92fe',
	'#6191fe',
	'#6391fe',
	'#6591fe',
	'#6790fe',
	'#6990fd',
	'#6b8ffd',
	'#6e8ffd',
	'#708efd',
	'#728efd',
	'#738dfc',
	'#758cfc',
	'#778cfc',
	'#798bfc',
	'#7b8bfb',
	'#7d8afb',
	'#7f8afb',
	'#8189fa',
	'#8289fa',
	'#8488fa',
	'#8688f9',
	'#8887f9',
	'#8a86f8',
	'#8b86f8',
	'#8d85f8',
	'#8f85f7',
	'#9084f7',
	'#9284f6',
	'#9483f6',
	'#9582f5',
	'#9782f5',
	'#9981f4',
	'#9a81f4',
	'#9c80f3',
	'#9d7ff3',
	'#9f7ff2',
	'#a07ef2',
	'#a27df1',
	'#a47df1',
	'#a57cf0',
	'#a77cef',
	'#a87bef',
	'#aa7aee',
	'#ab7aee',
	'#ad79ed',
	'#ae78ec',
	'#af78ec',
	'#b177eb',
	'#b276ea',
	'#b476ea',
	'#b575e9',
	'#b674e8',
	'#b873e7',
	'#b973e7',
	'#bb72e6',
	'#bc71e5',
	'#bd71e4',
	'#be70e3',
	'#c06fe3',
	'#c16ee2',
	'#c26ee1',
	'#c46de0',
	'#c56cdf',
	'#c66cde',
	'#c76bde',
	'#c96add',
	'#ca69dc',
	'#cb69db',
	'#cc68da',
	'#cd67d9',
	'#cf66d8',
	'#d065d7',
	'#d165d6',
	'#d264d5',
	'#d363d4',
	'#d462d3',
	'#d562d2',
	'#d661d1',
	'#d760d0',
	'#d85fcf',
	'#d95ece',
	'#db5ecd',
	'#dc5dcc',
	'#dd5ccb',
	'#de5bca',
	'#df5ac9',
	'#e05ac8',
	'#e059c7',
	'#e158c6',
	'#e257c5',
	'#e356c4',
	'#e455c2',
	'#e555c1',
	'#e654c0',
	'#e753bf',
	'#e852be',
	'#e951bd',
	'#e950bc',
	'#ea50ba',
	'#eb4fb9',
	'#ec4eb8',
	'#ed4db7',
	'#ed4cb6',
	'#ee4bb4',
	'#ef4bb3',
	'#f04ab2',
	'#f049b1',
	'#f148af',
	'#f247ae',
	'#f247ad',
	'#f346ac',
	'#f445aa',
	'#f444a9',
	'#f543a8',
	'#f642a7',
	'#f642a5',
	'#f741a4',
	'#f740a3',
	'#f83fa1',
	'#f93ea0',
	'#f93e9f',
	'#fa3d9d',
	'#fa3c9c',
	'#fb3b9b',
	'#fb3b99',
	'#fc3a98',
	'#fc3997',
	'#fc3895',
	'#fd3894',
	'#fd3793',
	'#fe3691',
	'#fe3690',
	'#fe358f',
	'#ff348d',
	'#ff348c',
	'#ff338a',
	'#ff3389',
	'#ff3288',
	'#ff3186',
	'#ff3185',
	'#ff3084',
	'#ff3082',
	'#ff2f81',
	'#ff2f7f',
	'#ff2e7e',
	'#ff2e7d',
	'#ff2e7b',
	'#ff2d7a',
	'#ff2d78',
	'#ff2d77',
	'#ff2c75',
	'#ff2c74',
	'#ff2c73',
	'#ff2c71',
	'#ff2b70',
	'#ff2b6e',
	'#ff2b6d',
	'#ff2b6b',
	'#ff2b6a',
	'#ff2b69',
	'#ff2b67',
	'#ff2b66',
	'#ff2b64',
	'#ff2b63',
	'#ff2b61',
	'#ff2b60',
	'#ff2c5f',
	'#ff2c5d',
	'#ff2c5c',
	'#ff2c5a',
	'#ff2d59',
	'#ff2d57',
	'#ff2d56',
	'#ff2e54',
	'#ff2e53',
	'#ff2e51',
	'#ff2f50',
	'#ff2f4e',
	'#ff304d',
	'#ff304b',
	'#ff314a',
	'#ff3148',
	'#ff3247',
	'#ff3246',
	'#ff3344'
];
