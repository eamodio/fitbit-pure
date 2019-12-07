import clock, { TickEvent } from 'clock';
import { display, Display } from 'display';
import { configuration } from './configuration';
import { getLocalizedDate } from './locale';

const emptyDate = new Date(0, 0, 0, 0, 0, 0, 0);

export class DateDisplay {
	private _date: Date | undefined;

	constructor(
		private readonly $container: GraphicsElement,
		private readonly $date: TextElement,
		private readonly $dateHighlight: TextElement
	) {
		clock.addEventListener('tick', e => this.onTick(e));

		display.addEventListener('change', () => this.onDisplayChanged(display));
		this.onDisplayChanged(display);
	}

	private onDisplayChanged(sensor: Display) {
		// console.log(`DateDisplay.onDisplayChanged: on=${sensor.on}`);

		this.render();
	}

	private onTick({ date }: TickEvent) {
		this._date = date;
		this.render();
	}

	render() {
		const date = this._date ?? emptyDate;
		// console.log(`DateDisplay.render: date=${date}`);

		const showDate = configuration.get('showDate');
		if (showDate === 'on' || (showDate === 'whenOn' && display.on)) {
			this.$date.text = getLocalizedDate(date);

			const x = this.$date.getBBox().right;
			this.$dateHighlight.x = x;
			this.$dateHighlight.text = `${date.getDate()}`;

			this.$container.style.visibility = 'visible';
		} else {
			this.$container.style.visibility = 'hidden';
		}
	}
}
