export interface Config {
	animateHeartRate: 'off' | 'interval' | 'pulse' | null;
	animateSeparator: boolean | null;
	aodOpacity: number | null;
	showActivityUnits: boolean | null;
	showBatteryPercentage: boolean | null;
	showDate: boolean | null;
	showLeadingZero: boolean | null;
	showRestingHeartRate: boolean | null;
	showSeconds: boolean | null;

	currentActivityView: number | null;
}

export const defaultConfig: Config = {
	animateHeartRate: 'pulse',
	animateSeparator: true,
	aodOpacity: 0.6,
	showActivityUnits: false,
	showBatteryPercentage: true,
	showDate: true,
	showLeadingZero: true,
	showRestingHeartRate: true,
	showSeconds: false,
	currentActivityView: 0
};

export const emptyConfig: Config = {
	animateHeartRate: null,
	animateSeparator: null,
	aodOpacity: null,
	showActivityUnits: null,
	showBatteryPercentage: null,
	showDate: null,
	showLeadingZero: null,
	showRestingHeartRate: null,
	showSeconds: null,
	currentActivityView: null
};
