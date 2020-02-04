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
	document.getElementById<GroupElement>('time-display')!,
	document.getElementById<ImageElement>('time-hour0')!,
	document.getElementById<ImageElement>('time-hour1')!,
	document.getElementById<ImageElement>('time-separator')!,
	document.getElementById<ImageElement>('time-minute0')!,
	document.getElementById<ImageElement>('time-minute1')!,
	document.getElementById<TextElement>('time-seconds')!,
	document.getElementById<GroupElement>('date-display')!,
	document.getElementById<TextElement>('date-date')!,
	document.getElementById<TextElement>('date-highlight')!,
	document.getElementById<RectElement>('date-highlight-bg')!
);

new BatteryDisplay(
	// document.getElementById<ImageElement>('battery-icon')!,
	document.getElementById<LineElement>('battery-indicator')!,
	document.getElementById<TextElement>('battery-level')!
	// document.getElementById<TextElement>('battery-until-charged')!
);

new HeartRateDisplay(
	appManager,
	document.getElementById<TextElement>('heartrate-rate')!,
	document.getElementById<TextElement>('heartrate-resting')!
);

new ActivityDisplay(appManager, document.getElementById<GroupElement>('cycleview')!, [
	{
		$container: document.getElementById<GroupElement>('activity1-display')!,
		left: {
			name: 'steps',
			rtl: false,
			$goal: document.getElementById<ArcElement>('activity1-left-goal')!,
			$progress: document.getElementById<ArcElement>('activity1-left-progress')!,
			$icon: document.getElementById<ImageElement>('activity1-left-icon')!,
			$value: document.getElementById<TextElement>('activity1-left-value')!,
			$units: document.getElementById<TextElement>('activity1-left-units')!
		},
		right: {
			name: 'distance',
			rtl: true,
			$goal: document.getElementById<ArcElement>('activity1-right-goal')!,
			$progress: document.getElementById<ArcElement>('activity1-right-progress')!,
			$icon: document.getElementById<ImageElement>('activity1-right-icon')!,
			$value: document.getElementById<TextElement>('activity1-right-value')!,
			$units: document.getElementById<TextElement>('activity1-right-units')!
		}
	},
	{
		$container: document.getElementById<GroupElement>('activity2-display')!,
		left: {
			name: 'activeMinutes',
			rtl: false,
			$goal: document.getElementById<ArcElement>('activity2-left-goal')!,
			$progress: document.getElementById<ArcElement>('activity2-left-progress')!,
			$icon: document.getElementById<ImageElement>('activity2-left-icon')!,
			$value: document.getElementById<TextElement>('activity2-left-value')!,
			$units: document.getElementById<TextElement>('activity2-left-units')!
		},
		right: {
			name: 'calories',
			rtl: true,
			$goal: document.getElementById<ArcElement>('activity2-right-goal')!,
			$progress: document.getElementById<ArcElement>('activity2-right-progress')!,
			$icon: document.getElementById<ImageElement>('activity2-right-icon')!,
			$value: document.getElementById<TextElement>('activity2-right-value')!,
			$units: document.getElementById<TextElement>('activity2-right-units')!
		}
	}
]);
