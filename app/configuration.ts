import * as fs from 'fs';
import { MessageEvent, peerSocket } from 'messaging';
import { Config, defaultConfig } from '../common/config';
import { debounce, Event, EventEmitter, log } from '../common/system';

export { Colors } from '../common/config';

export interface ConfigChangeEvent {
	key: keyof Config;
}

class Configuration {
	private readonly _onDidChange = new EventEmitter<ConfigChangeEvent>();
	get onDidChange(): Event<ConfigChangeEvent> {
		return this._onDidChange.event;
	}

	private _config: Config;

	constructor() {
		this._config = this.load() ?? { ...defaultConfig };

		peerSocket.addEventListener('message', e => this.onMessageReceived(e));
	}

	@log('Configuration', {
		0: e => `key=${e.data.key}, value=${e.data.value}`
	})
	private onMessageReceived(e: MessageEvent) {
		if (e.data.key != null && this._config[e.data.key] === e.data.value) return;

		// If the key is `null` assume a reset
		if (e.data.key == null) {
			this._config = {
				...defaultConfig,
				donated: this._config.donated
			};
		} else {
			this._config[e.data.key] = e.data.value;
		}

		this.save();
		this._onDidChange.fire({ key: e.data.key });
	}

	get<T extends keyof Config>(key: T): NonNullable<Config[T]> {
		return (this._config[key] ?? defaultConfig[key]) as NonNullable<Config[T]>;
	}

	@log('Configuration')
	set<T extends keyof Config>(key: T, value: Config[T]): void {
		if (this._config[key] === value) return;

		this._config[key] = value;

		this.save();
		this._onDidChange.fire({ key: key });

		if (key !== 'currentActivityView') {
			// Send the modified setting to the companion
			this.send(key, value);
		}
	}

	@log('Configuration')
	private load(): Config | undefined {
		try {
			const config = fs.readFileSync('pure.settings', 'json') as Config;
			// console.log(`Configuration.load: loaded; json=${JSON.stringify(config)}`);
			return config;
		} catch (ex) {
			// console.log(`Configuration.load: failed; ex=${ex}`);
			return undefined;
		}
	}

	@debounce(500)
	@log('Configuration')
	private save() {
		try {
			fs.writeFileSync('pure.settings', this._config, 'json');
			// console.log(`Configuration.save: saved; json=${JSON.stringify(this._config)}`);
		} catch (ex) {
			console.log(`Configuration.save: failed; ex=${ex}`);
		}
	}

	@log('Configuration')
	private send<T extends keyof Config>(key: T, value: Config[T]) {
		if (peerSocket.readyState !== peerSocket.OPEN) {
			console.log(`Configuration.send: failed readyState=${peerSocket.readyState}`);

			return;
		}

		peerSocket.send({
			key: key,
			value: value != null ? JSON.stringify(value) : value
		});
	}
}

export const configuration = new Configuration();
