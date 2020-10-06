import { me as app } from 'appbit';
import { display } from 'display';
import document from 'document';
import { BodyPresenceSensor } from 'body-presence';
import { HeartRateSensor } from 'heart-rate';
import { user } from 'user-profile';
import { gettext } from 'i18n';
import { AppEvent, appManager } from './appManager';
import { ConfigChangeEvent, configuration } from './configuration';
import { debounce, defer } from '../common/system';

export class HeartRateDisplay {
	private readonly bodyPresenceSensor: BodyPresenceSensor | undefined;
	private readonly heartRateSensor: HeartRateSensor | undefined;
	private readonly hasUserProfileAccess: boolean;
	private isOnBody: boolean | undefined;
	private rate: number | undefined;

	constructor() {
		this.hasUserProfileAccess = app.permissions.granted('access_user_profile');

		if (HeartRateSensor == null || !app.permissions.granted('access_heart_rate')) {
			document.getElementById<ContainerElement>('hr')!.style.display = 'none';

			return;
		}

		const sensor = new HeartRateSensor({ frequency: 5 });
		this.heartRateSensor = sensor;

		sensor.addEventListener('activate', () => this.onHeartRateChanged(sensor));
		sensor.addEventListener('reading', () => this.onHeartRateChanged(sensor));

		appManager.onDidTriggerAppEvent(this.onAppEvent, this);

		if (BodyPresenceSensor && app.permissions.granted('access_activity')) {
			const sensor = new BodyPresenceSensor();
			this.bodyPresenceSensor = sensor;

			sensor.addEventListener('activate', () => this.onBodyPresenceChanged(sensor));
			sensor.addEventListener('reading', () => this.onBodyPresenceChanged(sensor));
		} else {
			this.isOnBody = true;
		}

		configuration.onDidChange(this.onConfigurationChanged, this);

		this.onConfigurationChanged();
		this.updateState();
	}

	private onAppEvent(e: AppEvent) {
		switch (e.type) {
			case 'display': {
				this.updateState();
				break;
			}
			case 'editing': {
				this.render();
				break;
			}
		}
	}

	@debounce(250)
	private onBodyPresenceChanged(sensor: BodyPresenceSensor) {
		this.isOnBody = sensor.present ?? undefined;
		this.updateState();
	}

	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (
			e?.key != null &&
			e.key !== 'animateHeartRate' &&
			e.key !== 'colorizeHeartRate' &&
			e.key !== 'donated' &&
			e.key !== 'showRestingHeartRate'
		) {
			return;
		}

		if (e?.key == null || e.key === 'animateHeartRate') {
			this.stopAnimation();

			if (configuration.get('animateHeartRate') && this.rate != null && this.rate > 0) {
				this.startAnimation(this.rate);
			}
		}

		if (e?.key == null || e.key === 'colorizeHeartRate' || e.key === 'donated') {
			if (configuration.get('colorizeHeartRate') && configuration.get('donated')) {
				const color = getHeartRateColor(this.rate);
				document.getElementById<ImageElement>('hr-icon')!.style.fill = color;
			} else {
				document.getElementById<ImageElement>('hr-icon')!.style.fill = configuration.get(
					'accentForegroundColor',
				);
			}
		}

		if (e?.key == null || e.key === 'showRestingHeartRate') {
			document.getElementById<TextElement>('hr-resting')!.style.display = configuration.get(
				'showRestingHeartRate',
			)
				? 'inline'
				: 'none';
		}

		if (display.on && !display.aodActive) {
			this.render();
		}
	}

	@debounce(100)
	private onHeartRateChanged(sensor: HeartRateSensor) {
		if (this.rate === sensor.heartRate) return;

		this.rate = sensor.heartRate ?? undefined;
		this.render();
	}

	@defer()
	private render() {
		let rate = appManager.editing ? 0 : this.rate;
		if (rate == null) {
			const timestamp = this.heartRateSensor?.activated ? this.heartRateSensor?.timestamp ?? 0 : 0;
			rate = timestamp > 0 ? this.heartRateSensor?.heartRate ?? 0 : 0;
		}

		const $rate = document.getElementById<TextElement>('hr-rate')!;
		$rate.text = `${rate > 0 ? rate : '--'}`;

		const $restingRate = document.getElementById<TextElement>('hr-resting')!;
		$restingRate.text = `${
			this.hasUserProfileAccess ? (appManager.editing ? '00' : user.restingHeartRate) ?? '' : ''
		}`;

		const rect = $rate.getBBox();
		$restingRate.x = (rect.x as number) + rect.width / 2;

		if (configuration.get('colorizeHeartRate') && configuration.get('donated')) {
			document.getElementById<ImageElement>('hr-icon')!.style.fill = getHeartRateColor(rate);
		}

		if (rate <= 0) {
			this.stopAnimation();
		} else {
			this.startAnimation(rate);
		}
	}

	private animationHandle: number | undefined;
	private animationInterval: number | undefined;

	private startAnimation(rate: number) {
		const animate = configuration.get('animateHeartRate');
		if (!animate) return;

		// console.log(`HeartRateDisplay.startAnimation: rate=${rate}, animation=${animation}`);

		const interval = Math.round(1000 / (rate / 60) / 50) * 50;
		if (interval === this.animationInterval) return;

		this.animationInterval = interval;
		if (this.animationHandle != null) {
			clearInterval(this.animationHandle);
		}

		const $container = document.getElementById<GraphicsElement>('hr-icon')!.parent!;

		// BUG: Fitbit bug where setting repeatDur has no effect, once fixed can remove the manual setInterval
		// const repeatDur = interval / 1000;
		// let i = 5;
		// while (i-- >= 2) {
		// 	console.log(`i=${i}, repeatDur=${($container.children[i] as AnimateElement).repeatDur}`);
		// 	($container.children[i] as AnimateElement).repeatDur = repeatDur;
		// }
		// $container.animate('enable');

		this.animationHandle = setInterval(() => $container.animate('enable'), interval);
	}

	private stopAnimation() {
		if (this.animationHandle != null) {
			clearInterval(this.animationHandle);
			this.animationHandle = undefined;
		}
		this.animationInterval = undefined;

		document.getElementById<GraphicsElement>('hr-icon')!.parent!.animate('disable');
	}

	private updateState() {
		if (this.heartRateSensor == null) return;

		if (!display.on || display.aodActive) {
			// console.log(`HeartRateDisplay.updateState: display.on=${display.on}; stopping sensors...`);

			this.stopAnimation();

			this.heartRateSensor?.stop();
			this.bodyPresenceSensor?.stop();

			this.isOnBody = undefined;
			this.rate = undefined;

			return;
		}

		if (this.bodyPresenceSensor != null && !this.bodyPresenceSensor.activated) {
			// console.log(`HeartRateDisplay.updateState: display.on=${display.on}; starting body presence sensor...`);

			this.bodyPresenceSensor.start();

			return;
		}

		if (this.isOnBody) {
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

			this.rate = undefined;
			if (display.on && !display.aodActive) {
				this.render();
			}
		}
	}
}

function getHeartRateColor(rate: number | undefined) {
	if (rate == null || rate <= 0) return 'fb-white';

	return gettext(`heart_rate_color_${Math.max(Math.min(rate - 40, 160), 0)}`);
}
