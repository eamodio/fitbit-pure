import { me as app } from 'appbit';
import { me as device } from 'device';
import { display, Display } from 'display';
import { vibration, VibrationPatternName } from 'haptics';
import { gettext } from 'i18n';
import { Goals, goals, today } from 'user-activity';
import { locale } from 'user-settings';
import { defer, log } from '../common/system';
import { ConfigChanged, configuration } from './configuration';

const arcWidth = 48;
const screenWidth = device.screen.width;
const meterToMile = 0.000621371192;

const activityColors = {
	steps: 'fb-cyan',
	calories: 'fb-orange',
	distance: 'fb-purple',
	activeMinutes: 'fb-mint'
};

type Activities = 'activeMinutes' | 'calories' | 'distance' | 'steps';

interface Activity {
	$goal: ArcElement;
	$progress: ArcElement;
	$icon: ImageElement;
	$value: TextElement;
	$units: TextElement;
}

interface ActivityGroup {
	$container: GroupElement;
	left: Activity;
	right: Activity;
}

export class ActivityDisplay {
	constructor(
		private readonly $trigger: RectElement,
		private readonly $view: GroupElement,
		private readonly activities: ActivityGroup[]
	) {
		if (!app.permissions.granted('access_activity')) return;

		display.addEventListener('change', () => this.onDisplayChanged(display));
		goals.addEventListener('reachgoal', () => this.onGoalReached(goals));

		// Don't bother listening for cycleview updates, as they are somewhat unreliable -- e.g. won't fire if a view is cycled back to itself
		// this.$view.addEventListener('select', () => this.onViewChanged(this.getView()));
		this.$trigger.addEventListener('click', () => this.onViewClicked());

		configuration.onDidChange(this.onConfigurationChanged, this);

		this.setView(configuration.get('currentActivityView'));
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
				for (const { left, right } of this.activities) {
					left.$units.style.display = 'inline';
					right.$units.style.display = 'inline';
				}
			} else {
				for (const { left, right } of this.activities) {
					left.$units.style.display = 'none';
					right.$units.style.display = 'none';
				}
			}
		}

		this.render(e?.key != null);
	}

	@log('ActivityDisplay', {
		0: sensor => `on=${sensor.on}, aodActive=${sensor.aodActive}`
	})
	private onDisplayChanged(sensor: Display) {
		if (sensor.on && !sensor.aodActive) {
			for (const { left, right } of this.activities) {
				left.$progress.sweepAngle = 0;
				right.$progress.sweepAngle = 0;
			}

			if (this.getView() === 0) return;

			this.render(true);
		}
	}

	@log('ActivityDisplay', false)
	private onGoalReached(goals: Goals) {
		if (goals.activeMinutes != null && (today.adjusted.activeMinutes ?? 0) >= goals.activeMinutes) {
			// active minutes goal reached
			this.setView(1, 'nudge');
		} else if (goals.calories != null && (today.adjusted.calories ?? 0) >= goals.calories) {
			// calories goal reached
			this.setView(1, 'nudge');
		} else if (goals.steps != null && (today.adjusted.steps ?? 0) >= goals.steps) {
			// step goal reached
			this.setView(2, 'nudge');
		} else if (goals.distance != null && (today.adjusted.distance ?? 0) >= goals.distance) {
			// distance goal reached
			this.setView(2, 'nudge');
		}
	}

	@log('ActivityDisplay')
	private onViewChanged(index: number) {
		configuration.set('currentActivityView', index);

		if (index === 0) return;

		// Force a select to start the animation when an activity is shown (since we can't trust the cycleview to always do it)
		this.activities[index - 1].$container.animate('select');
	}

	@log('ActivityDisplay')
	private onViewClicked() {
		let index = this.getView();

		// Force an unselect to reset the animation when an activity is hidden
		this.activities[0].$container.animate('unselect');
		this.activities[1].$container.animate('unselect');

		index = this.setView(index + 1, 'bump');
		// Force an update, since we can't trust the cycleview to always do it)
		this.onViewChanged(index);
	}

	@defer()
	@log('ActivityDisplay')
	private render(animate: boolean = false) {
		this.renderActivity(this.activities[0].left, 'activeMinutes');
		this.renderActivity(this.activities[0].right, 'calories', true);

		this.renderActivity(this.activities[1].left, 'steps');
		this.renderActivity(this.activities[1].right, 'distance', true);

		if (!animate) return;

		const index = this.getView();
		if (index === 0) return;

		const $container = this.activities[index - 1]?.$container;
		if ($container == null) return;

		$container.animate('select');
	}

	private renderActivity(
		{ $goal, $progress, $icon, $value, $units }: Activity,
		name: Activities,
		rtl: boolean = false
	) {
		const value = today.adjusted[name];
		const goal = goals[name];

		const color = activityColors[name];

		$goal.style.fill = goal != null ? color : 'fb-black';

		$progress.style.fill = color;
		$progress.sweepAngle = 0;

		$icon.href = `images/${name}.png`;
		$icon.style.fill = color;

		let units: string | undefined;
		if (value != null) {
			switch (name) {
				case 'distance':
					switch (locale.language) {
						case 'en-us':
						case 'en-uk':
							$value.text = Number((value * meterToMile).toFixed(2)).toLocaleString();
							units = 'distance_units_miles';
							break;
						default:
							$value.text = Number((value / 1000).toFixed(2)).toLocaleString();
							units = 'distance_units_kilometers';
							break;
					}
					break;
				case 'calories':
					$value.text = value.toLocaleString();
					units = 'calories_units';
					break;
				case 'steps':
					$value.text = value.toLocaleString();
					units = 'steps_units';
					break;
				case 'activeMinutes':
					$value.text = value.toString();
					units = 'active_minutes_units';
					break;
				default:
					$value.text = value.toString();
					break;
			}
		} else {
			$value.text = '--';
		}

		if (configuration.get('showActivityUnits')) {
			$units.text = units != null ? gettext(units) : '';
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

		let $animate = $progress.firstChild as any;
		$animate.from = bounceAngle;
		$animate.to = angle;

		$animate = $animate.nextSibling;
		$animate.to = bounceAngle;
		$animate.from = goal != null ? 360 : 0;

		$animate = $animate.nextSibling;
		$animate.to = goal != null ? 360 : 0;
	}

	private getView(): number {
		return Number(this.$view.value ?? 0);
	}

	private setView(index: number, vibrationPattern?: VibrationPatternName) {
		if (index < 0 || index > 2) {
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
		return index;
	}
}
