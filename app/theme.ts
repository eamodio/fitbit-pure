import { log } from '../common/system';
import { ConfigChanged, configuration } from './configuration';

export class Theme {
	constructor(private readonly $background: ImageElement) {
		configuration.onDidChange(e => this.onConfigurationChanged(e));

		this.onConfigurationChanged();
	}

	@log('Theme', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (e?.key != null && e?.key !== 'accentColor') return;

		this.$background.style.fill = configuration.get('accentColor');
	}
}
