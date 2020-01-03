import clock, { TickEvent } from 'clock';
import { display, Display } from 'display';
import { preferences } from 'user-settings';
import { ConfigChanged, configuration } from './configuration';
import { defer, log } from '../common/system';

const emptyDate = new Date(0, 0, 0, 0, 0, 0, 0);
const dimClass = /\bdim\b/;
const dimReplacementClass = /\bdim\b/;

export class TimeDisplay {
	private _date: Date | undefined;
	private _prevMinutes: number | undefined;
	private _prevHours: number | undefined;

	constructor(
		private readonly $container: GroupElement,
		private readonly $hour0: ImageElement,
		private readonly $hour1: ImageElement,
		private readonly $separator: ImageElement,
		private readonly $minute0: ImageElement,
		private readonly $minute1: ImageElement,
		private readonly $seconds: TextElement
	) {
		clock.addEventListener('tick', e => this.onTick(e));
		display.addEventListener('change', () => this.onDisplayChanged(display));
		configuration.onDidChange(this.onConfigurationChanged, this);

		if (display.aodEnabled) {
			const aodOpacity = configuration.get('aodOpacity');
			// 0.6 is the default in the svg (index.gui)
			if (aodOpacity !== 0.6) {
				this.updateAlwaysOnOpacity(aodOpacity);
			}
		}

		this.onConfigurationChanged();
	}

	@log('TimeDisplay', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (
			e?.key != null &&
			e.key !== 'animateSeparator' &&
			e.key !== 'aodOpacity' &&
			e.key !== 'showLeadingZero' &&
			e.key !== 'showSeconds'
		) {
			return;
		}

		if (e?.key == null || e?.key === 'animateSeparator') {
			this.$separator.animate(!display.aodActive && configuration.get('animateSeparator') ? 'enable' : 'disable');

			if (e?.key === 'animateSeparator') return;
		}

		if (e?.key == null || e?.key === 'aodOpacity') {
			this.updateAlwaysOnOpacity(configuration.get('aodOpacity'));

			if (e?.key === 'aodOpacity') return;
		}

		if (e?.key == null || e?.key === 'showSeconds') {
			if (configuration.get('showSeconds')) {
				this.$seconds.style.display = 'inline';
				this.updateClock(true);
			} else {
				this.$seconds.style.display = 'none';
				this.updateClock(false);
			}

			if (e?.key === 'showSeconds') return;
		}

		this.render();
	}

	@log('TimeDisplay', {
		0: sensor => `on=${sensor.on}, aodActive=${sensor.aodActive}`
	})
	private onDisplayChanged(sensor: Display) {
		if (sensor.aodEnabled && configuration.get('showSeconds')) {
			this.updateClock(true);
		}

		this.render();

		requestAnimationFrame(() => {
			if (sensor.aodEnabled) {
				this.$container.animate(sensor.aodActive ? 'unload' : 'load');
			}

			if (configuration.get('animateSeparator')) {
				this.$separator.animate(sensor.on && !sensor.aodActive ? 'enable' : 'disable');
			}
		});
	}

	@log('TimeDisplay', {
		0: e => `date=${e.date}`
	})
	private onTick({ date }: TickEvent) {
		this._date = date;
		this.renderCore();
	}

	@defer()
	render() {
		this.renderCore(true);
	}

	@log('TimeDisplay')
	private renderCore(force: boolean = false) {
		const date = this._date ?? emptyDate;

		if (configuration.get('showSeconds') && !display.aodActive) {
			this.$seconds.text = `${toMonospaceDigits(date.getSeconds(), true)}s`;
		}

		const minutes = date.getMinutes();
		if (!force && minutes === this._prevMinutes) return;

		this._prevMinutes = minutes;

		const minute = zeroPad(minutes);
		this.$minute0.href = `images/${minute[0] ?? 0}.png`;
		this.$minute1.href = `images/${minute[1] ?? 0}.png`;

		const hours = date.getHours();
		if (!force && hours === this._prevHours) return;

		this._prevHours = hours;

		const hour = zeroPad(preferences.clockDisplay === '12h' ? hours % 12 || 12 : hours);
		this.$hour0.href = `images/${hour[0] ?? 0}.png`;
		if (hour[0] === '0') {
			if (configuration.get('showLeadingZero')) {
				if (!dimClass.test(this.$hour0.class)) {
					this.$hour0.class += ' dim';
				}

				this.$container.groupTransform!.translate.x = 0;
				this.$hour0.style.visibility = 'visible';
			} else {
				this.$hour0.style.visibility = 'hidden';
				this.$container.groupTransform!.translate.x = -33;
			}
		} else {
			this.$hour0.class = this.$hour0.class.replace(dimReplacementClass, '');

			this.$container.groupTransform!.translate.x = 0;
			this.$hour0.style.visibility = 'visible';
		}
		this.$hour1.href = `images/${hour[1] ?? 0}.png`;
	}

	private updateAlwaysOnOpacity(aodOpacity: number) {
		let el: (Element & { from: number; to: number }) | null = this.$container.getElementById(
			'aod-animate-in'
		) as any;
		if (el != null) {
			el.from = aodOpacity;
		}

		el = this.$container.getElementById('aod-animate-out') as any;
		if (el != null) {
			el.to = aodOpacity;
		}
	}

	private updateClock(seconds: boolean) {
		clock.granularity = seconds && !display.aodActive ? 'seconds' : 'minutes';
	}
}

function zeroPad(num: number): string {
	return `${num < 10 ? '0' : ''}${num}`;
}

export function toMonospaceDigits(num: number, pad = true): string {
	let digits;
	if (pad && num < 10) {
		digits = c0 + toMonospaceDigit(num);
	} else {
		digits = '';
		while (num > 0) {
			digits = toMonospaceDigit(num % 10) + digits;
			num = (num / 10) | 0;
		}
	}
	return digits;
}

const c0 = String.fromCharCode(0x10);
const c1 = String.fromCharCode(0x11);
const c2 = String.fromCharCode(0x12);
const c3 = String.fromCharCode(0x13);
const c4 = String.fromCharCode(0x14);
const c5 = String.fromCharCode(0x15);
const c6 = String.fromCharCode(0x16);
const c7 = String.fromCharCode(0x17);
const c8 = String.fromCharCode(0x18);
const c9 = String.fromCharCode(0x19);

function toMonospaceDigit(digit: number) {
	switch (digit) {
		case 0:
			return c0;
		case 1:
			return c1;
		case 2:
			return c2;
		case 3:
			return c3;
		case 4:
			return c4;
		case 5:
			return c5;
		case 6:
			return c6;
		case 7:
			return c7;
		case 8:
			return c8;
		case 9:
			return c9;
		default:
			return digit;
	}
}
