import clock from 'clock';
import document from 'document';
import { TimeDisplay } from './time';
import { HeartRateDisplay } from './heartRate';
import { DateDisplay } from './date';
import { BatteryDisplay } from './battery';
// import { Snow } from './snow';

// Update the clock every minute
clock.granularity = 'minutes';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const displays = [
	new TimeDisplay(
		getElementById<GraphicsElement>('time-display'),
		getElementById<ImageElement>('time-hour0'),
		getElementById<ImageElement>('time-hour1'),
		getElementById<ImageElement>('time-separator'),
		getElementById<ImageElement>('time-minute0'),
		getElementById<ImageElement>('time-minute1')
	),
	new DateDisplay(
		getElementById<GraphicsElement>('date-display'),
		getElementById<TextElement>('date-date'),
		getElementById<TextElement>('date-highlight')
	),
	new BatteryDisplay(
		getElementById<GraphicsElement>('battery-display'),
		getElementById<ImageElement>('battery-icon'),
		getElementById<TextElement>('battery-level')
	),
	new HeartRateDisplay(
		getElementById<GraphicsElement>('heartrate-display'),
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
