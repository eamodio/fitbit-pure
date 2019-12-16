// import { me as companion } from 'companion';
import { peerSocket } from 'messaging';
import { settingsStorage } from 'settings';
import { defaultConfig } from '../common/config';
import { addEventListener, Disposable, log } from '../common/system';

const defaults = {
	...defaultConfig,
	animateHeartRate: {
		values: [{ name: 'Pulse (heart rate)', value: 'pulse' }],
		selected: [2]
	}
};

export class Configuration {
	private _disposable: Disposable | undefined;

	constructor() {
		this.ensureDefaults();

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

	@log('Configuration', {
		0: e => `e=${JSON.stringify(e)}`
	})
	private onSettingsStorageChanged(e: StorageChangeEvent) {
		if (e.key != null && e.oldValue === e.newValue) return;

		if (e.key == null) {
			this.ensureDefaults();
		}

		this.send(e.key, e.newValue);
	}

	private ensureDefaults() {
		this._disposable?.dispose();

		try {
			for (const key in defaults) {
				if (settingsStorage.getItem(key) == null) {
					settingsStorage.setItem(key, JSON.stringify(defaults[key]));
				}
			}
		} catch {}

		this._disposable = addEventListener(settingsStorage, 'change', e => this.onSettingsStorageChanged(e));
	}

	@log('Configuration', { 0: key => `key=${key}`, 1: value => `value=${value}` })
	private send(key: string | null, value: string | null) {
		if (peerSocket.readyState !== peerSocket.OPEN) {
			console.log(`Configuration.send: failed readyState=${peerSocket.readyState}`);

			return;
		}

		if (key != null && typeof defaults[key] === 'object') {
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

		peerSocket.send({
			key: key,
			value: value != null ? JSON.parse(value) : value
		});
	}
}
