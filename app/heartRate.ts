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
		private readonly $container: GroupElement,
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

		if (BodyPresenceSensor && app.permissions.granted('access_activity')) {
			const sensor = new BodyPresenceSensor();
			this.bodyPresenceSensor = sensor;

			sensor.addEventListener('activate', () => this.onBodyPresenceChanged(sensor));
			sensor.addEventListener('reading', () => this.onBodyPresenceChanged(sensor));
		} else {
			this._isOnBody = true;
		}

		configuration.onDidChange(this.onConfigurationChanged, this);

		this.onConfigurationChanged();
		this.updateState();
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
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (e?.key != null && e.key !== 'animateHeartRate' && e.key !== 'showRestingHeartRate') {
			return;
		}

		if (e?.key == null || e.key === 'showRestingHeartRate') {
			if (configuration.get('showRestingHeartRate')) {
				this.$restingRate.style.display = 'inline';
			} else {
				this.$restingRate.style.display = 'none';
			}
		}

		if (e?.key == null || e.key === 'animateHeartRate') {
			this.$icon.off.style.display = 'none';
			this.$icon.interval.style.display = 'none';
			this.$icon.pulse.style.display = 'none';

			this.stopAnimation();
		}

		if (display.on && !display.aodActive) {
			this.render();
		}
	}

	@log('HeartRateDisplay', {
		0: sensor => `on=${sensor.on}, aodActive=${sensor.aodActive}`
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
		let rate = this._rate;
		if (rate == null) {
			const timestamp = this.heartRateSensor?.activated ? this.heartRateSensor?.timestamp ?? 0 : 0;
			rate = timestamp > 0 ? this.heartRateSensor?.heartRate ?? 0 : 0;
		}

		this.$rate.text = `${rate > 0 ? rate : '--'}`;
		this.$restingRate.text = `${this._hasUserProfileAccess ? user.restingHeartRate ?? '' : ''}`;

		// const iconWidth = this.$icon.getBBox().width;
		const x = screenWidth - iconWidth - this.$rate.getBBox().width - 20;
		this.$rate.x = x;
		this.$restingRate.x = x - 10;

		const color = getHeartRateColor(rate);

		const $icon = this.$icon[configuration.get('animateHeartRate')];
		$icon.style.fill = color;
		$icon.style.display = 'inline';

		if (rate <= 0) {
			this.stopAnimation();
		} else {
			this.startAnimation(rate);
		}
	}

	private _animationHandle: number | undefined;
	private _animationInterval: number | undefined;

	@log('HeartRateDisplay', { 0: rate => `rate=${rate}` })
	private startAnimation(rate: number) {
		const animation = configuration.get('animateHeartRate');
		if (animation === 'off') return;

		// console.log(`HeartRateDisplay.startAnimation: rate=${rate}, animation=${animation}`);

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

		if (!display.on || display.aodActive) {
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
			if (display.on && !display.aodActive) {
				this.render();
			}
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

	if (rate <= 0) return 'fb-white';
	return heartRateColors[Math.max(Math.min(rate - 40, 160), 0)];
}

export const heartRateColors = [
	'#3399ff',
	'#3798ff',
	'#3c98ff',
	'#3f97ff',
	'#4397ff',
	'#4796ff',
	'#4a96ff',
	'#4d95ff',
	'#5195ff',
	'#5494ff',
	'#5794ff',
	'#5a93ff',
	'#5c92fe',
	'#5f92fe',
	'#6291fe',
	'#6591fe',
	'#6790fe',
	'#6a8ffd',
	'#6d8ffd',
	'#6f8efd',
	'#728efd',
	'#748dfc',
	'#768cfc',
	'#798cfc',
	'#7b8bfb',
	'#7d8afb',
	'#808afa',
	'#8289fa',
	'#8488fa',
	'#8687f9',
	'#8987f9',
	'#8b86f8',
	'#8d85f8',
	'#8f85f7',
	'#9184f7',
	'#9383f6',
	'#9582f5',
	'#9782f5',
	'#9981f4',
	'#9b80f4',
	'#9d7ff3',
	'#9f7ff2',
	'#a17ef1',
	'#a37df1',
	'#a57cf0',
	'#a77bef',
	'#a97bef',
	'#ab7aee',
	'#ad79ed',
	'#ae78ec',
	'#b077eb',
	'#b276ea',
	'#b476ea',
	'#b575e9',
	'#b774e8',
	'#b973e7',
	'#bb72e6',
	'#bc71e5',
	'#be70e4',
	'#bf6fe3',
	'#c16ee2',
	'#c36ee1',
	'#c46de0',
	'#c66cdf',
	'#c76bde',
	'#c96adc',
	'#ca69db',
	'#cc68da',
	'#cd67d9',
	'#cf66d8',
	'#d065d7',
	'#d264d6',
	'#d363d4',
	'#d462d3',
	'#d661d2',
	'#d760d1',
	'#d85fcf',
	'#da5ece',
	'#db5dcd',
	'#dc5ccb',
	'#de5bca',
	'#df5ac9',
	'#e059c7',
	'#e158c6',
	'#e257c5',
	'#e456c3',
	'#e555c2',
	'#e654c0',
	'#e753bf',
	'#e852be',
	'#e951bc',
	'#ea50bb',
	'#eb4fb9',
	'#ec4eb8',
	'#ed4db6',
	'#ee4cb5',
	'#ef4bb3',
	'#f04ab2',
	'#f149b0',
	'#f248ae',
	'#f247ad',
	'#f346ab',
	'#f444aa',
	'#f543a8',
	'#f642a7',
	'#f641a5',
	'#f740a3',
	'#f83fa2',
	'#f93ea0',
	'#f93e9e',
	'#fa3d9d',
	'#fa3c9b',
	'#fb3b99',
	'#fc3a98',
	'#fc3996',
	'#fd3894',
	'#fd3793',
	'#fe3691',
	'#fe358f',
	'#ff358e',
	'#ff348c',
	'#ff338a',
	'#ff3288',
	'#ff3287',
	'#ff3185',
	'#ff3083',
	'#ff3081',
	'#ff2f80',
	'#ff2e7e',
	'#ff2e7c',
	'#ff2d7a',
	'#ff2d79',
	'#ff2d77',
	'#ff2c75',
	'#ff2c73',
	'#ff2c72',
	'#ff2b70',
	'#ff2b6e',
	'#ff2b6c',
	'#ff2b6a',
	'#ff2b69',
	'#ff2b67',
	'#ff2b65',
	'#ff2b63',
	'#ff2b61',
	'#ff2b60',
	'#ff2c5e',
	'#ff2c5c',
	'#ff2c5a',
	'#ff2d58',
	'#ff2d57',
	'#ff2d55',
	'#ff2e53',
	'#ff2e51',
	'#ff2f4f',
	'#ff304d',
	'#ff304b',
	'#ff314a',
	'#ff3248',
	'#ff3246',
	'#ff3344'
];
