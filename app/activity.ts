import { me as app } from 'appbit';
import { me as device } from 'device';
import document from 'document';
import { Display } from 'display';
import { vibration, VibrationPatternName } from 'haptics';
import { gettext } from 'i18n';
import { goals, today } from 'user-activity';
import { units } from 'user-settings';
import { AppManager } from './appManager';
import { defer, log } from '../common/system';
import { ConfigChanged, configuration } from './configuration';

const arcWidth = 48;
const screenWidth = device.screen.width;
const meterToMile = 0.000621371192;

const activityToColor = {
	steps: 'fb-cyan',
	calories: 'fb-orange',
	distance: 'fb-purple',
	activeMinutes: 'fb-mint'
};

type Activities = 'activeMinutes' | 'calories' | 'distance' | 'steps';

interface Activity {
	names: [Activities, Activities];
	goalReached: [boolean, boolean];
}

enum Side {
	Left = 0,
	Right = 1
}

export class ActivityDisplay {
	constructor(
		private readonly appManager: AppManager,
		private readonly activities: Activity[],
		private readonly $view: GroupElement
	) {
		if (!app.permissions.granted('access_activity')) return;

		// Don't bother listening for cycleview updates, as they are somewhat unreliable -- e.g. won't fire if a view is cycled back to itself
		// this.$view.addEventListener('select', () => this.onViewChanged(this.getView()));
		this.appManager.onDidChangeDisplay(this.onDisplayChanged, this);
		this.appManager.onDidChangeEditMode(e => this.onEditModeChanged(e));
		this.appManager.onDidChangeView(() => this.onViewClicked());

		// goals.addEventListener('reachgoal', () => this.onGoalReached(goals));

		configuration.onDidChange(this.onConfigurationChanged, this);

		this.setView(configuration.get('currentActivityView'), undefined, true);
		this.onConfigurationChanged();
	}

	@log('ActivityDisplay', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (e?.key != null && e.key !== 'donated' && e.key !== 'showActivityUnits' /*&& e.key !== 'showDate'*/) return;

		if (e?.key == null || e?.key === 'donated') {
			const visibility = this.appManager.donated ? 'visible' : 'hidden';

			let i = this.activities.length;
			while (i--) {
				document.getElementById<GroupElement>(`activity${i}-display`)!.style.visibility = visibility;
			}

			if (e != null) {
				requestAnimationFrame(() => this.setView(this.appManager.donated ? 0 : this.maxViews));
			}

			if (e?.key === 'donated') return;
		}

		// if (e?.key == null || e?.key === 'showDate') {
		// 	if (!configuration.get('showDate') && this.getView() === 0) {
		// 		this.setView(0);
		// 	}

		// 	if (e?.key === 'showDate') return;
		// }

		if (e?.key == null || e?.key === 'showActivityUnits') {
			const display = configuration.get('showActivityUnits') ? 'inline' : 'none';

			let i = this.activities.length;
			while (i--) {
				document.getElementById<TextElement>(`activity${i}-left-units`)!.style.display = display;
				document.getElementById<TextElement>(`activity${i}-right-units`)!.style.display = display;
			}
		}

		this.render();
	}

	private onDisplayChanged(sensor: Display) {
		if (sensor.on && !sensor.aodActive) {
			let i = this.activities.length;
			while (i--) {
				document.getElementById<ArcElement>(`activity${i}-left-progress`)!.sweepAngle = 0;
				document.getElementById<ArcElement>(`activity${i}-right-progress`)!.sweepAngle = 0;
			}

			if (this.getView() === 0) return;

			this.render();
		}
	}

	@log('ActivityDisplay')
	private onEditModeChanged(editing: boolean) {
		if (editing) {
			this.setView(0);
		}

		this.render();
	}

	// @log('ActivityDisplay', false)
	// private onGoalReached(goals: Goals) {
	// 	if (
	// 		(goals.steps != null && (today.adjusted.steps ?? 0) >= goals.steps) ||
	// 		(goals.distance != null && (today.adjusted.distance ?? 0) >= goals.distance)
	// 	) {
	// 		// step or distance goal reached
	// 		this.setView(1, 'nudge');
	// 	} else if (
	// 		(goals.activeMinutes != null && (today.adjusted.activeMinutes ?? 0) >= goals.activeMinutes) ||
	// 		(goals.calories != null && (today.adjusted.calories ?? 0) >= goals.calories)
	// 	) {
	// 		// active minutes or calories goal reached
	// 		this.setView(2, 'nudge');
	// 	}
	// }

	@log('ActivityDisplay')
	private onViewChanged(index: number, initializing: boolean = false) {
		configuration.set('currentActivityView', index);

		const $day = document.getElementById<GroupElement>('date-day-display')!;
		if (initializing || (index === 0 && $day.style.opacity !== 0) || (index !== 0 && $day.style.opacity === 0)) {
			$day.animate(index === 0 ? 'unload' : 'load');
		}

		if (initializing || index === 0) return;

		this.render();
	}

	@log('ActivityDisplay')
	private onViewClicked() {
		const index = this.getView() + 1;

		// Force an unselect to reset the animation when an activity is hidden
		let i = this.activities.length;
		while (i--) {
			document.getElementById<GroupElement>(`activity${i}-display`)!.animate('unselect');
		}

		this.setView(index, 'bump');
	}

	@defer()
	// @log('ActivityDisplay')
	private render() {
		const index = this.getView() - 1;
		if (index === -1) return;

		const activity = this.activities[index];
		if (activity == null) return;

		this.renderActivity(activity, Side.Left, `activity${index}-left`);
		this.renderActivity(activity, Side.Right, `activity${index}-right`);

		if (activity.goalReached[Side.Left] || activity.goalReached[Side.Right]) {
			requestAnimationFrame(() => {
				if (activity.goalReached[Side.Left]) {
					document.getElementById<ArcElement>(`activity${index}-left-goal`)!.parent?.animate('enable');
				}

				if (activity.goalReached[Side.Right]) {
					document.getElementById<ArcElement>(`activity${index}-right-goal`)!.parent?.animate('enable');
				}
			});
		}

		document.getElementById<GroupElement>(`activity${index}-display`)!.animate('select');
	}

	private renderActivity(activity: Activity, side: Side, prefix: string) {
		const name = activity.names[side];

		const value = this.appManager.editing ? 0 : today.adjusted[name];
		const goal = goals[name];

		const color = activityToColor[name];

		document.getElementById<ArcElement>(`${prefix}-goal`)!.style.fill = goal != null ? color : 'fb-black';

		const $progress = document.getElementById<ArcElement>(`${prefix}-progress`)!;
		$progress.style.fill = color;
		$progress.sweepAngle = 0;

		const $icon = document.getElementById<ImageElement>(`${prefix}-icon`)!;
		$icon.href = `images/${name}.png`;
		$icon.style.fill = color;

		activity.goalReached[side] = goal != null && value != null && value >= goal;

		const $value = document.getElementById<TextElement>(`${prefix}-value`)!;

		let unitsLabel: string | undefined;
		if (value != null) {
			switch (name) {
				case 'distance':
					if (units.distance === 'us') {
						$value.text = Number((value * meterToMile).toFixed(2)).toLocaleString();
						unitsLabel = 'distance_units_miles';
						break;
					}

					$value.text = Number((value / 1000).toFixed(2)).toLocaleString();
					unitsLabel = 'distance_units_kilometers';
					break;
				case 'calories':
					$value.text = value.toLocaleString();
					unitsLabel = 'calories_units';
					break;
				case 'steps':
					$value.text = value.toLocaleString();
					unitsLabel = 'steps_units';
					break;
				case 'activeMinutes':
					$value.text = value.toString();
					unitsLabel = 'active_minutes_units';
					break;
				default:
					$value.text = value.toString();
					break;
			}
		} else {
			$value.text = '--';
		}

		const $units = document.getElementById<TextElement>(`${prefix}-units`)!;

		if (configuration.get('showActivityUnits')) {
			$units.text = unitsLabel != null ? gettext(unitsLabel) : '';
			$value.y = $units.text.length > 0 ? -12 : -4;
		} else {
			$value.y = -4;
		}

		if (side === Side.Right) {
			const x = screenWidth - arcWidth - 10;
			$value.x = x;
			$units.x = x;
		}

		const angle = goal != null ? Math.min(Math.floor(360 * ((value ?? 0) / goal)), 360) : 0;
		const bounceAngle = Math.max(Math.floor(angle - 15), 0);

		// console.log(`${key}: value=${value}, goal=${goal}, angle=${angle}, bounceAngle=${bounceAngle}`);

		let $animate = $progress.firstChild as AnimateElement;
		$animate.from = bounceAngle;
		$animate.to = angle;

		$animate = $animate.nextSibling as AnimateElement;
		$animate.to = bounceAngle;
		$animate.from = goal != null ? 360 : 0;

		$animate = $animate.nextSibling as AnimateElement;
		$animate.to = goal != null ? 360 : 0;
	}

	private getView(): number {
		return Number(this.$view.value ?? 0);
	}

	private setView(index: number, vibrationPattern?: VibrationPatternName, initializing: boolean = false) {
		if (index < 0 || index > this.maxViews) {
			index = 0;
		}

		// if (index === 0 && !configuration.get('showDate')) {
		// 	index = 1;
		// }

		if (index !== 0 && index !== this.maxViews && !this.appManager.donated) {
			index = this.maxViews;
		}

		if (index === this.getView()) {
			if (initializing) {
				this.onViewChanged(index, true);
			}

			return index;
		}

		if (vibrationPattern != null) {
			vibration.start(vibrationPattern);
		}

		this.$view.value = index;

		// Force an update, since we can't trust the cycleview to always do it
		this.onViewChanged(index, initializing);

		return index;
	}

	private get maxViews() {
		return this.appManager.donated ? this.activities.length : this.activities.length + 1;
	}
}
