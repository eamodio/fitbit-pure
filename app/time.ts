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

	constructor(
		private readonly $container: GroupElement,
		private readonly $hour0: ImageElement,
		private readonly $hour1: ImageElement,
		private readonly $separator: ImageElement,
		private readonly $minute0: ImageElement,
		private readonly $minute1: ImageElement
	) {
		clock.addEventListener('tick', e => this.onTick(e));
		display.addEventListener('change', () => this.onDisplayChanged(display));
		configuration.onDidChange(this.onConfigurationChanged, this);

		this.onDisplayChanged(display);
	}

	@log('TimeDisplay', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (!display.on && e?.key != null && e.key !== 'animateSeparator' && e.key !== 'showLeadingZero') {
			return;
		}

		if (e?.key == null || e?.key === 'animateSeparator') {
			this.$separator.animate(!display.aodActive && configuration.get('animateSeparator') ? 'enable' : 'disable');

			return;
		}

		this.render();
	}

	@log('TimeDisplay', {
		0: sensor => `on=${sensor.on}, aodActive=${sensor.aodActive}`
	})
	private onDisplayChanged(sensor: Display) {
		this.render();

		requestAnimationFrame(() => {
			if (sensor.aodAvailable && sensor.aodAllowed && sensor.aodEnabled) {
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
		this.render();
	}

	@defer()
	@log('TimeDisplay')
	render() {
		const date = this._date ?? emptyDate;

		const hour = zeroPad(preferences.clockDisplay === '12h' ? date.getHours() % 12 || 12 : date.getHours());

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

		const minute = zeroPad(date.getMinutes());
		this.$minute0.href = `images/${minute[0] ?? 0}.png`;
		this.$minute1.href = `images/${minute[1] ?? 0}.png`;
	}
}

function zeroPad(num: number): string {
	return `${num < 10 ? '0' : ''}${num}`;
}
