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
	accentBackgroundColor: Colors | null;
	accentForegroundColor: Colors | null;
	allowEditing: boolean | null;
	animateHeartRate: 'off' | 'interval' | 'pulse' | null;
	animateSeparator: boolean | null;
	aodOpacity: number | null;
	donated: boolean | null;
	showActivityUnits: boolean | null;
	showBatteryPercentage: boolean | null;
	showDate: boolean | null;
	showDayOnDateHide: boolean | null;
	showLeadingZero: boolean | null;
	showRestingHeartRate: boolean | null;
	showSeconds: boolean | null;

	currentActivityView: number | null;
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
