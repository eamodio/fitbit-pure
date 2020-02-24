import * as fs from 'fs';
import { peerSocket } from 'messaging';
import { Config, ConfigIpcMessage, defaultConfig, DonatedIpcMessage, IpcMessage } from '../common/config';
import { debounce, Event, EventEmitter } from '../common/system';

export { Colors } from '../common/config';

export interface ConfigChangeEvent {
	key: keyof Config | null;
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

		peerSocket.addEventListener('message', ({ data }) => this.onMessageReceived(data));

		// Send a message to ensure the companion has the correct donation state
		setTimeout(() => this.ensureCompanionState(), 1000);
	}

	private onMessageReceived(msg: IpcMessage) {
		if (msg.type !== 'config') return;

		const { key, value } = msg.data;
		if (key != null && this._config[key] === value) return;

		// If the key is `null` assume a reset
		if (key == null) {
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			this._config = {
				donated: this._config.donated
			} as Config;
		} else {
			this._config[key] = defaultConfig[key] === value ? undefined : value;
		}

		this.save();
		this._onDidChange.fire({ key: key });
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

	private ensureCompanionState() {
		if (peerSocket.readyState !== peerSocket.OPEN) return;

		const msg: DonatedIpcMessage = {
			type: 'donated',
			data: {
				donated: this._config.donated ?? false
			}
		};
		peerSocket.send(msg);
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

	private send<T extends keyof Config>(key: T, value: Config[T]): boolean {
		if (peerSocket.readyState !== peerSocket.OPEN) {
			console.log(`Configuration.send: failed readyState=${peerSocket.readyState}`);

			return false;
		}

		if (value === undefined) {
			value = defaultConfig[key];
		}

		const msg: ConfigIpcMessage = {
			type: 'config',
			data: {
				key: key,
				value: value !== null ? JSON.stringify(value) : value
			}
		};
		peerSocket.send(msg);

		return true;
	}
}

export const configuration = new Configuration();
