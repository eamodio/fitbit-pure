import { me as app } from 'appbit';
import { display } from 'display';
import document from 'document';
// import { memory } from 'system';
import { ActivityDisplay } from './activity';
import { AppManager } from './appManager';
import { BatteryDisplay } from './battery';
import { HeartRateDisplay } from './heartRate';
import { TimeDisplay } from './time';

// setInterval(
// 	() =>
// 		console.log(
// 			`used=${memory.js.used}, total=${memory.js.total}, peak=${memory.js.peak}, pressure=${memory.monitor.pressure}`
// 		),
// 	2500
// );

if (display.aodAvailable && app.permissions.granted('access_aod')) {
	// Say we support AOD
	display.aodAllowed = true;
}

const appManager = new AppManager(document.getElementById<RectElement>('trigger')!);

new TimeDisplay(
	appManager,
	document.getElementById<ImageElement>('time-hour0')!,
	document.getElementById<ImageElement>('time-hour1')!,
	document.getElementById<ImageElement>('time-minute0')!,
	document.getElementById<ImageElement>('time-minute1')!,
	document.getElementById<TextElement>('time-seconds')!
);

new BatteryDisplay();

new HeartRateDisplay(appManager);

new ActivityDisplay(
	appManager,
	[
		{
			names: ['steps', 'distance'],
			goalReached: [false, false]
		},
		{
			names: ['activeMinutes', 'calories'],
			goalReached: [false, false]
		}
	],
	document.getElementById<GroupElement>('cycleview')!
);
