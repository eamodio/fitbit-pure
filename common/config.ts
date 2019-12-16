export interface Config {
	animateHeartRate: 'off' | 'interval' | 'pulse' | null;
	animateSeparator: boolean | null;
	showBatteryPercentage: boolean | null;
	showDate: boolean | null;
	showLeadingZero: boolean | null;
	showRestingHeartRate: boolean | null;
}

export const defaultConfig: Config = {
	animateHeartRate: 'pulse',
	animateSeparator: true,
	showBatteryPercentage: true,
	showDate: true,
	showLeadingZero: true,
	showRestingHeartRate: true
};
