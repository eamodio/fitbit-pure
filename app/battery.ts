import { battery, Battery } from 'power';
import document from 'document';
import { display } from 'display';
import { ConfigChangeEvent, configuration } from './configuration';
import { debounce, defer } from '../common/system';
import { AppEvent, appManager } from './appManager';

export class BatteryDisplay {
	constructor() {
		battery.addEventListener('change', () => this.onBatteryChanged(battery));

		appManager.onDidTriggerAppEvent(this.onAppEvent, this);
		configuration.onDidChange(this.onConfigurationChanged, this);

		this.onConfigurationChanged();

		if (display.on && !display.aodActive) {
			this.render();
		}
	}

	private onAppEvent(e: AppEvent) {
		if (e.type !== 'display') return;

		if (e.display.on && !e.display.aodActive) {
			this.render();
		}
	}

	@debounce(500)
	private onBatteryChanged(_sensor: Battery) {
		this.render();
	}

	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (e?.key != null && e.key !== 'showBatteryPercentage') return;

		const display = configuration.get('showBatteryPercentage') ? 'inline' : 'none';
		document.getElementById<TextElement>('bat-level')!.style.display = display;
		document.getElementById<TextElement>('bat-level-%')!.style.display = display;
	}

	@defer()
	private render() {
		const level = Math.floor(battery.chargeLevel) ?? 0;

		document.getElementById<TextElement>('bat-level')!.text = `${level > 0 ? level : '--'}`;

		const $indicator = document.getElementById<LineElement>('bat-indicator')!;
		$indicator.x2 = ($indicator.x1 as number) + Math.round(level * 0.23);

		if (battery.charging) {
			$indicator.style.fill = 'fb-black';
		} else if (level <= 16) {
			$indicator.style.fill = 'fb-black';
		} else if (level <= 30) {
			$indicator.style.fill = 'fb-peach';
		} else {
			$indicator.style.fill = 'fb-white';
		}
	}
}
