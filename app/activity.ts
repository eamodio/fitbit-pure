import { me as app } from 'appbit';
import { me as device } from 'device';
import { Display } from 'display';
import { vibration, VibrationPatternName } from 'haptics';
import { gettext } from 'i18n';
import { goals, today } from 'user-activity';
import { units } from 'user-settings';
import { AppManager } from './appManager';
import { addEventListener, defer, Disposable, log } from '../common/system';
import { Colors, ConfigChanged, configuration } from './configuration';

const arcWidth = 48;
const screenWidth = device.screen.width;
const meterToMile = 0.000621371192;

type Activities = 'activeMinutes' | 'calories' | 'distance' | 'steps';

interface Activity {
	name: Activities;
	rtl: boolean;
	$goal: ArcElement;
	$progress: ArcElement;
	$icon: ImageElement;
	$value: TextElement;
	$units: TextElement;

	goalReached?: boolean;
}

interface ActivityGroup {
	$container: GroupElement;
	left: Activity;
	right: Activity;
}

export class ActivityDisplay {
	constructor(
		private readonly appManager: AppManager,
		private readonly $view: GroupElement,
		private readonly activityGroups: ActivityGroup[]
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
		if (e?.key != null && e.key !== 'showActivityUnits' /*&& e.key !== 'showDate'*/) return;

		// if (e?.key == null || e?.key === 'showDate') {
		// 	if (!configuration.get('showDate') && this.getView() === 0) {
		// 		this.setView(0);
		// 	}

		// 	if (e?.key === 'showDate') return;
		// }

		if (e?.key == null || e?.key === 'showActivityUnits') {
			if (configuration.get('showActivityUnits')) {
				for (const { left, right } of this.activityGroups) {
					left.$units.style.display = 'inline';
					right.$units.style.display = 'inline';
				}
			} else {
				for (const { left, right } of this.activityGroups) {
					left.$units.style.display = 'none';
					right.$units.style.display = 'none';
				}
			}
		}

		this.render();
	}

	@log('ActivityDisplay', {
		0: sensor => `on=${sensor.on}, aodActive=${sensor.aodActive}`
	})
	private onDisplayChanged(sensor: Display) {
		if (sensor.on && !sensor.aodActive) {
			for (const { left, right } of this.activityGroups) {
				left.$progress.sweepAngle = 0;
				right.$progress.sweepAngle = 0;
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
	private onViewChanged(index: number) {
		configuration.set('currentActivityView', index);

		if (index === 0) return;

		this.render();
	}

	@log('ActivityDisplay')
	private onViewClicked() {
		const index = this.getView();

		// Force an unselect to reset the animation when an activity is hidden
		for (const group of this.activityGroups) {
			group.$container.animate('unselect');
		}

		this.setView(index + 1, 'bump');
	}

	@defer()
	@log('ActivityDisplay')
	private render() {
		const index = this.getView();
		if (index === 0) return;

		const group = this.activityGroups[index - 1];
		if (group == null) return;

		this.renderActivity(group.left);
		this.renderActivity(group.right);

		if (group.left.goalReached || group.right.goalReached) {
			requestAnimationFrame(() => {
				if (group.left.goalReached) {
					group.left.$goal.parent?.animate('enable');
				}

				if (group.right.goalReached) {
					group.right.$goal.parent?.animate('enable');
				}
			});
		}

		group.$container.animate('select');
	}

	private renderActivity(activity: Activity) {
		const { name, rtl, $goal, $progress, $icon, $value, $units } = activity;

		const value = this.appManager.editing ? 0 : today.adjusted[name];
		const goal = goals[name];

		const color = getActivityColor(name);

		$goal.style.fill = goal != null ? color : 'fb-black';

		$progress.style.fill = color;
		$progress.sweepAngle = 0;

		$icon.href = `images/${name}.png`;
		$icon.style.fill = color;

		activity.goalReached = goal != null && value != null && value >= goal;

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

		if (configuration.get('showActivityUnits')) {
			$units.text = unitsLabel != null ? gettext(unitsLabel) : '';
			$value.y = $units.text.length > 0 ? -12 : -4;
		} else {
			$value.y = -4;
		}

		if (rtl) {
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

	private setView(index: number, vibrationPattern?: VibrationPatternName, skipChanged: boolean = false) {
		if (index < 0 || index > this.maxViews) {
			index = 0;
		}

		// if (index === 0 && !configuration.get('showDate')) {
		// 	index = 1;
		// }

		if (index === this.getView()) return index;

		if (vibrationPattern != null) {
			vibration.start(vibrationPattern);
		}

		this.$view.value = index;

		if (!skipChanged) {
			// Force an update, since we can't trust the cycleview to always do it
			this.onViewChanged(index);
		}

		return index;
	}

	private get maxViews() {
		return this.activityGroups.length;
	}
}

function getActivityColor(activity: Activities): Colors {
	switch (activity) {
		case 'steps':
			return 'fb-cyan';
		case 'calories':
			return 'fb-orange';
		case 'distance':
			return 'fb-purple';
		case 'activeMinutes':
			return 'fb-mint';
		default:
			return 'fb-white';
	}
}
