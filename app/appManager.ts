import { me as device } from 'device';
import { display, Display } from 'display';
import document from 'document';
import { vibration } from 'haptics';
import { ActivityDisplay } from './activity';
import { BatteryDisplay } from './battery';
import { Backgrounds, Colors, ConfigChangeEvent, configuration } from './configuration';
import { DonateView } from './donateView';
import { HeartRateDisplay } from './heartRate';
import { TimeDisplay } from './time';
import { addEventListener, Disposable, Event, EventEmitter } from '../common/system';

const screenHeight = device.screen.height;
const screenWidth = device.screen.width;

let backgrounds: Backgrounds[] | undefined;

const colors: Colors[] = [
	'fb-white',
	'fb-light-gray',
	'fb-dark-gray',
	'fb-cerulean',
	'fb-lavender',
	'fb-indigo',
	'fb-purple',
	'fb-plum',
	'fb-violet',
	'fb-pink',
	'fb-magenta',
	'fb-red',
	'fb-orange',
	'fb-peach',
	'fb-yellow',
	'fb-lime',
	'fb-green',
	'fb-mint',
	'fb-aqua',
	'fb-cyan',
	'fb-slate',
	'fb-blue',
];

const opacities = new Float32Array([
	0.35, // fb-white
	0.35, // fb-light-gray
	0.35, // fb-dark-gray
	0.5, // fb-cerulean
	0.4, // fb-lavender
	0.65, // fb-indigo
	0.5, // fb-purple
	0.55, // fb-plum
	0.45, // fb-violet
	0.4, // fb-pink
	0.4, // fb-magenta
	0.4, // fb-red
	0.4, // fb-orange
	0.35, // fb-peach
	0.35, // fb-yellow
	0.35, // fb-lime
	0.5, // fb-green
	0.35, // fb-mint
	0.35, // fb-aqua
	0.4, // fb-cyan
	0.55, // fb-slate
	0.55, // fb-blue
]);

let points:
	| [
			{ y: number; x1: number; x2: number; x3: number },
			{ y: number; x1: number; x2: number },
			{ y: number; x1: number; x2: number; x3: number },
	  ]
	| undefined;

export enum ActivityViews {
	Date = 0,
	Activity1 = 1,
	Activity2 = 2,
	Donate = 3,
}

export interface ActivityViewChangeEvent {
	type: 'activityView';
	previous: ActivityViews;
	view: ActivityViews;
}

export interface ClickEvent {
	type: 'click';
}

export interface DisplayChangeEvent {
	type: 'display';
	display: Display;
}

export interface EditingChangeEvent {
	type: 'editing';
	editing: boolean;
}

export type AppEvent = ActivityViewChangeEvent | ClickEvent | DisplayChangeEvent | EditingChangeEvent;

export class AppManager {
	private readonly _onDidTriggerAppEvent = new EventEmitter<AppEvent>();
	get onDidTriggerAppEvent(): Event<AppEvent> {
		return this._onDidTriggerAppEvent.event;
	}

	private donateDisposable: Disposable | undefined;
	private mouseClickCancelTimer: number | undefined;
	private mouseDownDisposable: Disposable | undefined;
	private mouseDownTimer: number | undefined;
	private $trigger!: RectElement;

	constructor() {}

	get donated(): boolean {
		return configuration.get('donated');
	}

	set donated(value: boolean) {
		configuration.set('donated', value);
	}

	private _editing = false;
	get editing(): boolean {
		return this._editing;
	}

	set editing(value: boolean) {
		if (this._editing === value) return;

		if (value && !this.donated) {
			void this.showDonateView();

			return;
		}

		backgrounds = undefined;
		points = undefined;

		this._editing = value;

		document.getElementById<ImageElement>('editing')!.style.display = value ? 'inline' : 'none';

		const $overlay = document.getElementById<GroupElement>('editable-overlay')!;
		$overlay.style.display = value ? 'inline' : 'none';
		if (value) {
			requestAnimationFrame(() => $overlay.animate('enable'));
		}

		this.fire({ type: 'editing', editing: value });
	}

	fire(e: AppEvent) {
		this._onDidTriggerAppEvent.fire(e);
	}

	private disposable: Disposable | undefined;
	start() {
		this.disposable?.dispose();

		this.$trigger = document.getElementById<RectElement>('trigger')!;

		this.disposable = Disposable.from(
			configuration.onDidChange(this.onConfigurationChanged, this),

			addEventListener(display, 'change', () => this.onDisplayChanged(display)),

			addEventListener(this.$trigger, 'click', e => this.onMouseClick(e)),
			addEventListener(this.$trigger, 'mousedown', e => this.onMouseDown(e)),
			addEventListener(this.$trigger, 'mouseup', e => this.onMouseUp(e)),

			new TimeDisplay(),
			new BatteryDisplay(),
			new HeartRateDisplay(),
			new ActivityDisplay(),
		);

		this.onConfigurationChanged();

		// DEMO MODE
		// this.demo();
	}

	async showDonateView() {
		this.disposable?.dispose();
		const view = new DonateView(this);
		try {
			const donated = await view.show();
			if (donated) {
				appManager.donated = true;
			}
		} finally {
			await document.location.replace('./resources/index.view');
			this.start();
		}
	}

	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (
			e?.key != null &&
			e.key !== 'accentBackgroundColor' &&
			e.key !== 'accentForegroundColor' &&
			e.key !== 'allowEditing' &&
			e.key !== 'background' &&
			e.key !== 'backgroundOpacity' &&
			e.key !== 'donated'
		) {
			return;
		}

		if (e?.key == null || e?.key === 'allowEditing') {
			if (!configuration.get('allowEditing')) {
				this.editing = false;
			}

			if (e?.key === 'allowEditing') return;
		}

		if (e?.key == null || e?.key === 'donated') {
			const $donateButton = document.getElementById<TextButtonElement>('donate-button')!;

			if (this.donated) {
				$donateButton.style.visibility = 'hidden';

				if (this.donateDisposable != null) {
					this.donateDisposable.dispose();
					this.donateDisposable = undefined;
				}
			} else {
				$donateButton.style.visibility = 'visible';

				this.donateDisposable?.dispose();
				this.donateDisposable = addEventListener($donateButton, 'click', () => this.onDonateClicked());
			}

			if (e?.key === 'donated') return;
		}

		if (e?.key == null || e?.key === 'accentBackgroundColor') {
			const color = configuration.get('accentBackgroundColor');
			const $els = document.getElementsByClassName<StyledElement>('theme-bg-color');

			let i = $els.length;
			let $el: StyledElement;
			while (i--) {
				$el = $els[i];
				$el.style.fill = color;
			}
		}

		if (e?.key == null || e?.key === 'accentForegroundColor') {
			const color = configuration.get('accentForegroundColor');
			const $els = document.getElementsByClassName<StyledElement>('theme-fg-color');

			const index = colors.indexOf(color);
			const opacity = Number(opacities[index === -1 ? 0 : index].toFixed(2));
			const separatorOpacity = opacity + 0.2;

			// console.log(`color=${color}, index=${index}, opacity=${opacity}`);

			let i = $els.length;
			let $el: StyledElement;
			while (i--) {
				$el = $els[i];

				if ($el.id === 'hr-icon' && configuration.get('colorizeHeartRate')) {
					continue;
				}

				$el.style.fill = color;

				if ($el.id === 'time-sep') {
					$el.style.fillOpacity = separatorOpacity;
					($el.children[0] as AnimateElement).from = separatorOpacity;
					($el.children[1] as AnimateElement).to = separatorOpacity;
				}

				if (display.aodAvailable) {
					let $animate = $el.getElementById<AnimateElement>('aod-in--fill');
					if ($animate != null) {
						$animate.to = color;
					}

					$animate = $el.getElementById<AnimateElement>('aod-in--fill-op');
					if ($animate != null) {
						$animate.to = opacity;
					}

					$animate = $el.getElementById<AnimateElement>('aod-out--fill');
					if ($animate != null) {
						$animate.from = color;
					}
				}
			}
		}

		if (e?.key == null || e?.key === 'background') {
			const $background = document.getElementById<ImageElement>('background')!;

			const background = configuration.get('donated') ? configuration.get('background') : 'none';
			if (background === 'none') {
				$background.style.visibility = 'hidden';
			} else {
				$background.href = `images/bg-${background}_336.png`;
				$background.style.visibility = 'visible';
			}
		}

		if (e?.key == null || e?.key === 'backgroundOpacity') {
			const $background = document.getElementById<ImageElement>('background')!;

			const opacity = configuration.get('backgroundOpacity') / 100;
			$background.style.opacity = opacity;
			($background.children[0] as AnimateElement).to = opacity;
			($background.children[1] as AnimateElement).from = opacity;
		}
	}

	private onDisplayChanged(sensor: Display) {
		this.editing = false;

		if (sensor.aodEnabled) {
			requestAnimationFrame(() => {
				const animation = sensor.aodActive ? 'unload' : 'load';
				document.getElementById<GroupElement>('top-bar')!.animate(animation);
				document.getElementById<GroupElement>('bottom-bar')!.animate(animation);
			});
		}

		this.fire({ type: 'display', display: sensor });
	}

	private onDonateClicked() {
		void this.showDonateView();
	}

	private onMouseClick(e: MouseEvent) {
		// console.log(`onMouseClick: e=${e.screenX},${e.screenY}`);

		if (this.mouseClickCancelTimer != null) {
			clearTimeout(this.mouseClickCancelTimer);
			this.mouseClickCancelTimer = undefined;

			return;
		}

		if (!isWithinBounds(this.mouseDownPoint, e)) {
			return;
		}

		if (!this.editing) {
			this.fire({ type: 'click' });

			return;
		}

		if (backgrounds == null) {
			backgrounds = [
				'none',
				'beams',
				'bubbles',
				'clouds',
				'drops',
				'geometric',
				'glow',
				'lines',
				'oil',
				'rings',
				'smoke',
				'snake',
				'swirl',
			];
		}

		if (points == null) {
			// 336x336 points
			points = [
				{ y: 2, x1: 2, x2: 130, x3: 254 },
				{ y: 128, x1: 66, x2: 192 },
				{ y: 254, x1: 2, x2: 130, x3: 254 },
			];

			// 300x300 points
			// points = [
			// 	{ y: -16, x1: -16, x2: 112, x3: 236 },
			// 	{ y: 110, x1: 48, x2: 174 },
			// 	{ y: 236, x1: -16, x2: 112, x3: 236 },
			// ];
		}

		if (e.screenY <= points[0].y + 80) {
			if (e.screenX <= points[0].x1 + 80) {
				vibration.start('bump');
				configuration.set('showBatteryPercentage', !configuration.get('showBatteryPercentage'));
			} else if (e.screenX >= points[0].x2 && e.screenX <= points[0].x2 + 80) {
				vibration.start('bump');
				configuration.set('showDayOnDateHide', !configuration.get('showDayOnDateHide'));
			} else if (e.screenX >= points[0].x3) {
				vibration.start('bump');
				configuration.set('showRestingHeartRate', !configuration.get('showRestingHeartRate'));
			}
		} else if (e.screenY >= points[1].y && e.screenY <= points[1].y + 80) {
			if (e.screenX >= points[1].x1 && e.screenX <= points[1].x1 + 80) {
				vibration.start('bump');

				let color = configuration.get('accentBackgroundColor');
				let index = colors.indexOf(color) + 1;
				if (index >= colors.length) {
					index = 0;
				}

				color = colors[index];
				configuration.set('accentBackgroundColor', color);
				configuration.set('accentForegroundColor', color);
			} else if (e.screenX >= points[1].x2 && e.screenX <= points[1].x2 + 80) {
				vibration.start('bump');

				let background = configuration.get('background');
				let index = backgrounds.indexOf(background) + 1;
				if (index >= backgrounds.length) {
					index = 0;
				}

				background = backgrounds[index];
				configuration.set('background', background);
			}
		} else if (e.screenY >= points[2].y) {
			if (e.screenX <= points[2].x1 + 80) {
				vibration.start('bump');
				configuration.set('showLeadingZero', !configuration.get('showLeadingZero'));
			} else if (e.screenX >= points[2].x2 && e.screenX <= points[2].x2 + 80) {
				vibration.start('bump');
				configuration.set('showActivityUnits', !configuration.get('showActivityUnits'));
			} else if (e.screenX >= points[2].x3) {
				vibration.start('bump');
				configuration.set('showSeconds', !configuration.get('showSeconds'));
			}
		}

		document.getElementById<GroupElement>('editable-overlay')!.animate('enable');
	}

	private mouseDownPoint: { x: number; y: number } | undefined;
	private onMouseDown(e: MouseEvent) {
		// console.log(`onMouseDown: e=${e.screenX},${e.screenY}`);

		this.mouseDownPoint = { x: e.screenX, y: e.screenY };

		this.clearEditingTimer();

		if (this.mouseClickCancelTimer != null) {
			clearTimeout(this.mouseClickCancelTimer);
			this.mouseClickCancelTimer = undefined;
		}

		if (!configuration.get('allowEditing')) return;

		if (
			!this.editing &&
			!isWithinBounds({ x: screenHeight / 2, y: screenWidth / 2 }, e, {
				x: screenWidth / 4,
				y: screenHeight / 4,
			})
		) {
			return;
		}

		// When there is a swipe (up/down/left/right) on the clock face, no mouseup is fired,
		// but the parent element seems to get a "reload" event when this happens (but only on the device)
		// So when we get a "reload" cancel any pending timer
		this.mouseDownDisposable = Disposable.from(
			addEventListener(this.$trigger, 'mousemove', e => {
				// console.log(`trigger:mousemove e=${e.screenX},${e.screenY}`);

				if (!isWithinBounds(this.mouseDownPoint, e)) {
					this.clearEditingTimer();
				}
			}),
			addEventListener(this.$trigger, 'mouseout', _e => {
				// console.log(`trigger:mouseout e=${_e.screenX},${_e.screenY}`);

				this.clearEditingTimer();
			}),
			addEventListener(this.$trigger.parent!, 'reload', () => {
				// console.log('trigger.parent:reload');
				this.clearEditingTimer();
			}),
		);

		this.mouseDownTimer = setTimeout(() => {
			this.mouseDownTimer = undefined;
			vibration.start('confirmation-max');

			// Start a timer to cancel the next click, if it comes -- since we don't want to allow that
			this.mouseClickCancelTimer = setTimeout(() => {
				this.mouseClickCancelTimer = undefined;
			}, 500);

			this.editing = !this.editing;
		}, 1000);
	}

	private onMouseUp(_e: MouseEvent) {
		// console.log(`onMouseUp: e=${_e.screenX},${_e.screenY}`);

		this.clearEditingTimer();
	}

	private clearEditingTimer() {
		if (this.mouseDownTimer != null) {
			clearTimeout(this.mouseDownTimer);
			this.mouseDownTimer = undefined;
		}

		this.mouseDownDisposable?.dispose();
	}

	// DEMO MODE
	// demo() {
	// 	display.on = false;
	// 	configuration.set('accentBackgroundColor', 'fb-light-gray');
	// 	configuration.set('accentForegroundColor', 'fb-white');
	// 	configuration.set('currentActivityView', 0);

	// 	const $tap = document.getElementById<GraphicsElement>('demo-tap')!;

	// 	const $text0 = document.getElementById<TextElement>('demo-text0')!;
	// 	const $text1 = document.getElementById<TextElement>('demo-text1')!;

	// 	let time = 1000;
	// 	setTimeout(() => {
	// 		$text0.y = 270;
	// 		$text0.text = 'ALWAYS-ON DISPLAY';
	// 		$text0.style.display = 'inline';
	// 	}, time);

	// 	time += 2000;
	// 	setTimeout(() => {
	// 		$text0.style.display = 'none';
	// 		display.on = true;
	// 	}, time);

	// 	time += 1500;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		configuration.set('currentActivityView', 1);
	// 	}, time);

	// 	time += 2750;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		configuration.set('currentActivityView', 2);
	// 	}, time);

	// 	time += 3000;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		configuration.set('currentActivityView', 0);
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$text0.y = 75;
	// 		$text0.text = 'TAP & HOLD';
	// 		$text0.style.display = 'inline';

	// 		$text1.y = 240;
	// 		$text1.text = 'TO CUSTOMIZE';
	// 		$text1.style.display = 'inline';
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('select');
	// 	}, time);

	// 	time += 1500;
	// 	setTimeout(() => {
	// 		this.editing = true;
	// 		$text0.style.display = 'none';
	// 		$text1.style.display = 'none';
	// 	}, time);

	// 	time += 2000;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 		document.getElementById<GroupElement>('editable-overlay')!.style.display = 'none';

	// 		configuration.set('accentBackgroundColor', 'fb-white');
	// 		configuration.set('accentForegroundColor', 'fb-white');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 		configuration.set('accentBackgroundColor', 'fb-cyan');
	// 		configuration.set('accentForegroundColor', 'fb-cyan');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 		configuration.set('accentBackgroundColor', 'fb-blue');
	// 		configuration.set('accentForegroundColor', 'fb-blue');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 		configuration.set('accentBackgroundColor', 'fb-red');
	// 		configuration.set('accentForegroundColor', 'fb-red');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('enable');
	// 		configuration.set('accentBackgroundColor', 'fb-purple');
	// 		configuration.set('accentForegroundColor', 'fb-purple');
	// 	}, time);

	// 	time += 500;
	// 	setTimeout(() => {
	// 		$tap.animate('select');
	// 	}, time);

	// 	time += 1500;
	// 	setTimeout(() => (this.editing = false), time);

	// 	time += 2000;
	// 	setTimeout(() => this.demo(), time);
	// }
}

function isWithinBounds(
	bounds: { x: number; y: number } | undefined,
	e: { screenX: number; screenY: number },
	tolerance: { x: number; y: number } = { x: 20, y: 20 },
) {
	if (bounds == null) return true;

	const { x, y } = bounds;
	return (
		e.screenX >= x - tolerance.x &&
		e.screenX <= x + tolerance.x &&
		e.screenY >= y - tolerance.y &&
		e.screenY <= y + tolerance.y
	);
}

export const appManager = new AppManager();
