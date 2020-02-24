import * as fs from 'fs';
import { MessageEvent, peerSocket } from 'messaging';
import { Config, defaultConfig } from '../common/config';
import { debounce, Event, EventEmitter } from '../common/system';

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
		try {
			this._config = fs.readFileSync('pure.settings', 'json') as Config;
			// console.log(`Configuration.load: loaded; json=${JSON.stringify(config)}`);
		} catch (ex) {
			// console.log(`Configuration.load: failed; ex=${ex}`);

			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			this._config = {} as Config;
		}

		peerSocket.addEventListener('message', e => this.onMessageReceived(e));
	}

	private onMessageReceived(e: MessageEvent) {
		if (e.data.key != null && this._config[e.data.key] === e.data.value) return;

		// If the key is `null` assume a reset
		if (e.data.key == null) {
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			this._config = {
				donated: this._config.donated
			} as Config;
		} else {
			this._config[e.data.key] = e.data.value;
		}

		this.save();
		this._onDidChange.fire({ key: e.data.key });
	}

	get<T extends keyof Config>(key: T): NonNullable<Config[T]> {
		return (this._config[key] ?? defaultConfig[key]) as NonNullable<Config[T]>;
	}

	set<T extends keyof Config>(key: T, value: NonNullable<Config[T]>): void {
		// Only save, non-default values
		if (defaultConfig[key] === value) {
			value = undefined!;
		}
		if (this._config[key] === value) return;

		this._config[key] = value;

		this.save();
		this._onDidChange.fire({ key: key });

		if (key !== 'currentActivityView') {
			// Send the modified setting to the companion
			this.send(key, value);
		}
	}

	@debounce(500)
	private save() {
		try {
			fs.writeFileSync('pure.settings', this._config, 'json');
			// console.log(`Configuration.save: saved; json=${JSON.stringify(this._config)}`);
		} catch (ex) {
			console.log(`Configuration.save: failed; ex=${ex}`);
		}
	}

	private send<T extends keyof Config>(key: T, value: Config[T]) {
		if (peerSocket.readyState !== peerSocket.OPEN) {
			console.log(`Configuration.send: failed readyState=${peerSocket.readyState}`);

			return;
		}

		if (value === undefined) {
			value = defaultConfig[key];
		}

		peerSocket.send({
			key: key,
			value: value !== null ? JSON.stringify(value) : value
		});
	}
}

export const configuration = new Configuration();
