import { display, Display } from 'display';
import { log } from '../common/system';

export class Bars {
	constructor(private readonly $top: GroupElement, private readonly $bottom: GroupElement) {
		display.addEventListener('change', () => this.onDisplayChanged(display));
	}

	@log('Bars', {
		0: sensor => `on=${sensor.on}, aodActive=${sensor.aodActive}`
	})
	private onDisplayChanged(sensor: Display) {
		if (!sensor.aodEnabled) return;

		requestAnimationFrame(() => {
			const animation = sensor.aodActive ? 'unload' : 'load';
			this.$top.animate(animation);
			this.$bottom.animate(animation);
		});
	}
}
