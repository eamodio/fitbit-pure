import { battery, Battery } from 'power';
import document from 'document';
import { display } from 'display';
import { ConfigChangeEvent, configuration } from './configuration';
import { debounce, defer } from '../common/system';

export class BatteryDisplay {
	private _level: number | undefined;

	constructor() {
		battery.addEventListener('change', () => this.onBatteryChanged(battery));
		configuration.onDidChange(this.onConfigurationChanged, this);

		this.onConfigurationChanged();

		if (display.on && !display.aodActive) {
			this.render();
		}
	}

	@debounce(500)
	// @log('BatteryDisplay', { 0: sensor => `chargeLevel=${sensor.chargeLevel}` })
	private onBatteryChanged(sensor: Battery) {
		this._level = Math.floor(sensor.chargeLevel);
		this.render();
	}

	// @log('BatteryDisplay', { 0: e => `e.key=${e?.key}` })
	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (e?.key != null && e.key !== 'showBatteryPercentage') return;

		document.getElementById<TextElement>('battery-level')!.style.display = configuration.get(
			'showBatteryPercentage'
		)
			? 'inline'
			: 'none';
	}

	@defer()
	// @log('BatteryDisplay')
	private render() {
		const level = this._level ?? Math.floor(battery.chargeLevel) ?? 0;

		document.getElementById<TextElement>('battery-level')!.text = `${level > 0 ? level : '--'}%`;

		const $indicator = document.getElementById<LineElement>('battery-indicator')!;
		$indicator.x2 = $indicator.x1 + Math.round(level * 0.23);

		if (battery.charging) {
			$indicator.style.fill = 'fb-black';
			// document.getElementById<TextElement>('battery-until-charged')!.text =
			// 	battery.timeUntilFull == null ? '' : `${battery.timeUntilFull} left`;
		} else {
			// document.getElementById<TextElement>('battery-until-charged')!.text = '';

			// eslint-disable-next-line no-lonely-if
			if (level <= 16) {
				$indicator.style.fill = 'fb-black';
			} else if (level <= 30) {
				$indicator.style.fill = 'fb-peach';
			} else {
				$indicator.style.fill = 'fb-white';
			}
		}
	}
}
