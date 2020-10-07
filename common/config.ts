export type Colors =
	| 'fb-black'
	| 'fb-dark-gray'
	| 'fb-light-gray'
	| 'fb-white'
	| 'fb-lavender'
	| 'fb-slate'
	| 'fb-blue'
	| 'fb-cyan'
	| 'fb-aqua'
	| 'fb-cerulean'
	| 'fb-indigo'
	| 'fb-purple'
	| 'fb-violet'
	| 'fb-plum'
	| 'fb-magenta'
	| 'fb-pink'
	| 'fb-red'
	| 'fb-orange'
	| 'fb-peach'
	| 'fb-yellow'
	| 'fb-lime'
	| 'fb-mint'
	| 'fb-green';

export interface Config {
	version: number | undefined;

	accentBackgroundColor: Colors | undefined;
	accentForegroundColor: Colors | undefined;
	allowEditing: boolean | undefined;
	animateHeartRate: boolean | undefined;
	animateSeparator: boolean | undefined;
	aodOpacity: number | undefined;
	autoRotate: boolean | undefined;
	autoRotateInterval: number | undefined;
	colorizeHeartRate: boolean | undefined;
	donated: boolean | undefined;
	showActivityUnits: boolean | undefined;
	showBatteryPercentage: boolean | undefined;
	showDate: boolean | undefined;
	showDayOnDateHide: boolean | undefined;
	showLeadingZero: boolean | undefined;
	showRestingHeartRate: boolean | undefined;
	showSeconds: boolean | undefined;

	currentActivityView: number | undefined;
}

export const defaultConfig: Config = {
	version: 0,

	accentBackgroundColor: 'fb-black',
	accentForegroundColor: 'fb-white',
	allowEditing: true,
	animateHeartRate: true,
	animateSeparator: true,
	aodOpacity: 60,
	autoRotate: false,
	autoRotateInterval: 3000,
	colorizeHeartRate: true,
	donated: false,
	showActivityUnits: true,
	showBatteryPercentage: true,
	showDate: true,
	showDayOnDateHide: true,
	showLeadingZero: true,
	showRestingHeartRate: false,
	showSeconds: false,
	currentActivityView: 0,
};

export interface ConfigChangeIpcMessage {
	type: 'config-change';
	data: {
		version: number;
		donated: boolean;
		key: keyof Config | null;
		value: any;
	};
}

export interface ConfigSyncIpcMessage {
	type: 'config-sync';
	data: Config & { version: number };
}

export interface ConfigSyncCheckIpcMessage {
	type: 'config-sync-check';
	data: {
		version: number;
		donated: boolean;
	};
}

export interface ConfigSyncRequestIpcMessage {
	type: 'config-sync-request';
}

export type IpcMessage =
	| ConfigChangeIpcMessage
	| ConfigSyncIpcMessage
	| ConfigSyncCheckIpcMessage
	| ConfigSyncRequestIpcMessage;
