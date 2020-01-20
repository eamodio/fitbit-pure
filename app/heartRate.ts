import { me as app } from 'appbit';
import { me as device } from 'device';
import { display, Display } from 'display';
import document from 'document';
import { BodyPresenceSensor } from 'body-presence';
import { HeartRateSensor } from 'heart-rate';
import { user } from 'user-profile';
import { AppManager } from './appManager';
import { ConfigChanged, configuration } from './configuration';
import { debounce, defer, log } from '../common/system';

// if (device.screen == null) {
// 	(device as any).screen = { width: 348, height: 250 };
// }

const iconWidth = 32;
const screenWidth = device.screen.width;

export class HeartRateDisplay {
	private readonly bodyPresenceSensor: BodyPresenceSensor | undefined;
	private readonly heartRateSensor: HeartRateSensor | undefined;

	private $icon!: GraphicsElement;

	private readonly _hasUserProfileAccess: boolean;
	private _isOnBody: boolean | undefined;
	private _rate: number | undefined;

	constructor(
		private readonly appManager: AppManager,
		private readonly $rate: TextElement,
		private readonly $restingRate: TextElement
	) {
		this._hasUserProfileAccess = app.permissions.granted('access_user_profile');

		if (HeartRateSensor == null || !app.permissions.granted('access_heart_rate')) {
			document.getElementById<ContainerElement>('heartrate-display')!.style.display = 'none';

			return;
		}

		const sensor = new HeartRateSensor({ frequency: 5 });
		this.heartRateSensor = sensor;

		sensor.addEventListener('activate', () => this.onHeartRateChanged(sensor));
		sensor.addEventListener('reading', () => this.onHeartRateChanged(sensor));

		appManager.onDidChangeDisplay(this.onDisplayChanged, this);
		appManager.onDidChangeEditMode(this.onEditModeChanged, this);

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

		if (e?.key == null || e.key === 'animateHeartRate') {
			if (e?.key === 'animateHeartRate') {
				for (const $el of document.getElementsByClassName<GraphicsElement>('heartrate-icon')) {
					$el.animate('disable');
					$el.style.display = 'none';
				}
			}

			this.$icon = document.getElementById<GraphicsElement>(
				`heartrate-icon--${configuration.get('animateHeartRate')}`
			)!;

			this.stopAnimation();
		}

		if (e?.key == null || e.key === 'showRestingHeartRate') {
			if (configuration.get('showRestingHeartRate')) {
				this.$restingRate.style.display = 'inline';
			} else {
				this.$restingRate.style.display = 'none';
			}
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

	@log('TimeDisplay')
	private onEditModeChanged(editing: boolean) {
		this.render();
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
		let rate = this.appManager.editing ? 0 : this._rate;
		if (rate == null) {
			const timestamp = this.heartRateSensor?.activated ? this.heartRateSensor?.timestamp ?? 0 : 0;
			rate = timestamp > 0 ? this.heartRateSensor?.heartRate ?? 0 : 0;
		}

		this.$rate.text = `${rate > 0 ? rate : '--'}`;
		this.$restingRate.text = `${
			this._hasUserProfileAccess ? (this.appManager.editing ? '00' : user.restingHeartRate) ?? '' : ''
		}`;

		// const iconWidth = this.$icon.getBBox().width;
		const x = screenWidth - iconWidth - this.$rate.getBBox().width - 20;
		this.$rate.x = x;
		this.$restingRate.x = x - 10;

		this.$icon.style.display = 'inline';

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

		if (animation === 'pulse') {
			const interval = Math.round(1000 / (rate / 60) / 50) * 50;
			if (interval === this._animationInterval) return;

			this._animationInterval = interval;
			if (this._animationHandle !== undefined) {
				clearInterval(this._animationHandle);
			}
			this._animationHandle = setInterval(() => this.$icon.animate('enable'), interval);
		} else {
			if (this._animationInterval === 1000) return;

			this._animationInterval = 1000;
			this.$icon.animate('enable');
		}
	}

	@log('HeartRateDisplay')
	private stopAnimation() {
		if (this._animationHandle !== undefined) {
			clearInterval(this._animationHandle);
			this._animationHandle = undefined;
		}
		this._animationInterval = undefined;

		this.$icon.animate('disable');
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
