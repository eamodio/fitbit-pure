import { display, Display } from 'display';
import document from 'document';
import { vibration } from 'haptics';
import { addEventListener, Disposable, Event, EventEmitter, log } from '../common/system';
import { Colors, ConfigChanged, configuration } from './configuration';
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
	'fb-green'
];

export class AppManager {
	private readonly _onDidChangeDisplay = new EventEmitter<Display>();
	get onDidChangeDisplay(): Event<Display> {
		return this._onDidChangeDisplay.event;
	}

	private readonly _onDidChangeView = new EventEmitter<void>();
	get onDidChangeView(): Event<void> {
		return this._onDidChangeView.event;
	}

	private readonly _onDidChangeEditMode = new EventEmitter<boolean>();
	get onDidChangeEditMode(): Event<boolean> {
		return this._onDidChangeEditMode.event;
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

		this._onDidChangeEditMode.fire(value);
	}

	refresh() {
		requestAnimationFrame(() => this.onConfigurationChanged());
	}

	showDonatePopup() {
		requestAnimationFrame(() => {
			const popup = new DonatePopup(this);
			popup.show();
		});
	}

	@log('AppManager', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
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

		let color = configuration.get('accentBackgroundColor');
		let $els = document.getElementsByClassName<StyledElement>('theme-color--accent-background');

		let i = $els.length;
		while (i--) {
			const $el = $els[i];
			$el.style.visibility = color === 'fb-black' ? 'hidden' : 'visible';
			$el.style.fill = color;
		}

		color = configuration.get('accentForegroundColor');
		$els = document.getElementsByClassName<StyledElement>('theme-color--accent-foreground');

		i = $els.length;
		while (i--) {
			const $el = $els[i];
			$el.style.fill = color;

			let $animate = $el.getElementById<AnimateElement>('aod-animate-in');
			if ($animate != null) {
				$animate.from = 'fb-white';
				$animate.to = color;
			}

			$animate = $el.getElementById<AnimateElement>('aod-animate-out');
			if ($animate != null) {
				$animate.from = color;
				$animate.to = 'fb-white';
			}

			if (e?.key == null && display.aodEnabled) {
				$el.animate(display.aodActive ? 'unload' : 'load');
			}
		}
	}

	@log('AppManager', {
		0: sensor => `on=${sensor.on}, aodActive=${sensor.aodActive}`
	})
	private onDisplayChanged(sensor: Display) {
		this.editing = false;

		if (sensor.aodEnabled) {
			requestAnimationFrame(() => {
				const animation = sensor.aodActive ? 'unload' : 'load';
				document.getElementById<GroupElement>('top-bar')!.animate(animation);
				document.getElementById<GroupElement>('bottom-bar')!.animate(animation);
			});
		}

		this._onDidChangeDisplay.fire(sensor);
	}

	@log('AppManager')
	private onDonateClicked() {
		this.showDonatePopup();
	}

	@log('AppManager', false)
	private onMouseClick(e: MouseEvent) {
		if (this._mouseClickCancelTimer != null) {
			clearTimeout(this._mouseClickCancelTimer);
			this._mouseClickCancelTimer = undefined;

			return;
		}

		if (!this.editing) {
			this._onDidChangeView.fire();

			return;
		}

		if (e.screenX <= 64 && e.screenY <= 64) {
			vibration.start('bump');
			configuration.set('showBatteryPercentage', !configuration.get('showBatteryPercentage'));
		} else if (e.screenX >= 236 && e.screenY <= 64) {
			vibration.start('bump');
			configuration.set('showRestingHeartRate', !configuration.get('showRestingHeartRate'));
		} else if (e.screenX >= 112 && e.screenX <= 192 && e.screenY >= 24 && e.screenY <= 104) {
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
		} else if (e.screenX <= 64 && e.screenY >= 108 && e.screenY <= 188) {
			vibration.start('bump');
			configuration.set('showLeadingZero', !configuration.get('showLeadingZero'));
		} else if (e.screenX >= 236 && e.screenY >= 108 && e.screenY <= 188) {
			vibration.start('bump');
			configuration.set('showSeconds', !configuration.get('showSeconds'));
		} else if (e.screenX >= 112 && e.screenX <= 192 && e.screenY >= 148 && e.screenY <= 228) {
			vibration.start('bump');
			configuration.set('animateSeparator', !configuration.get('animateSeparator'));
		} else if (e.screenY >= 236) {
			if (configuration.get('currentActivityView') === 0 || (e.screenX >= 70 && e.screenX <= 230)) {
				this._onDidChangeView.fire();
			} else {
				vibration.start('bump');
				configuration.set('showActivityUnits', !configuration.get('showActivityUnits'));
			}
		}

		document.getElementById<GroupElement>('editable-overlay')!.animate('enable');
	}

	@log('AppManager', false)
	private onMouseDown(e: MouseEvent) {
		this.clearEditingTimer();

		if (this._mouseClickCancelTimer != null) {
			clearTimeout(this._mouseClickCancelTimer);
			this._mouseClickCancelTimer = undefined;
		}

		if (!configuration.get('allowEditing')) return;

		// When there is a swipe right or left on the clock face, no mouseup will occur
		// I've found that the parent element gets a "reload" event when this happens
		// So when we get a "reload" cancel any pending timer
		this._mouseDownDisposable = addEventListener(this.$trigger.parent!, 'reload', e => {
			this.clearEditingTimer();
		});

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

	@log('AppManager', false)
	private onMouseUp(e: MouseEvent) {
		this.clearEditingTimer();
	}

	private clearEditingTimer() {
		if (this._mouseDownTimer != null) {
			clearTimeout(this._mouseDownTimer);
			this._mouseDownTimer = undefined;
		}

		this._mouseDownDisposable?.dispose();
	}
}
