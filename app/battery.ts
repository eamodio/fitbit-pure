import { battery, Battery } from 'power';
import { display } from 'display';
import { ConfigChanged, configuration } from './configuration';
import { debounce, defer, log } from '../common/system';

export class BatteryDisplay {
	private _level: number | undefined;

	constructor(
		private readonly $container: GraphicsElement,
		private readonly $icon: ImageElement,
		private readonly $level: TextElement
	) {
		battery.addEventListener('change', () => this.onBatteryChanged(battery));
		this.onBatteryChanged(battery);

		configuration.onDidChange(this.onConfigurationChanged, this);
	}

	@log('BatteryDisplay', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (!display.on && e?.key != null && e.key !== 'showBatteryPercentage') return;

		this.render();
	}

	@debounce(500)
	@log('BatteryDisplay', {
		0: sensor => `chargeLevel=${sensor.chargeLevel}`
	})
	private onBatteryChanged(sensor: Battery) {
		this._level = Math.floor(sensor.chargeLevel);
		this.render();
	}

	@defer()
	@log('BatteryDisplay')
	render() {
		const level = this._level ?? 0;

		this.$level.text = `${level > 0 ? level : '--'}%`;
		this.$level.style.visibility = configuration.get('showBatteryPercentage') ? 'visible' : 'hidden';

		this.$icon.href = `images/battery-${
			level <= 15 ? 10 : level <= 30 ? 25 : level <= 55 ? 50 : level <= 80 ? 75 : level <= 95 ? 90 : 100
		}.png`;
	}
}
