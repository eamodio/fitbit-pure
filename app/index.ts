import { me as app } from 'appbit';
import { display } from 'display';
import document from 'document';
import { Bars } from './bars';
import { BatteryDisplay } from './battery';
import { DateDisplay } from './date';
import { HeartRateDisplay } from './heartRate';
import { TimeDisplay } from './time';

if (display.aodAvailable && app.permissions.granted('access_aod')) {
	// Say we support AOD
	display.aodAllowed = true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const displays = [
	new Bars(getElementById<GroupElement>('top-bar'), getElementById<GroupElement>('bottom-bar')),
	new TimeDisplay(
		getElementById<GroupElement>('time-display'),
		getElementById<ImageElement>('time-hour0'),
		getElementById<ImageElement>('time-hour1'),
		getElementById<ImageElement>('time-separator'),
		getElementById<ImageElement>('time-minute0'),
		getElementById<ImageElement>('time-minute1'),
		getElementById<TextElement>('time-seconds')
	),
	new DateDisplay(
		getElementById<GroupElement>('date-display'),
		getElementById<TextElement>('date-date'),
		getElementById<TextElement>('date-highlight')
	),
	new BatteryDisplay(
		getElementById<ContainerElement>('battery-display'),
		getElementById<ImageElement>('battery-icon'),
		getElementById<LineElement>('battery-indicator'),
		getElementById<TextElement>('battery-level'),
		getElementById<TextElement>('battery-until-charged')
	),
	new HeartRateDisplay(
		getElementById<ContainerElement>('heartrate-display'),
		{
			off: getElementById<GraphicsElement>('heartrate-icon--off'),
			interval: getElementById<GraphicsElement>('heartrate-icon--interval'),
			pulse: getElementById<GraphicsElement>('heartrate-icon--pulse')
		},
		getElementById<TextElement>('heartrate-rate'),
		getElementById<TextElement>('heartrate-resting')
	)
];

function getElementById<T extends Element>(selector: string): T {
	return document.getElementById(selector)! as T;
}
