import { peerSocket } from 'messaging';
import { device } from 'peer';
import { settingsStorage } from 'settings';
import {
	Config,
	ConfigChangeIpcMessage,
	ConfigSyncCheckIpcMessage,
	ConfigSyncIpcMessage,
	ConfigSyncRequestIpcMessage,
	defaultConfig,
	IpcMessage,
} from '../common/config';
import { addEventListener, Disposable } from '../common/system';

export class Configuration {
	private disposable: Disposable | undefined;

	constructor() {
		settingsStorage.setItem('modelName', device.modelName);

		// Ensure all the settings are defaulted in storage (otherwise the setting page won't work right)
		for (const key in defaultConfig) {
			try {
				if (settingsStorage.getItem(key) != null) continue;

				settingsStorage.setItem(key, JSON.stringify(defaultConfig[key]));
			} catch {}
		}

		this.disposable = addEventListener(settingsStorage, 'change', e => this.onSettingsStorageChanged(e));

		peerSocket.addEventListener('message', ({ data }) => this.onMessageReceived(data));
		const disposable = addEventListener(peerSocket, 'open', () => {
			// console.log('Configuration.onPeerSocketOpen');

			disposable.dispose();
			// Send a message to ensure the watch/companion are in sync
			this.sendSyncCheck();
		});

		// peerSocket.addEventListener('close', () => console.log('Configuration.onPeerSocketClose'));
		// peerSocket.addEventListener('error', e => console.log(`Configuration.onPeerSocketError: ${e.code} ${e.message}`));
	}

	get donated(): boolean {
		return settingsStorage.getItem('donated') === 'true';
	}

	get version(): number {
		return Number(settingsStorage.getItem('version') ?? 0);
	}

	private onMessageReceived(msg: IpcMessage) {
		switch (msg.type) {
			case 'config-change': {
				const version = this.version;

				// console.log(`${msg.type}(${msg.data.version} <- ${version}): ${msg.data.key}=${msg.data.value}`);

				// If we are more than 1 version out of date, request a sync
				if (version < msg.data.version - 1) {
					// console.log(`${msg.type}(${msg.data.version} <- ${version}): companion is out of date`);

					this.sendSyncRequest();

					return;
				}

				const { key, value } = msg.data;

				// If the key is `null` assume a reset
				if (key == null) {
					this.resetToDefaults(msg.data.version, true);

					return;
				}

				if (this.get(key) === value) return;

				this.updateVersion(version > msg.data.version ? version + 1 : msg.data.version);
				this.set(key, value);

				// If there is a discrepancy in the donation flag, trust whoever is true
				const donated = this.donated;
				if (donated !== msg.data.donated) {
					if (donated) {
						// console.log(`${msg.type}(${msg.data.version}): watch(donated) is out of date`);

						this.sendSync();
					} else {
						// console.log(`${msg.type}(${msg.data.version}): companion(donated) is out of date`);

						this.sendSyncRequest();
					}
				}

				// If the watch is out of date, send a sync (after saving the changed value)
				if (this.version > msg.data.version) {
					// console.log(`${msg.type}(${msg.data.version}): watch is out of date`);

					this.sendSync();
				}

				break;
			}
			case 'config-sync': {
				// console.log(`${msg.type}(${msg.data.version})`);

				this.updateVersion(msg.data.version);
				for (const key in msg.data) {
					this.set(key as keyof Config, msg.data[key]);
				}
				break;
			}
			case 'config-sync-check': {
				if ((this.donated && !msg.data.donated) || (this.version ?? 0) > msg.data.version) {
					// console.log(`${msg.type}(${msg.data.version}): sending sync`);

					this.sendSync();
				} else if ((this.version ?? 0) < msg.data.version) {
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
		const value = settingsStorage.getItem(key);
		return value != null ? JSON.parse(value) : value ?? undefined;
	}

	set<T extends keyof Config>(key: T, value: Config[T]): boolean {
		if (key === 'version') return false;

		// Don't allow turning the donated flag off
		if (key === 'donated' && value !== true) {
			return false;
		}

		if (value == null) {
			value = defaultConfig[key];
		}

		if (this.get(key) === value) return false;

		try {
			this.disposable?.dispose();

			settingsStorage.setItem(key, JSON.stringify(value ?? defaultConfig[key]));

			return true;
		} finally {
			this.disposable = addEventListener(settingsStorage, 'change', e => this.onSettingsStorageChanged(e));
		}
	}

	private onSettingsStorageChanged(e: StorageChangeEvent) {
		if (e.key === 'version') return;

		// console.log(`Configuration.onSettingsStorageChanged({ key: ${e.key}, newValue: ${e.newValue} })`);

		if (e.key == null) {
			this.resetToDefaults(this.version + 1);

			return;
		}

		if (e.oldValue === e.newValue) return;

		this.updateVersion(this.version + 1);
		this.send(e.key as keyof Config, e.newValue);
	}

	private resetToDefaults(version: number, silent: boolean = false) {
		this.updateVersion(version);

		try {
			this.disposable?.dispose();

			let changed = false;
			for (const key in defaultConfig) {
				if (key === 'version' || key === 'donated') continue;

				if (this.set(key as keyof Config, undefined)) {
					// console.log(`Configuration.resetToDefaults(${version}): key=${key}`);
					changed = true;
				}
			}

			if (changed && !silent) {
				this.sendSync();
			}
		} finally {
			this.disposable = addEventListener(settingsStorage, 'change', e => this.onSettingsStorageChanged(e));
		}
	}

	private updateVersion(version: number) {
		try {
			this.disposable?.dispose();

			settingsStorage.setItem('version', JSON.stringify(version));
		} finally {
			this.disposable = addEventListener(settingsStorage, 'change', e => this.onSettingsStorageChanged(e));
		}
	}

	private send(key: keyof Config | null, value: string | null): boolean {
		if (peerSocket.readyState !== peerSocket.OPEN) {
			console.log(`Configuration.send: failed readyState=${peerSocket.readyState}`);

			return false;
		}

		// console.log(`Configuration.send(${key}, ${value})`);

		if (key != null && typeof defaultConfig[key] === 'object') {
			if (value != null && value[0] === '{' && value[value.length - 1] === '}') {
				try {
					const selected = JSON.parse(value);
					if (Array.isArray(selected.values) && Array.isArray(selected.selected)) {
						value = JSON.stringify(selected.values[0].value);
						// console.log(`Configuration.send(${key}, ${value}): massaged value`);
					}
				} catch {}
			}
		}

		const msg: ConfigChangeIpcMessage = {
			type: 'config-change',
			data: {
				version: this.version,
				donated: this.donated,
				key: key,
				value: value != null ? JSON.parse(value) : value,
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

		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		const config: Config = {} as Config;
		for (const key in defaultConfig) {
			config[key] = this.get(key as keyof Config);
		}

		const msg: ConfigSyncIpcMessage = {
			type: 'config-sync',
			data: {
				...defaultConfig,
				...config,
				version: this.version,
			},
		};
		peerSocket.send(msg);

		return true;
	}

	private sendSyncCheck() {
		if (peerSocket.readyState !== peerSocket.OPEN) {
			console.log(`Configuration.sendSyncCheck: failed readyState=${peerSocket.readyState}`);

			return false;
		}

		// console.log('Configuration.sendSyncCheck()');

		const msg: ConfigSyncCheckIpcMessage = {
			type: 'config-sync-check',
			data: {
				version: this.version,
				donated: this.donated,
			},
		};
		peerSocket.send(msg);

		return true;
	}

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
