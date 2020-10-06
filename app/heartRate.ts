import { me as app } from 'appbit';
import { me as device } from 'device';
import { display } from 'display';
import document from 'document';
import { BodyPresenceSensor } from 'body-presence';
import { HeartRateSensor } from 'heart-rate';
import { user } from 'user-profile';
import { gettext } from 'i18n';
import { ActivityViews, AppEvent, appManager } from './appManager';
import { ConfigChangeEvent, configuration } from './configuration';
import { debounce, defer } from '../common/system';

// if (device.screen == null) {
// 	(device as any).screen = { width: 348, height: 250 };
// }

const iconWidth = 32;
const screenWidth = device.screen.width;

export class HeartRateDisplay {
	private readonly bodyPresenceSensor: BodyPresenceSensor | undefined;
	private readonly heartRateSensor: HeartRateSensor | undefined;

	private readonly _hasUserProfileAccess: boolean;
	private _isOnBody: boolean | undefined;
	private _rate: number | undefined;

	constructor() {
		this._hasUserProfileAccess = app.permissions.granted('access_user_profile');

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
			this._isOnBody = true;
		}

		configuration.onDidChange(this.onConfigurationChanged, this);

		this.onConfigurationChanged();
		this.updateState();
	}

	private onAppEvent(e: AppEvent) {
		switch (e.type) {
			case 'activityView': {
				if (
					configuration.get('showDayOnDateHide') &&
					((e.previous === ActivityViews.Date && e.view !== ActivityViews.Date) ||
						(e.previous !== ActivityViews.Date && e.view === ActivityViews.Date))
				) {
					document.getElementById<TextElement>('hr-resting')!.parent!.animate('select');

					this.render();
				}
				break;
			}
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
		this._isOnBody = sensor.present ?? undefined;
		this.updateState();
	}

	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (
			e?.key != null &&
			e.key !== 'animateHeartRate' &&
			e.key !== 'colorizeHeartRate' &&
			e.key !== 'showDayOnDateHide' &&
			e.key !== 'showRestingHeartRate'
		) {
			return;
		}

		if (e?.key == null || e.key === 'animateHeartRate') {
			this.stopAnimation();

			if (configuration.get('animateHeartRate') && this._rate != null && this._rate > 0) {
				this.startAnimation(this._rate);
			}
		}

		if (e?.key == null || e.key === 'colorizeHeartRate') {
			if (configuration.get('colorizeHeartRate')) {
				const color = getHeartRateColor(this._rate);
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
		if (this._rate === sensor.heartRate) return;

		this._rate = sensor.heartRate ?? undefined;
		this.render();
	}

	@defer()
	private render() {
		let rate = appManager.editing ? 0 : this._rate;
		if (rate == null) {
			const timestamp = this.heartRateSensor?.activated ? this.heartRateSensor?.timestamp ?? 0 : 0;
			rate = timestamp > 0 ? this.heartRateSensor?.heartRate ?? 0 : 0;
		}

		const $rate = document.getElementById<TextElement>('hr-rate')!;
		$rate.text = `${rate > 0 ? rate : '--'}`;

		const $restingRate = document.getElementById<TextElement>('hr-resting')!;
		$restingRate.text = `${
			this._hasUserProfileAccess ? (appManager.editing ? '00' : user.restingHeartRate) ?? '' : ''
		}`;

		// const iconWidth = this.$icon.getBBox().width;
		const rect = $rate.getBBox();

		const x = screenWidth - iconWidth - rect.width - 20;
		$rate.x = x;

		if (configuration.get('showDayOnDateHide') && configuration.get('currentActivityView') !== ActivityViews.Date) {
			$restingRate.textAnchor = 'middle';
			$restingRate.x = x + rect.width / 2;
			$restingRate.y = 29 + rect.height / 2;
		} else {
			$restingRate.textAnchor = 'end';
			$restingRate.x = x - 8;
			$restingRate.y = 21;
		}

		if (configuration.get('colorizeHeartRate')) {
			document.getElementById<ImageElement>('hr-icon')!.style.fill = getHeartRateColor(rate);
		}

		if (rate <= 0) {
			this.stopAnimation();
		} else {
			this.startAnimation(rate);
		}
	}

	private _animationHandle: number | undefined;
	private _animationInterval: number | undefined;

	private startAnimation(rate: number) {
		const animate = configuration.get('animateHeartRate');
		if (!animate) return;

		// console.log(`HeartRateDisplay.startAnimation: rate=${rate}, animation=${animation}`);

		const interval = Math.round(1000 / (rate / 60) / 50) * 50;
		if (interval === this._animationInterval) return;

		this._animationInterval = interval;
		if (this._animationHandle !== undefined) {
			clearInterval(this._animationHandle);
		}

		const $container = document.getElementById<GraphicsElement>('hr-icon')!.parent!;

		// BUG: Fitbit bug where setting repeatDur has no effect, once fixed can remove the manual setInterval
		// const repeatDur = interval / 1000;
		// let i = 5;
		// while (i-- >= 2) {
		// 	console.log(i);
		// 	($container.children[i] as AnimateElement).repeatDur = repeatDur;
		// }
		// $container.animate('enable');

		this._animationHandle = setInterval(() => $container.animate('enable'), interval);
	}

	private stopAnimation() {
		if (this._animationHandle !== undefined) {
			clearInterval(this._animationHandle);
			this._animationHandle = undefined;
		}
		this._animationInterval = undefined;

		document.getElementById<GraphicsElement>('hr-icon')!.parent!.animate('disable');
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

function getHeartRateColor(rate: number | undefined) {
	if (rate == null || rate <= 0) return 'fb-white';

	return gettext(`heart_rate_color_${Math.max(Math.min(rate - 40, 160), 0)}`);
}
