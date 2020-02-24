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
	accentBackgroundColor: Colors | undefined;
	accentForegroundColor: Colors | undefined;
	allowEditing: boolean | undefined;
	animateHeartRate: 'off' | 'interval' | 'pulse' | undefined;
	animateSeparator: boolean | undefined;
	aodOpacity: number | undefined;
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
	accentBackgroundColor: 'fb-black',
	accentForegroundColor: 'fb-white',
	allowEditing: true,
	animateHeartRate: 'pulse',
	animateSeparator: true,
	aodOpacity: 0.6,
	donated: false,
	showActivityUnits: true,
	showBatteryPercentage: true,
	showDate: true,
	showDayOnDateHide: true,
	showLeadingZero: true,
	showRestingHeartRate: true,
	showSeconds: false,
	currentActivityView: 0
};
