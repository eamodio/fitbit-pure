import { me as app } from 'appbit';
import { display } from 'display';
import { appManager } from './appManager';
// import { memory } from 'system';

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

appManager.start();
