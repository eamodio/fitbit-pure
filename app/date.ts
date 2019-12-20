import clock, { TickEvent } from 'clock';
import { display, Display } from 'display';
import { ConfigChanged, configuration } from './configuration';
import { getLocalizedDate } from './locale';
import { addEventListener, defer, Disposable, log } from '../common/system';

export class DateDisplay {
	private _date: Date | undefined;
	private _disposable: Disposable | undefined;

	constructor(
		private readonly $container: GroupElement,
		private readonly $date: TextElement,
		private readonly $dateHighlight: TextElement
	) {
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
				this._disposable = Disposable.from(
					addEventListener(clock, 'tick', e => this.onTick(e)),
					addEventListener(display, 'change', () => this.onDisplayChanged(display))
				);

				this.$container.style.display = 'inline';

				if (display.on && !display.aodActive) {
					this.render();
				}
			}
		} else {
			this._disposable?.dispose();
			this._disposable = undefined;

			this.$container.style.display = 'none';
		}
	}

	@log('DateDisplay', {
		0: sensor => `on=${sensor.on}, aodActive=${sensor.aodActive}`
	})
	private onDisplayChanged(sensor: Display) {
		if (sensor.aodAvailable && sensor.aodAllowed) {
			requestAnimationFrame(() => this.$container.animate(sensor.aodActive ? 'unload' : 'load'));
		}
	}

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
	}
}
