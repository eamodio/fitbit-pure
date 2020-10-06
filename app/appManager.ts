import { display, Display } from 'display';
import document from 'document';
import { vibration } from 'haptics';
import { addEventListener, Disposable, Event, EventEmitter } from '../common/system';
import { Colors, ConfigChangeEvent, configuration } from './configuration';
import { DonatePopup } from './popup';

const colors: Colors[] = [
	'fb-black',
	'fb-light-gray',
	'fb-white',
	'fb-lavender',
	'fb-slate',
	'fb-blue',
	'fb-cyan',
	'fb-aqua',
	'fb-cerulean',
	'fb-indigo',
	'fb-purple',
	'fb-violet',
	'fb-plum',
	'fb-magenta',
	'fb-pink',
	'fb-red',
	'fb-orange',
	'fb-peach',
	'fb-yellow',
	'fb-lime',
	'fb-mint',
	'fb-green',
];

const opacities = new Float32Array([
	0.35, // fb-black
	0.35, // fb-light-gray
	0.35, // fb-white
	0.4, // fb-lavender
	0.55, // fb-slate
	0.55, // fb-blue
	0.4, // fb-cyan
	0.35, // fb-aqua
	0.5, // fb-cerulean
	0.65, // fb-indigo
	0.5, // fb-purple
	0.45, // fb-violet
	0.55, // fb-plum
	0.4, // fb-magenta
	0.4, // fb-pink
	0.4, // fb-red
	0.4, // fb-orange
	0.35, // fb-peach
	0.35, // fb-yellow
	0.35, // fb-lime
	0.35, // fb-mint
	0.5, // fb-green
]);

export enum ActivityViews {
	Date = 0,
	Activity1 = 1,
	Activity2 = 2,
	Donate = 3,
}

export interface ActivityViewChangeEvent {
	type: 'activityView';
	previous: ActivityViews;
	view: ActivityViews;
}

export interface ClickEvent {
	type: 'click';
}

export interface DisplayChangeEvent {
	type: 'display';
	display: Display;
}

export interface EditingChangeEvent {
	type: 'editing';
	editing: boolean;
}

export type AppEvent = ActivityViewChangeEvent | ClickEvent | DisplayChangeEvent | EditingChangeEvent;

export class AppManager {
	private readonly _onDidTriggerAppEvent = new EventEmitter<AppEvent>();
	get onDidTriggerAppEvent(): Event<AppEvent> {
		return this._onDidTriggerAppEvent.event;
	}

	private _donateDisposable: Disposable | undefined;
	private _mouseClickCancelTimer: number | undefined;
	private _mouseDownDisposable: Disposable | undefined;
	private _mouseDownTimer: number | undefined;

	constructor(private readonly $trigger: RectElement) {
		display.addEventListener('change', () => this.onDisplayChanged(display));
		configuration.onDidChange(this.onConfigurationChanged, this);

		this.$trigger.addEventListener('click', e => this.onMouseClick(e));
		this.$trigger.addEventListener('mousedown', e => this.onMouseDown(e));
		this.$trigger.addEventListener('mouseup', e => this.onMouseUp(e));

		this.onConfigurationChanged();

		// DEMO MODE
		// this.demo();
	}

	get donated(): boolean {
		return configuration.get('donated');
	}

	set donated(value: boolean) {
		configuration.set('donated', value);
	}

	private _editing = false;
	get editing(): boolean {
		return this._editing;
	}

	set editing(value: boolean) {
		if (this._editing === value) return;

		if (value && !this.donated) {
			this.showDonatePopup();

			return;
		}

		this._editing = value;

		document.getElementById<ImageElement>('editing')!.style.display = value ? 'inline' : 'none';

		const $overlay = document.getElementById<GroupElement>('editable-overlay')!;
		$overlay.style.display = value ? 'inline' : 'none';
		if (value) {
			requestAnimationFrame(() => $overlay.animate('enable'));
		}

		this._onDidTriggerAppEvent.fire({ type: 'editing', editing: value });
	}

	fire(e: AppEvent) {
		this._onDidTriggerAppEvent.fire(e);
	}

	showDonatePopup() {
		requestAnimationFrame(() => {
			const popup = new DonatePopup(this);
			popup.show();
		});
	}

	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (
			e?.key != null &&
			e?.key !== 'accentBackgroundColor' &&
			e?.key !== 'accentForegroundColor' &&
			e?.key !== 'allowEditing' &&
			e.key !== 'donated'
		) {
			return;
		}

		if (e?.key == null || e?.key === 'allowEditing') {
			if (!configuration.get('allowEditing')) {
				this.editing = false;
			}

			if (e?.key === 'allowEditing') return;
		}

		if (e?.key == null || e?.key === 'donated') {
			const $donateButton = document.getElementById<SquareButtonElement>('donate-button')!;

			if (this.donated) {
				$donateButton.style.visibility = 'hidden';

				if (this._donateDisposable != null) {
					this._donateDisposable.dispose();
					this._donateDisposable = undefined;
				}
			} else {
				$donateButton.style.visibility = 'visible';

				this._donateDisposable?.dispose();
				this._donateDisposable = addEventListener($donateButton, 'click', () => this.onDonateClicked());
			}

			if (e?.key === 'donated') return;
		}

		if (e?.key == null || e?.key === 'accentBackgroundColor') {
			const color = configuration.get('accentBackgroundColor');
			const $els = document.getElementsByClassName<StyledElement>('theme-bg-color');

			let i = $els.length;
			let $el: StyledElement;
			while (i--) {
				$el = $els[i];
				$el.style.visibility = color === 'fb-black' ? 'hidden' : 'visible';
				$el.style.fill = color;
			}
		}

		if (e?.key == null || e?.key === 'accentForegroundColor') {
			const color = configuration.get('accentForegroundColor');
			const $els = document.getElementsByClassName<StyledElement>('theme-fg-color');

			const index = colors.indexOf(color);
			const opacity = Number(opacities[index === -1 ? 0 : index].toFixed(2));
			const separatorOpacity = opacity + 0.2;

			// console.log(`color=${color}, index=${index}, opacity=${opacity}`);

			let i = $els.length;
			let $el: StyledElement;
			while (i--) {
				$el = $els[i];
				$el.style.fill = color;

				if ($el.id === 'time-sep') {
					$el.style.fillOpacity = separatorOpacity;
					($el.children[0] as AnimateElement).from = separatorOpacity;
					($el.children[1] as AnimateElement).to = separatorOpacity;
				} else if ($el.id === 'time-hr0--zero') {
					$el.style.fillOpacity = opacity;
				}

				if (display.aodAvailable) {
					let $animate = $el.getElementById<AnimateElement>('aod-in--fill');
					if ($animate != null) {
						$animate.to = color;
					}

					$animate = $el.getElementById<AnimateElement>('aod-in--fill-op');
					if ($animate != null) {
						$animate.to = opacity;
					}

					$animate = $el.getElementById<AnimateElement>('aod-out--fill');
					if ($animate != null) {
						$animate.from = color;
					}
				}
			}
		}
	}

	private onDisplayChanged(sensor: Display) {
		this.editing = false;

		if (sensor.aodEnabled) {
			requestAnimationFrame(() => {
				const animation = sensor.aodActive ? 'unload' : 'load';
				document.getElementById<GroupElement>('top-bar')!.animate(animation);
				document.getElementById<GroupElement>('bottom-bar')!.animate(animation);
			});
		}

		this._onDidTriggerAppEvent.fire({ type: 'display', display: sensor });
	}

	private onDonateClicked() {
		this.showDonatePopup();
	}

	private onMouseClick(e: MouseEvent) {
		if (this._mouseClickCancelTimer != null) {
			clearTimeout(this._mouseClickCancelTimer);
			this._mouseClickCancelTimer = undefined;

			return;
		}

		if (!this.editing) {
			this._onDidTriggerAppEvent.fire({ type: 'click' });

			return;
		}

		if (e.screenX <= 64 && e.screenY <= 64) {
			vibration.start('bump');
			configuration.set('showBatteryPercentage', !configuration.get('showBatteryPercentage'));
		} else if (e.screenX >= 112 && e.screenX <= 192 && e.screenY <= 64) {
			vibration.start('bump');
			configuration.set('showDayOnDateHide', !configuration.get('showDayOnDateHide'));

			if (
				configuration.get('showDayOnDateHide') &&
				configuration.get('currentActivityView') === ActivityViews.Date
			) {
				document.getElementById<TextElement>('day-value')!.parent!.animate('disable');
			}
		} else if (e.screenX >= 236 && e.screenY <= 64) {
			vibration.start('bump');
			configuration.set('showRestingHeartRate', !configuration.get('showRestingHeartRate'));
		} else if (e.screenX <= 64 && e.screenY >= 108 && e.screenY <= 188) {
			vibration.start('bump');
			configuration.set('showLeadingZero', !configuration.get('showLeadingZero'));
		} else if (e.screenX >= 112 && e.screenX <= 192 && e.screenY >= 108 && e.screenY <= 188) {
			vibration.start('bump');

			let color = configuration.get('accentBackgroundColor');
			// if (color === 'fb-dark-gray') {
			// 	color = 'fb-black';
			// }

			let index = colors.indexOf(color) + 1;
			if (index >= colors.length) {
				index = 0;
			}

			color = colors[index];
			configuration.set('accentBackgroundColor', color);
			configuration.set('accentForegroundColor', color === 'fb-black' ? 'fb-white' : color);
		} else if (e.screenX >= 236 && e.screenY >= 108 && e.screenY <= 188) {
			vibration.start('bump');
			configuration.set('showSeconds', !configuration.get('showSeconds'));
		} else if (e.screenY >= 236) {
			if (e.screenX >= 112 && e.screenX <= 192) {
				vibration.start('bump');
				if (configuration.get('currentActivityView') === ActivityViews.Date) {
					configuration.set('showDate', !configuration.get('showDate'));
				} else {
					configuration.set('showActivityUnits', !configuration.get('showActivityUnits'));
				}
			} else {
				this._onDidTriggerAppEvent.fire({ type: 'click' });
			}
		}

		document.getElementById<GroupElement>('editable-overlay')!.animate('enable');
	}

	private onMouseDown(_e: MouseEvent) {
		this.clearEditingTimer();

		if (this._mouseClickCancelTimer != null) {
			clearTimeout(this._mouseClickCancelTimer);
			this._mouseClickCancelTimer = undefined;
		}

		if (!configuration.get('allowEditing')) return;

		// When there is a swipe (up/down/left/right) on the clock face, no mouseup is fired,
		// but the parent element seems to get a "reload" event when this happens (but only on the device)
		// So when we get a "reload" cancel any pending timer
		this._mouseDownDisposable = addEventListener(this.$trigger.parent!, 'reload', () => this.clearEditingTimer());

		this._mouseDownTimer = setTimeout(() => {
			this._mouseDownTimer = undefined;
			vibration.start('confirmation-max');

			// Start a timer to cancel the next click, if it comes -- since we don't want to allow that
			this._mouseClickCancelTimer = setTimeout(() => {
				this._mouseClickCancelTimer = undefined;
			}, 500);

			this.editing = !this.editing;
		}, 1000);
	}

	private onMouseUp(_e: MouseEvent) {
		this.clearEditingTimer();
	}

	private clearEditingTimer() {
		if (this._mouseDownTimer != null) {
			clearTimeout(this._mouseDownTimer);
			this._mouseDownTimer = undefined;
		}

		this._mouseDownDisposable?.dispose();
	}

	// DEMO MODE
	// demo() {
	// 	display.on = false;
	// 	configuration.set('accentBackgroundColor', 'fb-black');
	// 	configuration.set('accentForegroundColor', 'fb-white');
	// 	configuration.set('currentActivityView', 0);

	// 	const $tap = document.getElementById<GraphicsElement>('demo-tap')!;

	// 	const $text0 = document.getElementById<TextElement>('demo-text0')!;
	// 	const $text1 = document.getElementById<TextElement>('demo-text1')!;

	// 	let time = 1000;
	// 	setTimeout(() => {
	// 		$text0.y = 270;
	// 		$text0.text = 'ALWAYS-ON DISPLAY';
	// 		$text0.style.display = 'inline';
	// 	}, time);

	// 	time += 2000;
	// 	setTimeout(() => {
	// 		$text0.style.display = 'none';
	// 		display.on = true;
	// 	}, time);

	// 	time += 1500;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		configuration.set('currentActivityView', 1);
	// 	}, time);

	// 	time += 2750;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		configuration.set('currentActivityView', 2);
	// 	}, time);

	// 	time += 3000;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		configuration.set('currentActivityView', 0);
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$text0.y = 75;
	// 		$text0.text = 'TAP & HOLD';
	// 		$text0.style.display = 'inline';

	// 		$text1.y = 240;
	// 		$text1.text = 'TO CUSTOMIZE';
	// 		$text1.style.display = 'inline';
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('select');
	// 	}, time);

	// 	time += 1500;
	// 	setTimeout(() => {
	// 		this.editing = true;
	// 		$text0.style.display = 'none';
	// 		$text1.style.display = 'none';
	// 	}, time);

	// 	time += 2000;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 		document.getElementById<GroupElement>('editable-overlay')!.style.display = 'none';

	// 		configuration.set('accentBackgroundColor', 'fb-white');
	// 		configuration.set('accentForegroundColor', 'fb-white');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 		configuration.set('accentBackgroundColor', 'fb-cyan');
	// 		configuration.set('accentForegroundColor', 'fb-cyan');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 		configuration.set('accentBackgroundColor', 'fb-blue');
	// 		configuration.set('accentForegroundColor', 'fb-blue');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 		configuration.set('accentBackgroundColor', 'fb-red');
	// 		configuration.set('accentForegroundColor', 'fb-red');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 		configuration.set('accentBackgroundColor', 'fb-purple');
	// 		configuration.set('accentForegroundColor', 'fb-purple');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('select');
	// 	}, time);

	// 	time += 1500;
	// 	setTimeout(() => (this.editing = false), time);

	// 	time += 2000;
	// 	setTimeout(() => this.demo(), time);
	// }
}

export const appManager = new AppManager(document.getElementById<RectElement>('trigger')!);
