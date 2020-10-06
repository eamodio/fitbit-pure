import { battery, Battery } from 'power';
import document from 'document';
import { display } from 'display';
import { ConfigChangeEvent, configuration } from './configuration';
import { addEventListener, debounce, defer, Disposable } from '../common/system';
import { AppEvent, appManager } from './appManager';

export class BatteryDisplay implements Disposable {
	private disposed: boolean = false;
	private readonly disposable: Disposable;

	constructor() {
		this.disposable = Disposable.from(
			configuration.onDidChange(this.onConfigurationChanged, this),
			appManager.onDidTriggerAppEvent(this.onAppEvent, this),
			addEventListener(battery, 'change', () => this.onBatteryChanged(battery)),
		);

		this.onConfigurationChanged();

		if (display.on && !display.aodActive) {
			this.render();
		}
	}

	dispose(): void {
		this.disposed = true;
		this.disposable.dispose();
	}

	private onAppEvent(e: AppEvent) {
		if (this.disposed || e.type !== 'display') return;

		if (e.display.on && !e.display.aodActive) {
			this.render();
		}
	}

	@debounce(500)
	private onBatteryChanged(_sensor: Battery) {
		if (this.disposed) return;

		this.render();
	}

	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (this.disposed) return;
		if (e?.key != null && e.key !== 'showBatteryPercentage') return;

		const display = configuration.get('showBatteryPercentage') ? 'inline' : 'none';
		document.getElementById<TextElement>('bat-level')!.style.display = display;
		document.getElementById<TextElement>('bat-level-%')!.style.display = display;
	}

	@defer()
	private render() {
		if (this.disposed) return;

		const level = Math.floor(battery.chargeLevel) ?? 0;

		document.getElementById<TextElement>('bat-level')!.text = `${level > 0 ? level : '--'}`;

		const $indicator = document.getElementById<LineElement>('bat-indicator')!;
		$indicator.x2 = ($indicator.x1 as number) + Math.round(level * 0.23);

		if (battery.charging) {
			$indicator.style.fill = 'fb-green';
		} else if (level <= 16) {
			$indicator.style.fill = 'fb-red';
		} else if (level <= 30) {
			$indicator.style.fill = 'fb-peach';
		} else {
			$indicator.style.fill = 'fb-white';
		}
	}
}
