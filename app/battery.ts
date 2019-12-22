import { battery, Battery } from 'power';
import { display } from 'display';
import { ConfigChanged, configuration } from './configuration';
import { debounce, defer, log } from '../common/system';

export class BatteryDisplay {
	private _level: number | undefined;

	constructor(
		private readonly $container: GroupElement,
		private readonly $icon: ImageElement,
		private readonly $percentage: TextElement
	) {
		battery.addEventListener('change', () => this.onBatteryChanged(battery));
		configuration.onDidChange(this.onConfigurationChanged, this);

		this.onConfigurationChanged();

		if (display.on && !display.aodActive) {
			this.render();
		}
	}

	@debounce(500)
	@log('BatteryDisplay', {
		0: sensor => `chargeLevel=${sensor.chargeLevel}`
	})
	private onBatteryChanged(sensor: Battery) {
		this._level = Math.floor(sensor.chargeLevel);
		this.render();
	}

	@log('BatteryDisplay', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (e?.key != null && e.key !== 'showBatteryPercentage') return;

		if (configuration.get('showBatteryPercentage')) {
			this.$percentage.style.display = 'inline';
		} else {
			this.$percentage.style.display = 'none';
		}
	}

	@defer()
	@log('BatteryDisplay')
	render() {
		const level = this._level ?? battery.chargeLevel ?? 0;

		this.$percentage.text = `${level > 0 ? level : '--'}%`;

		this.$icon.href = `images/battery-${
			level <= 15 ? 10 : level <= 30 ? 25 : level <= 55 ? 50 : level <= 80 ? 75 : level <= 95 ? 90 : 100
		}.png`;

		// TODO: Deal with the battery overlay when the battery is lower than or equal to 16%
		// if (level <= 16) {
		// 	this.$icon.style.display = 'none';
		// } else {
		// 	this.$icon.style.display = 'inline';
		// }
	}
}
