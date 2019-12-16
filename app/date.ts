import clock, { TickEvent } from 'clock';
// import { display } from 'display';
import { ConfigChanged, configuration } from './configuration';
import { getLocalizedDate } from './locale';
import { addEventListener, defer, Disposable, log } from '../common/system';

export class DateDisplay {
	private _date: Date | undefined;
	private _disposable: Disposable | undefined;

	constructor(
		private readonly $container: GraphicsElement,
		private readonly $date: TextElement,
		private readonly $dateHighlight: TextElement
	) {
		// display.addEventListener('change', () => this.onDisplayChanged(display));
		// this.onDisplayChanged(display);

		configuration.onDidChange(this.onConfigurationChanged, this);
		this.onConfigurationChanged();
	}

	@log('DateDisplay', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (e?.key != null && e.key !== 'showDate') return;

		if (configuration.get('showDate')) {
			if (this._disposable == null) {
				this._disposable = addEventListener(clock, 'tick', e => this.onTick(e));

				this.render();
			}
		} else {
			this._disposable?.dispose();
			this._disposable = undefined;

			this.$container.style.display = 'none';
		}
	}

	// @log('DateDisplay', {
	// 	0: sensor => `on=${sensor.on}`
	// })
	// private onDisplayChanged(sensor: Display) {
	// 	this.render();
	// }

	@log('DateDisplay', {
		0: e => `date=${e.date}`
	})
	private onTick({ date }: TickEvent) {
		this._date = date;
		this.render();
	}

	@defer()
	@log('DateDisplay')
	render() {
		const date = this._date ?? new Date();

		this.$date.text = getLocalizedDate(date);

		const x = this.$date.getBBox().right;
		this.$dateHighlight.x = x;
		this.$dateHighlight.text = `${date.getDate()}`;

		this.$container.style.display = 'inline';
	}
}
