import clock, { TickEvent } from 'clock';
import { display, Display } from 'display';
import { preferences } from 'user-settings';
import { configuration } from './configuration';

const emptyDate = new Date(0, 0, 0, 0, 0, 0, 0);

export class TimeDisplay {
	private _date: Date | undefined;

	constructor(
		private readonly $container: GraphicsElement,
		private readonly $hour0: ImageElement,
		private readonly $hour1: ImageElement,
		private readonly $separator: ImageElement,
		private readonly $minute0: ImageElement,
		private readonly $minute1: ImageElement
	) {
		clock.addEventListener('tick', e => this.onTick(e));

		display.addEventListener('change', () => this.onDisplayChanged(display));
		this.onDisplayChanged(display);
	}

	private onDisplayChanged(sensor: Display) {
		// console.log(`TimeDisplay.onDisplayChanged: on=${sensor.on}`);

		this.render();

		if (configuration.get('blinkSeparator')) {
			this.$separator.animate(sensor.on ? 'enable' : 'disable');
		}
	}

	private onTick({ date }: TickEvent) {
		this._date = date;
		this.render();
	}

	render() {
		const date = this._date ?? emptyDate;
		// console.log(`TimeDisplay.render: date=${date}`);

		const hour = zeroPad(preferences.clockDisplay === '12h' ? date.getHours() % 12 || 12 : date.getHours());

		this.$hour0.href = `images/${hour[0] ?? 0}.png`;
		if (hour[0] === '0') {
			if (configuration.get('showLeadingZero')) {
				this.$hour0.style.visibility = 'visible';
				this.$hour0.style.fillOpacity = 0.4;
				this.$container.x = 0;
			} else {
				this.$hour0.style.visibility = 'hidden';
				this.$container.x = -33;
			}
		} else {
			this.$hour0.style.fillOpacity = 0.7;
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
