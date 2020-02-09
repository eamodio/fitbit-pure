import { me as app } from 'appbit';
import { me as device } from 'device';
import document from 'document';
import { vibration, VibrationPatternName } from 'haptics';
import { gettext } from 'i18n';
import { goals, today } from 'user-activity';
import { units } from 'user-settings';
import { ActivityViewChangeEvent, AppEvent, AppManager } from './appManager';
import { defer } from '../common/system';
import { ConfigChangeEvent, configuration } from './configuration';

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

export enum ActivityViews {
	Date = 0,
	Activity1 = 1,
	Activity2 = 2,
	Donate = 3
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

		this.appManager.onDidTriggerAppEvent(this.onAppEvent, this);
		configuration.onDidChange(this.onConfigurationChanged, this);

		// goals.addEventListener('reachgoal', () => this.onGoalReached(goals));

		this.setView(configuration.get('currentActivityView'), undefined, true);
		this.onConfigurationChanged();
	}

	// @log('ActivityDisplay', { 0: e => `e.type=${e.type}` })
	private onAppEvent(e: AppEvent) {
		switch (e.type) {
			case 'display': {
				if (e.display.on && !e.display.aodActive) {
					let i = this.activities.length;
					while (i--) {
						document.getElementById<ArcElement>(`activity${i}-left-progress`)!.sweepAngle = 0;
						document.getElementById<ArcElement>(`activity${i}-right-progress`)!.sweepAngle = 0;
					}

					if (this.getView() === ActivityViews.Date) return;

					this.render();
				}
				break;
			}
			case 'click': {
				const view = this.getView() + 1;

				// Force an unselect to reset the animation when an activity is hidden
				let i = this.activities.length;
				while (i--) {
					document.getElementById<GroupElement>(`activity${i}-display`)!.animate('unselect');
				}

				this.setView(view, 'bump');
				break;
			}
			case 'editing': {
				if (e.editing) {
					this.setView(ActivityViews.Date);
				}

				this.render();
				break;
			}
		}
	}

	// @log('ActivityDisplay', { 0: e => `e.key=${e?.key}` })
	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (e?.key != null && e.key !== 'donated' && e.key !== 'showActivityUnits' && e.key !== 'showDayOnDateHide') {
			return;
		}

		if (e?.key == null || e?.key === 'donated') {
			const visibility = this.appManager.donated ? 'visible' : 'hidden';

			let i = this.activities.length;
			while (i--) {
				document.getElementById<GroupElement>(`activity${i}-display`)!.style.visibility = visibility;
			}

			if (e != null) {
				requestAnimationFrame(() => this.setView(this.appManager.donated ? ActivityViews.Date : this.maxViews));
			}

			if (e?.key === 'donated') return;
		}

		if (e?.key == null || e?.key === 'showDayOnDateHide') {
			document
				.getElementById<GroupElement>('date-day')!
				.parent!.animate(
					configuration.get('showDayOnDateHide') && this.getView() !== ActivityViews.Date
						? 'select'
						: 'unselect'
				);

			if (e?.key === 'showDayOnDateHide') return;
		}

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

	// @log('ActivityDisplay', false)
	// private onGoalReached(goals: Goals) {
	// 	if (
	// 		(goals.steps != null && (today.adjusted.steps ?? 0) >= goals.steps) ||
	// 		(goals.distance != null && (today.adjusted.distance ?? 0) >= goals.distance)
	// 	) {
	// 		// step or distance goal reached
	// 		this.setView(ActivityViews.Activity1, 'nudge');
	// 	} else if (
	// 		(goals.activeMinutes != null && (today.adjusted.activeMinutes ?? 0) >= goals.activeMinutes) ||
	// 		(goals.calories != null && (today.adjusted.calories ?? 0) >= goals.calories)
	// 	) {
	// 		// active minutes or calories goal reached
	// 		this.setView(ActivityViews.Activity2, 'nudge');
	// 	}
	// }

	// @log('ActivityDisplay')
	private onViewChanged(e: ActivityViewChangeEvent, initializing: boolean = false) {
		configuration.set('currentActivityView', e.view);

		if (
			configuration.get('showDayOnDateHide') &&
			(initializing ||
				(e.previous === ActivityViews.Date && e.view !== ActivityViews.Date) ||
				(e.previous !== ActivityViews.Date && e.view === ActivityViews.Date))
		) {
			document
				.getElementById<GroupElement>('date-day')!
				.parent!.animate(e.view !== ActivityViews.Date ? 'select' : 'unselect');
		}

		this.appManager.fire(e);
		if (initializing || e.view === ActivityViews.Date) return;

		this.render();
	}

	@defer()
	// @log('ActivityDisplay')
	private render() {
		const view = this.getView() - 1;
		if (view === -1) return;

		const activity = this.activities[view];
		if (activity == null) return;

		this.renderActivity(activity, Side.Left, `activity${view}-left`);
		this.renderActivity(activity, Side.Right, `activity${view}-right`);

		if (activity.goalReached[Side.Left] || activity.goalReached[Side.Right]) {
			requestAnimationFrame(() => {
				if (activity.goalReached[Side.Left]) {
					document.getElementById<ArcElement>(`activity${view}-left-goal`)!.parent?.animate('enable');
				}

				if (activity.goalReached[Side.Right]) {
					document.getElementById<ArcElement>(`activity${view}-right-goal`)!.parent?.animate('enable');
				}
			});
		}

		document.getElementById<GroupElement>(`activity${view}-display`)!.animate('select');
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

	private getView(): ActivityViews {
		return Number(this.$view.value ?? ActivityViews.Date);
	}

	private setView(view: ActivityViews, vibrationPattern?: VibrationPatternName, initializing: boolean = false) {
		if (view < 0 || view > this.maxViews) {
			view = ActivityViews.Date;
		}

		if (view !== ActivityViews.Date && view !== this.maxViews && !this.appManager.donated) {
			view = this.maxViews;
		}

		const previous = this.getView();
		if (view === previous) {
			if (initializing) {
				this.onViewChanged({ type: 'activityView', previous: previous, view: view }, true);
			}

			return view;
		}

		if (vibrationPattern != null) {
			vibration.start(vibrationPattern);
		}

		this.$view.value = view;

		// Force an update, since we can't trust the cycleview to always do it
		this.onViewChanged({ type: 'activityView', previous: previous, view: view }, initializing);

		return view;
	}

	private get maxViews() {
		return this.appManager.donated ? this.activities.length : this.activities.length + 1;
	}
}
