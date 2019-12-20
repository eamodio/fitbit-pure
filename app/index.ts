import { me as app } from 'appbit';
import clock from 'clock';
import { display } from 'display';
import document from 'document';
import { TimeDisplay } from './time';
import { HeartRateDisplay } from './heartRate';
import { DateDisplay } from './date';
import { BatteryDisplay } from './battery';
// import { Snow } from './snow';

// Update the clock every minute
clock.granularity = 'minutes';

if (display.aodAvailable && app.permissions.granted('access_aod')) {
	// Says we support AOD
	display.aodAllowed = true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const displays = [
	new TimeDisplay(
		getElementById<GroupElement>('time-display'),
		getElementById<ImageElement>('time-hour0'),
		getElementById<ImageElement>('time-hour1'),
		getElementById<ImageElement>('time-separator'),
		getElementById<ImageElement>('time-minute0'),
		getElementById<ImageElement>('time-minute1')
	),
	new DateDisplay(
		getElementById<GroupElement>('date-display'),
		getElementById<TextElement>('date-date'),
		getElementById<TextElement>('date-highlight')
	),
	new BatteryDisplay(
		getElementById<GroupElement>('battery-display'),
		getElementById<ImageElement>('battery-icon'),
		getElementById<TextElement>('battery-level')
	),
	new HeartRateDisplay(
		getElementById<GroupElement>('heartrate-display'),
		{
			off: getElementById<GraphicsElement>('heartrate-icon--off'),
			interval: getElementById<GraphicsElement>('heartrate-icon--interval'),
			pulse: getElementById<GraphicsElement>('heartrate-icon--pulse')
		},
		getElementById<TextElement>('heartrate-rate'),
		getElementById<TextElement>('heartrate-resting')
	)
	// new Snow()
];

function getElementById<T extends Element>(selector: string): T {
	return document.getElementById(selector)! as T;
}
