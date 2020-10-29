import { battery } from 'power';
import document from 'document';
import { display } from 'display';
import { AppEvent, appManager } from './appManager';
import { ConfigChangeEvent, configuration } from './configuration';
import { debounce, defer } from '../common/system';

export class BatteryDisplay {
	constructor() {
		configuration.onDidChange(this.onConfigurationChanged, this);
		appManager.onDidTriggerAppEvent(this.onAppEvent, this);
		battery.addEventListener('change', this.onBatteryChanged.bind(this));

		this.onConfigurationChanged();
	}

	private _paused: boolean = false;
	get paused(): boolean {
		return this._paused;
	}
	set paused(value: boolean) {
		this._paused = value;

		if (!value) {
			this.onConfigurationChanged();
		}
	}

	private onAppEvent(e: AppEvent) {
		if (this.paused || e.type !== 'display') return;

		if (e.display.on && !e.display.aodActive) {
			this.render();
		}
	}

	@debounce(500)
	private onBatteryChanged() {
		if (this.paused) return;

		this.render();
	}

	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (this.paused) return;
		if (e?.key != null && e.key !== 'showBatteryPercentage') return;

		const percentageDisplay = configuration.get('showBatteryPercentage') ? 'inline' : 'none';
		document.getElementById<TextElement>('bat-level')!.style.display = percentageDisplay;
		document.getElementById<TextElement>('bat-level-%')!.style.display = percentageDisplay;

		if (e?.key == null && display.on && !display.aodActive) {
			this.render();
		}
	}

	@defer()
	private render() {
		if (this.paused) return;

		const level = Math.floor(battery.chargeLevel) ?? 0;

		document.getElementById<TextElement>('bat-level')!.text = `${level > 0 ? level : '--'}`;

		const $indicator = document.getElementById<LineElement>('bat-indicator')!;
		$indicator.x2 = ($indicator.x1 as number) + Math.round(level * 0.23);

		if (battery.charging) {
			document.getElementById<LineElement>('bat-icon')!.style.visibility = 'hidden';
			$indicator.style.visibility = 'hidden';
		} else if (level <= 16) {
			document.getElementById<LineElement>('bat-icon')!.style.visibility = 'hidden';
			$indicator.style.visibility = 'hidden';
		} else if (level <= 30) {
			document.getElementById<LineElement>('bat-icon')!.style.visibility = 'visible';
			$indicator.style.visibility = 'visible';
			$indicator.style.fill = 'fb-peach';
		} else {
			document.getElementById<LineElement>('bat-icon')!.style.visibility = 'visible';
			$indicator.style.visibility = 'visible';
			$indicator.style.fill = 'fb-white';
		}
	}
}
