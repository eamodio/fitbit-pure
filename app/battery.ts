import { battery, Battery } from 'power';
import { configuration } from './configuration';

export class BatteryDisplay {
	private _level: number | undefined;

	constructor(
		private readonly $container: GraphicsElement,
		private readonly $icon: ImageElement,
		private readonly $level: TextElement
	) {
		battery.addEventListener('change', () => this.onBatteryChanged(battery));
		this.onBatteryChanged(battery);
	}

	private onBatteryChanged(sensor: Battery) {
		// console.log(`BatteryDisplay.onBatteryChanged: on=${sensor.on}`);

		this._level = Math.floor(sensor.chargeLevel);
		this.render();
	}

	render() {
		const level = this._level ?? 0;
		// console.log(`BatteryDisplay.render: level=${level}`);

		this.$level.text = `${level > 0 ? level : '--'}%`;
		this.$level.style.visibility = configuration.get('showBatteryPercentage') ? 'visible' : 'hidden';

		this.$icon.href = `images/battery-${
			level <= 15 ? 10 : level <= 30 ? 25 : level <= 55 ? 50 : level <= 80 ? 75 : level <= 95 ? 90 : 100
		}.png`;
	}
}
