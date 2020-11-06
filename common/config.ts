export type Backgrounds =
	| 'none'
	| 'beams'
	| 'bubbles'
	| 'clouds'
	| 'drops'
	| 'geometric'
	| 'glow'
	| 'lines'
	| 'oil'
	| 'rings'
	| 'smoke'
	| 'snake'
	| 'swirl';

export type Colors =
	| 'fb-white'
	| 'fb-light-gray'
	| 'fb-dark-gray'
	| 'fb-cerulean'
	| 'fb-lavender'
	| 'fb-indigo'
	| 'fb-purple'
	| 'fb-plum'
	| 'fb-violet'
	| 'fb-pink'
	| 'fb-magenta'
	| 'fb-red'
	| 'fb-orange'
	| 'fb-peach'
	| 'fb-yellow'
	| 'fb-lime'
	| 'fb-green'
	| 'fb-mint'
	| 'fb-aqua'
	| 'fb-cyan'
	| 'fb-slate'
	| 'fb-blue';

export interface Config {
	version: number | undefined;

	accentBackgroundColor: Colors | undefined;
	accentForegroundColor: Colors | undefined;
	allowEditing: boolean | undefined;
	animateHeartRate: boolean | undefined;
	animateSeparator: boolean | undefined;
	aodOpacity: number | undefined;
	aodShowDay: boolean | undefined;
	autoRotate: boolean | undefined;
	autoRotateInterval: number | undefined;
	background: Backgrounds | undefined;
	backgroundOpacity: number | undefined;
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

	accentBackgroundColor: 'fb-light-gray',
	accentForegroundColor: 'fb-white',
	allowEditing: true,
	animateHeartRate: true,
	animateSeparator: true,
	aodOpacity: 60,
	aodShowDay: true,
	autoRotate: false,
	autoRotateInterval: 3000,
	background: 'glow',
	backgroundOpacity: 80,
	colorizeHeartRate: true,
	donated: false,
	showActivityUnits: true,
	showBatteryPercentage: true,
	showDate: true,
	showDayOnDateHide: false,
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
