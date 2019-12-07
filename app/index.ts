import document from 'document';
import clock from 'clock';
import { TimeDisplay } from './time';
import { HeartRateDisplay } from './heartRate';
import { DateDisplay } from './date';
import { configuration } from './configuration';
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
	configuration.get('showDate') !== 'off'
		? new DateDisplay(
				getElementById<GraphicsElement>('date-display'),
				getElementById<TextElement>('date-date'),
				getElementById<TextElement>('date-highlight')
		  )
		: undefined,
	new BatteryDisplay(
		getElementById<GraphicsElement>('battery-display'),
		getElementById<ImageElement>('battery-icon'),
		getElementById<TextElement>('battery-level')
	),
	new HeartRateDisplay(
		getElementById<GraphicsElement>('heartrate-display'),
		getElementById<ImageElement>('heartrate-icon'),
		getElementById<TextElement>('heartrate-rate'),
		getElementById<TextElement>('heartrate-resting'),
		getElementById<GroupElement>('heartrate-pulse')
	)
	// new Snow()
];

function getElementById<T extends Element>(selector: string): T {
	return document.getElementById(selector)! as T;
}
