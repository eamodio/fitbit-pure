import * as fs from 'fs';
import { display } from 'display';
import { peerSocket } from 'messaging';
import {
	Config,
	ConfigChangeIpcMessage,
	ConfigSyncIpcMessage,
	ConfigSyncRequestIpcMessage,
	defaultConfig,
	IpcMessage,
} from '../common/config';
import { debounce, Event, EventEmitter } from '../common/system';

export { Backgrounds, Colors } from '../common/config';

export interface ConfigChangeEvent {
	key: keyof Config | null;
}

class Configuration {
	private readonly _onDidChange = new EventEmitter<ConfigChangeEvent>();
	get onDidChange(): Event<ConfigChangeEvent> {
		return this._onDidChange.event;
	}

	private config: Config;

	constructor() {
		let donated = false;
		try {
			this.config = fs.readFileSync('pure.settings', 'json') as Config;
			donated = this.donated;

			// // Migrate settings
			// let migrated = false;
			// if (this.config.animateHeartRate === null || (this.config.animateHeartRate as any) !== 'off') {
			// 	migrated = true;
			// 	this.config.animateHeartRate = undefined;
			// } else if (this.config.animateHeartRate != null) {
			// 	migrated = true;
			// 	this.config.animateHeartRate = false;
			// }

			// if (this.config.aodOpacity != null && this.config.aodOpacity <= 1) {
			// 	migrated = true;
			// 	this.config.aodOpacity = this.config.aodOpacity * 100;
			// 	if (this.config.aodOpacity === defaultConfig.aodOpacity) {
			// 		this.config.aodOpacity = undefined;
			// 	}
			// }

			// if (migrated) {
			// 	setTimeout(() => this.save(), 0);
			// }

			// console.log(`Configuration.load: loaded; json=${JSON.stringify(config)}`);
		} catch (ex) {
			console.log(`Configuration.load: failed; ex=${ex}`);

			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			this.config = { donated: donated } as Config;

			this.sendSyncRequest();
		}

		peerSocket.addEventListener('message', ({ data }) => this.onMessageReceived(data));

		// Send a message to ensure the watch/companion are in sync
		// setTimeout(() => this.sendSyncCheck(), 500);
	}

	get donated(): boolean {
		return this.config.donated ?? false;
	}

	get version(): number {
		return this.config.version ?? 0;
	}

	private onMessageReceived(msg: IpcMessage) {
		switch (msg.type) {
			case 'config-change': {
				const version = this.version;

				// console.log(`${msg.type}(${msg.data.version} <- ${version}): ${msg.data.key}=${msg.data.value}`);

				// If we are more than 1 version out of date, request a sync
				if (version < msg.data.version - 1) {
					// console.log(`${msg.type}(${msg.data.version} <- ${version}): watch is out of date`);

					this.sendSyncRequest();

					return;
				}

				const { key, value } = msg.data;
				if (key != null && this.config[key] === value) return;

				// If the key is `null` assume a reset
				if (key == null) {
					// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
					this.config = {
						donated: this.donated,
					} as Config;
				} else {
					this.config[key] = defaultConfig[key] === value ? undefined : value;
				}

				if (key !== 'aodOpacity') {
					display.poke();
				}

				this.save(version > msg.data.version ? version + 1 : msg.data.version);

				// If there is a discrepancy in the donation flag, trust whoever is true
				if (this.donated !== msg.data.donated) {
					if (this.donated) {
						// console.log(`${msg.type}(${msg.data.version}): companion(donated) is out of date`);

						this.sendSync();
					} else {
						// console.log(`${msg.type}(${msg.data.version}): watch(donated) is out of date`);

						this.sendSyncRequest();
					}
				}

				// If the companion is out of date, send a sync (after saving the changed value)
				if (version > msg.data.version) {
					// console.log(`${msg.type}(${msg.data.version}): companion is out of date`);

					this.sendSync();
				}

				this._onDidChange.fire({ key: key });

				break;
			}

			case 'config-sync': {
				// console.log(`${msg.type}(${msg.data.version})`);

				let changed = false;
				for (const key in msg.data) {
					if (this.set(key as keyof Config, msg.data[key], true)) {
						changed = true;
					}
				}

				if (changed) {
					this.save(msg.data.version);
					this._onDidChange.fire({ key: null });
				}
				break;
			}

			case 'config-sync-check': {
				if ((this.donated && !msg.data.donated) || this.version > msg.data.version) {
					// console.log(`${msg.type}(${msg.data.version}): sending sync`);

					this.sendSync();
				} else if (this.version < msg.data.version) {
					// console.log(`${msg.type}(${msg.data.version}): requesting sync`);

					this.sendSyncRequest();
				} else {
					// console.log(`${msg.type}(${msg.data.version}): sync'd`);
				}
				break;
			}

			case 'config-sync-request': {
				// console.log(`${msg.type}`);

				this.sendSync();

				break;
			}
		}
	}

	get<T extends keyof Config>(key: T): NonNullable<Config[T]> {
		return (this.config[key] ?? defaultConfig[key]) as NonNullable<Config[T]>;
	}

	set<T extends keyof Config>(key: T, value: NonNullable<Config[T]>, silent: boolean = false): boolean {
		if (key === 'version') return false;

		// Don't allow turning the donated flag off
		if (key === 'donated' && value !== true) {
			return false;
		}

		// Only save, non-default values
		if (defaultConfig[key] === value) {
			value = undefined!;
		}
		if (this.config[key] === value) return false;

		this.config[key] = value;

		if (silent) return true;

		const isLocal = this.isLocalSetting(key);
		this.save(isLocal ? this.version : this.version + 1);

		this._onDidChange.fire({ key: key });

		if (isLocal) return true;

		display.poke();

		// Send the modified setting to the companion
		this.send(key, value);

		return true;
	}

	private isLocalSetting(key: keyof Config): boolean {
		// 'currentActivityView' is a local only setting
		return key === 'currentActivityView';
	}

	private save(version: number) {
		if (version > this.version) {
			this.config.version = version;
		}
		this.saveCore();
	}

	@debounce(500)
	private saveCore() {
		try {
			fs.writeFileSync('pure.settings', this.config, 'json');
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

		// console.log(`Configuration.send(${key}, ${value})`);

		if (value == null) {
			value = defaultConfig[key];
		}

		const msg: ConfigChangeIpcMessage = {
			type: 'config-change',
			data: {
				version: this.version,
				donated: this.donated,
				key: key,
				value: value,
			},
		};
		peerSocket.send(msg);

		return true;
	}

	private sendSync(): boolean {
		if (peerSocket.readyState !== peerSocket.OPEN) {
			console.log(`Configuration.sendSync: failed readyState=${peerSocket.readyState}`);

			return false;
		}

		// console.log('Configuration.sendSync()');

		const msg: ConfigSyncIpcMessage = {
			type: 'config-sync',
			data: {
				...defaultConfig,
				...this.config,
				version: this.version,
			},
		};
		peerSocket.send(msg);

		return true;
	}

	// private sendSyncCheck() {
	// 	if (peerSocket.readyState !== peerSocket.OPEN) {
	// 		console.log(`Configuration.sendSyncCheck: failed readyState=${peerSocket.readyState}`);

	// 		return false;
	// 	}

	// 	console.log('Configuration.sendSyncCheck');

	// 	const msg: ConfigSyncCheckIpcMessage = {
	// 		type: 'config-sync-check',
	// 		data: {
	// 			timestamp: this.config.timestamp ?? 0,
	// 			donated: this.config.donated ?? false,
	// 		},
	// 	};
	// 	peerSocket.send(msg);

	// 	return true;
	// }

	private sendSyncRequest(): boolean {
		if (peerSocket.readyState !== peerSocket.OPEN) {
			console.log(`Configuration.sendSyncRequest: failed readyState=${peerSocket.readyState}`);

			return false;
		}

		// console.log('Configuration.sendSyncRequest()');

		const msg: ConfigSyncRequestIpcMessage = {
			type: 'config-sync-request',
		};
		peerSocket.send(msg);

		return true;
	}
}

export const configuration = new Configuration();
