import { me as app } from 'appbit';
import { me as device } from 'device';
import { display, Display } from 'display';
import { BodyPresenceSensor } from 'body-presence';
import { HeartRateSensor } from 'heart-rate';
import { user, UserProfile } from 'user-profile';
import { heartRateZoneColorMap } from './colors';
import { configuration } from './configuration';

if (device.screen == null) {
	(device as any).screen = { width: 348, height: 250 };
}

export class HeartRateDisplay {
	private readonly bodyPresenceSensor: BodyPresenceSensor | undefined;
	private readonly heartRateSensor: HeartRateSensor | undefined;

	private _isDisplayOn: boolean = false;
	private _isOnBody: boolean | undefined;
	private _rate: number | undefined;

	constructor(
		private readonly $container: GraphicsElement,
		private readonly $icon: ImageElement,
		private readonly $rate: TextElement,
		private readonly $restingRate: TextElement,
		private readonly $group: GroupElement
	) {
		if (HeartRateSensor == null || !app.permissions.granted('access_heart_rate')) {
			this.$container.style.display = 'none';
			return;
		}

		const sensor = new HeartRateSensor({ frequency: 1 });
		sensor.addEventListener('reading', e => this.onHeartRateChanged(sensor));
		this.heartRateSensor = sensor;

		display.addEventListener('change', () => this.onDisplayChanged(display));
		this.onDisplayChanged(display, true);

		if (BodyPresenceSensor) {
			const sensor = new BodyPresenceSensor(/*{ frequency: 1 }*/);
			sensor.addEventListener('reading', e => this.onBodyPresenceChanged(sensor));
			this.bodyPresenceSensor = sensor;
		} else {
			this._isOnBody = true;
		}

		this.updateState();
	}

	private onBodyPresenceChanged(sensor: BodyPresenceSensor, silent: boolean = false) {
		// console.log(`HeartRateDisplay.onBodyPresenceChanged: present=${sensor.present}`);

		this._isOnBody = sensor.present ?? undefined;
		if (silent) return;

		this.updateState();
	}

	private onDisplayChanged(sensor: Display, silent: boolean = false) {
		// console.log(`HeartRateDisplay.onDisplayChanged: on=${sensor.on}`);

		this._isDisplayOn = sensor.on;
		if (silent) return;

		this.updateState();
	}

	private onHeartRateChanged(sensor: HeartRateSensor) {
		// console.log(`HeartRateDisplay.onHeartRateChanged: heartRate=${sensor.heartRate}`);

		this._rate = sensor.heartRate ?? undefined;
		this.render();
	}

	start() {
		if (!this._isDisplayOn) return;

		// console.log('HeartRateDisplay.start');

		if (this.bodyPresenceSensor != null) {
			this.bodyPresenceSensor.start();
			this.onBodyPresenceChanged(this.bodyPresenceSensor, true);
		} else {
			this._isOnBody = undefined;
		}

		if (this._isOnBody && this.heartRateSensor != null) {
			this.heartRateSensor.start();
			this.onHeartRateChanged(this.heartRateSensor);
		} else {
			this.heartRateSensor?.stop();
			this._rate = undefined;
			this.render();
		}
	}

	stop() {
		// console.log('HeartRateDisplay.stop');

		this.heartRateSensor?.stop();
		if (this.bodyPresenceSensor != null) {
			this._isOnBody = undefined;
			this.bodyPresenceSensor.stop();
		}
	}

	private render() {
		const rate = this._rate ?? 0;
		// console.log(`HeartRateDisplay.render: heartRate=${rate}`);

		this.$rate.text = `${rate > 0 ? rate : '--'}`;

		let x = device.screen.width;
		if (
			configuration.get('showRestingHeartRate') &&
			app.permissions.granted('access_user_profile') &&
			user.restingHeartRate != null
		) {
			this.$restingRate.text = `${user.restingHeartRate ?? ''}`;

			x -= 10;
			this.$restingRate.x = x;

			x -= this.$restingRate.getBBox().width + 10;
		} else {
			this.$restingRate.text = '';
			x = device.screen.width;
		}

		this.$rate.x = x;

		x -= this.$icon.getBBox().width + this.$rate.getBBox().width + 10;
		this.$icon.x = x;

		// this.$group.x = 200 +x - 32;
		// this.$group.y = this.$group.y! - 16;

		const color = getHeartRateColor(rate);
		this.$icon.style.fill = color;
		this.$rate.style.fill = color;
		// (this.$group as any).fill = color;
	}

	private updateState() {
		if (this._isDisplayOn) {
			this.start();
		} else {
			this.stop();
		}
	}
}

function getHeartRateColor(rate: number) {
	if (rate === 0) return heartRateZoneColorMap['unknown'];

	let zone: ReturnType<UserProfile['heartRateZone']> | 'resting' = user.heartRateZone(rate) ?? 'out-of-range';

	const restingHeartRate = user.restingHeartRate ?? 0;
	if (rate <= Math.round(restingHeartRate + restingHeartRate * 0.1) && zone === 'out-of-range') {
		zone = 'resting';
	}
	return heartRateZoneColorMap[zone];
	// return colors[Math.max(Math.min(rate - 20, 200), 0)];
}
