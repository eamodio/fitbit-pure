import { Config } from '../common/config';

class Configuration {
	get<T extends keyof Config>(key: T): NonNullable<Config[T]> {
		switch (key) {
			case 'blinkSeparator':
				return (true ?? true) as NonNullable<Config[T]>;
			case 'showBatteryPercentage':
				return (true ?? true) as NonNullable<Config[T]>;
			case 'showDate':
				return ('on' ?? 'onlyWhenDisplayOn') as NonNullable<Config[T]>;
			case 'showLeadingZero':
				return (true ?? true) as NonNullable<Config[T]>;
			case 'showRestingHeartRate':
				return (true ?? true) as NonNullable<Config[T]>;
			default:
				throw new Error(`Unknown key=${key}`);
		}
	}
}

export const configuration = new Configuration();
