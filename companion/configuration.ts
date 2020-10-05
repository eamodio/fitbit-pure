// import { me as companion } from 'companion';
import { peerSocket } from 'messaging';
import { device } from 'peer';
import { settingsStorage } from 'settings';
import { Config, ConfigIpcMessage, defaultConfig, IpcMessage } from '../common/config';
import { addEventListener, Disposable } from '../common/system';

export class Configuration {
	private _disposable: Disposable | undefined;

	constructor() {
		this.ensureDefaultsAndMigrate();

		peerSocket.addEventListener('message', ({ data }) => this.onMessageReceived(data));

		// peerSocket.addEventListener('open', () => console.log('Configuration.onPeerSocketOpen'));
		// peerSocket.addEventListener('close', () => console.log('Configuration.onPeerSocketClose'));
		// peerSocket.addEventListener('error', e =>
		// 	console.log(`Configuration.onPeerSocketError: ${e.code} ${e.message}`)
		// );

		// if (companion.launchReasons.settingsChanged) {
		// 	for (let i = 0; i < settingsStorage.length; i++) {
		// 		const key = settingsStorage.key(i);
		// 		if (key == null) continue;

		// 		this.send(key, settingsStorage.getItem(key));
		// 	}
		// }
	}

	private onMessageReceived(msg: IpcMessage) {
		if (msg.type === 'donated') {
			const donated = settingsStorage.getItem('donated') === 'true';
			if (donated !== msg.data.donated) {
				// If the companion has donated === true, then trust it and send it to the device
				if (donated && !msg.data.donated) {
					this.send('donated', 'true');
				} else {
					this._disposable?.dispose();

					settingsStorage.setItem('donated', msg.data.donated.toString());

					this._disposable = addEventListener(settingsStorage, 'change', e =>
						this.onSettingsStorageChanged(e),
					);
				}
			}
		}

		if (msg.type !== 'config') return;

		const { key, value } = msg.data;
		if (key == null || settingsStorage.getItem(key) === value) return;

		this._disposable?.dispose();

		settingsStorage.setItem(key, value);

		this._disposable = addEventListener(settingsStorage, 'change', e => this.onSettingsStorageChanged(e));
	}

	private onSettingsStorageChanged(e: StorageChangeEvent) {
		if (e.key != null && e.oldValue === e.newValue) return;

		if (e.key == null) {
			this.ensureDefaultsAndMigrate();
		}

		this.send(e.key as keyof Config, e.newValue);
	}

	private ensureDefaultsAndMigrate() {
		this._disposable?.dispose();

		settingsStorage.setItem('modelName', device.modelName);

		try {
			for (const key in defaultConfig) {
				const value = settingsStorage.getItem(key);
				if (value == null) {
					settingsStorage.setItem(key, JSON.stringify(defaultConfig[key]));
				} else {
					switch (key) {
						case 'animateHeartRate':
							if (value !== 'true' && value !== 'false') {
								settingsStorage.setItem(key, JSON.stringify(value.indexOf('"value":"off"') === -1));
							}
							break;
						case 'aodOpacity':
							if (Number(value) <= 1) {
								settingsStorage.setItem(key, JSON.stringify(Number(value) * 100));
							}
							break;
					}
				}
			}
		} catch {}

		this._disposable = addEventListener(settingsStorage, 'change', e => this.onSettingsStorageChanged(e));
	}

	private send(key: keyof Config | null, value: string | null): boolean {
		if (peerSocket.readyState !== peerSocket.OPEN) {
			console.log(`Configuration.send: failed readyState=${peerSocket.readyState}`);

			return false;
		}

		if (key != null && typeof defaultConfig[key] === 'object') {
			if (value != null && value[0] === '{' && value[value.length - 1] === '}') {
				try {
					const selected = JSON.parse(value);
					if (Array.isArray(selected.values) && Array.isArray(selected.selected)) {
						value = JSON.stringify(selected.values[0].value);
						// console.log(`Configuration.send: massaged value; key=${key}, value=${value}`);
					}
				} catch {}
			}
		}

		const msg: ConfigIpcMessage = {
			type: 'config',
			data: {
				key: key,
				value: value != null ? JSON.parse(value) : value,
			},
		};
		peerSocket.send(msg);

		return true;
	}
}
