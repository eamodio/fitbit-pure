import { display, Display } from 'display';
import document from 'document';
import { vibration } from 'haptics';
import { addEventListener, Disposable, Event, EventEmitter, log } from '../common/system';
import { Colors, ConfigChanged, configuration } from './configuration';

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

	private _editing = false;
	get editing(): boolean {
		return this._editing;
	}

	set editing(value: boolean) {
		this._editing = value;

		document.getElementById<ImageElement>('editing')!.style.display = value ? 'inline' : 'none';
		this._onDidChangeEditMode.fire(value);
	}

	refresh() {
		requestAnimationFrame(() => this.onConfigurationChanged());
	}

	@log('AppManager', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (e?.key != null && e?.key !== 'accentBackgroundColor' && e?.key !== 'accentForegroundColor') {
			return;
		}

		let color = configuration.get('accentBackgroundColor');
		let $els = document.getElementsByClassName<StyledElement>('theme-color--accent-background');
		for (const $el of $els) {
			$el.style.visibility = color === 'fb-black' ? 'hidden' : 'visible';
			$el.style.fill = color;
		}

		color = configuration.get('accentForegroundColor');
		$els = document.getElementsByClassName<StyledElement>('theme-color--accent-foreground');
		for (const $el of $els) {
			$el.style.fill = color;

			let trigger = false;

			let $animate = $el.getElementById<AnimateElement>('aod-animate-in');
			if ($animate != null) {
				$animate.from = 'fb-white';
				$animate.to = color;
				trigger = true;
			}

			$animate = $el.getElementById<AnimateElement>('aod-animate-out');
			if ($animate != null) {
				$animate.from = color;
				$animate.to = 'fb-white';
				trigger = true;
			}

			if (trigger && display.aodEnabled) {
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

		if (e.screenX < 100 && e.screenY < 100) {
			vibration.start('bump');
			configuration.set('showBatteryPercentage', !configuration.get('showBatteryPercentage'));
		}

		if (e.screenX > 200 && e.screenY < 100) {
			vibration.start('bump');
			configuration.set('showRestingHeartRate', !configuration.get('showRestingHeartRate'));
		}

		if (e.screenX < 75 && e.screenY > 100 && e.screenY < 200) {
			vibration.start('bump');
			configuration.set('showLeadingZero', !configuration.get('showLeadingZero'));
		}

		if (e.screenX > 225 && e.screenY > 100 && e.screenY < 200) {
			vibration.start('bump');
			configuration.set('showSeconds', !configuration.get('showSeconds'));
		}

		if (e.screenX > 75 && e.screenX < 225 && e.screenY > 100 && e.screenY < 200) {
			vibration.start('bump');
			let index = getColorIndex(configuration.get('accentBackgroundColor')) + 1;
			if (index > 21) {
				index = 0;
			}

			const color = getIndexColor(index);
			configuration.set('accentBackgroundColor', color);
			configuration.set('accentForegroundColor', color === 'fb-black' ? 'fb-white' : color);
		}

		if (e.screenY > 200) {
			if (configuration.get('currentActivityView') === 0 || (e.screenX > 100 && e.screenX < 200)) {
				this._onDidChangeView.fire();

				return;
			}

			vibration.start('bump');
			configuration.set('showActivityUnits', !configuration.get('showActivityUnits'));
		}
	}

	@log('AppManager', false)
	private onMouseDown(e: MouseEvent) {
		this.clearEditingTimer();

		if (this._mouseClickCancelTimer != null) {
			clearTimeout(this._mouseClickCancelTimer);
			this._mouseClickCancelTimer = undefined;
		}

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

function getColorIndex(color: Colors): number {
	switch (color) {
		case 'fb-light-gray':
			return 1;
		case 'fb-white':
			return 2;
		case 'fb-lavender':
			return 3;
		case 'fb-slate':
			return 4;
		case 'fb-blue':
			return 5;
		case 'fb-cyan':
			return 6;
		case 'fb-aqua':
			return 7;
		case 'fb-cerulean':
			return 8;
		case 'fb-indigo':
			return 9;
		case 'fb-purple':
			return 10;
		case 'fb-violet':
			return 11;
		case 'fb-plum':
			return 12;
		case 'fb-magenta':
			return 13;
		case 'fb-pink':
			return 14;
		case 'fb-red':
			return 15;
		case 'fb-orange':
			return 16;
		case 'fb-peach':
			return 17;
		case 'fb-yellow':
			return 18;
		case 'fb-lime':
			return 19;
		case 'fb-mint':
			return 20;
		case 'fb-green':
			return 21;
		case 'fb-black':
		case 'fb-dark-gray':
		default:
			return 0;
	}
}

function getIndexColor(index: number): Colors {
	switch (index) {
		case 1:
			return 'fb-light-gray';
		case 2:
			return 'fb-white';
		case 3:
			return 'fb-lavender';
		case 4:
			return 'fb-slate';
		case 5:
			return 'fb-blue';
		case 6:
			return 'fb-cyan';
		case 7:
			return 'fb-aqua';
		case 8:
			return 'fb-cerulean';
		case 9:
			return 'fb-indigo';
		case 10:
			return 'fb-purple';
		case 11:
			return 'fb-violet';
		case 12:
			return 'fb-plum';
		case 13:
			return 'fb-magenta';
		case 14:
			return 'fb-pink';
		case 15:
			return 'fb-red';
		case 16:
			return 'fb-orange';
		case 17:
			return 'fb-peach';
		case 18:
			return 'fb-yellow';
		case 19:
			return 'fb-lime';
		case 20:
			return 'fb-mint';
		case 21:
			return 'fb-green';
		default:
			return 'fb-black';
	}
}
