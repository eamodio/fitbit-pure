import { me as app } from 'appbit';
import document from 'document';
import { vibration, VibrationPatternName } from 'haptics';
import { gettext } from 'i18n';
import { goals, Goals, today } from 'user-activity';
import { units } from 'user-settings';
import { display } from 'display';
import { ActivityViewChangeEvent, ActivityViews, AppEvent, appManager } from './appManager';
import { defer } from '../common/system';
import { ConfigChangeEvent, configuration } from './configuration';

const meterToMile = 0.000621371192;

const activityToColor = {
	steps: 'fb-cyan',
	calories: 'fb-orange',
	distance: 'fb-purple',
	activeZoneMinutes: 'fb-mint',
};

type Activities = 'activeZoneMinutes' | 'calories' | 'distance' | 'steps';

interface Activity {
	names: [Activities, Activities];
	goalReached: [boolean, boolean];
}

const enum Side {
	Left = 0,
	Right = 1,
}

export class ActivityDisplay {
	private readonly activities: Activity[] = [
		{
			names: ['steps', 'distance'],
			goalReached: [false, false],
		},
		{
			names: ['activeZoneMinutes', 'calories'],
			goalReached: [false, false],
		},
	];

	constructor() {
		if (!app.permissions.granted('access_activity')) return;

		configuration.onDidChange(this.onConfigurationChanged, this);
		appManager.onDidTriggerAppEvent(this.onAppEvent, this);

		// Don't bother listening for cycleview updates, as they are somewhat unreliable -- e.g. won't fire if a view is cycled back to itself
		// this.$view.addEventListener('select', () => this.onViewChanged(this.getView()));

		goals.addEventListener('reachgoal', () => this.onGoalReached(goals));

		this.setView(configuration.get('currentActivityView'), undefined, true);
		this.onConfigurationChanged();
	}

	private _paused: boolean = false;
	get paused(): boolean {
		return this._paused;
	}
	set paused(value: boolean) {
		this._paused = value;

		this._$view = undefined;

		if (value) {
			clearInterval(this.autoRotateHandle);
		} else {
			this.onConfigurationChanged();
		}
	}

	private _$view: GroupElement | undefined;
	private get $view(): GroupElement {
		if (this._$view == null) {
			this._$view = document.getElementById<GroupElement>('cycleview')!;
		}
		return this._$view;
	}

	private onAppEvent(e: AppEvent) {
		if (this.paused) return;

		switch (e.type) {
			case 'display': {
				if (e.display.on && !e.display.aodActive) {
					let i = this.activities.length;
					while (i--) {
						document.getElementById<ArcElement>(`lstat${i}-progress`)!.sweepAngle = 0;
						document.getElementById<ArcElement>(`rstat${i}-progress`)!.sweepAngle = 0;
					}

					if (!this.autoRotateOverride && configuration.get('autoRotate')) {
						this.setAutoRotate(true);
					} else {
						if (this.getView() === ActivityViews.Date) return;

						this.render();
					}
				} else {
					this.setAutoRotate(false);
				}
				break;
			}
			case 'click': {
				this.setAutoRotate(false);

				const view = this.getView() + 1;

				// Force an unselect to reset the animation when an activity is hidden
				let i = this.activities.length;
				while (i--) {
					document.getElementById<GroupElement>(`stats${i}`)!.animate('unselect');
				}

				this.setView(view, 'bump');
				break;
			}
			case 'editing': {
				this.setAutoRotate(false);

				if (e.editing) {
					this.setView(ActivityViews.Activity1);
				}

				this.render();
				break;
			}
		}
	}

	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (this.paused) return;
		if (
			e?.key != null &&
			e.key !== 'autoRotate' &&
			e.key !== 'autoRotateInterval' &&
			e.key !== 'donated' &&
			e.key !== 'showActivityUnits' &&
			e.key !== 'showDayOnDateHide'
		) {
			return;
		}

		if (e?.key == null || e?.key === 'autoRotate' || e?.key === 'autoRotateInterval') {
			this.setAutoRotate(configuration.get('autoRotate'));

			if (e?.key === 'autoRotate' || e?.key === 'autoRotateInterval') return;
		}

		if (e?.key == null || e?.key === 'donated') {
			const visibility = appManager.donated ? 'visible' : 'hidden';

			let i = this.activities.length;
			while (i--) {
				document.getElementById<GroupElement>(`stats${i}`)!.style.visibility = visibility;
			}

			if (e?.key != null) {
				requestAnimationFrame(() => this.setView(appManager.donated ? ActivityViews.Date : this.maxViews));
			}

			if (e?.key === 'donated') return;
		}

		if (e?.key == null || e?.key === 'showDayOnDateHide') {
			document
				.getElementById<GroupElement>('day')!
				.animate(
					configuration.get('showDayOnDateHide') && this.getView() !== ActivityViews.Date
						? 'select'
						: 'unselect',
				);

			if (e?.key === 'showDayOnDateHide') return;
		}

		if (e?.key == null || e?.key === 'showActivityUnits') {
			const display = configuration.get('showActivityUnits') ? 'inline' : 'none';

			let i = this.activities.length;
			while (i--) {
				document.getElementById<TextElement>(`lstat${i}-units`)!.style.display = display;
				document.getElementById<TextElement>(`rstat${i}-units`)!.style.display = display;
			}
		}

		this.render();
	}

	private onGoalReached(goals: Goals) {
		if (this.paused) return;

		let view: ActivityViews;

		if (
			(goals.steps != null && (today.adjusted.steps ?? 0) >= goals.steps) ||
			(goals.distance != null && (today.adjusted.distance ?? 0) >= goals.distance)
		) {
			// step or distance goal reached
			view = ActivityViews.Activity1;
		} else if (
			(goals.activeZoneMinutes != null &&
				(today.adjusted.activeZoneMinutes?.total ?? 0) >= goals.activeZoneMinutes.total) ||
			(goals.calories != null && (today.adjusted.calories ?? 0) >= goals.calories)
		) {
			// active minutes or calories goal reached
			view = ActivityViews.Activity2;
		} else {
			return;
		}

		if (display.on && !display.aodActive) {
			this.setAutoRotate(false);
		} else {
			this.autoRotateOverride = true;
		}

		this.setView(view, 'nudge');
		display.on = true;
	}

	private onViewChanged(e: ActivityViewChangeEvent, initializing: boolean = false) {
		if (this.paused) return;

		configuration.set('currentActivityView', e.view);

		if (
			configuration.get('showDayOnDateHide') &&
			(initializing ||
				(e.previous === ActivityViews.Date && e.view !== ActivityViews.Date) ||
				(e.previous !== ActivityViews.Date && e.view === ActivityViews.Date))
		) {
			document
				.getElementById<GroupElement>('day')!
				.animate(e.view !== ActivityViews.Date ? 'select' : 'unselect');
		}

		appManager.fire(e);
		if (initializing || e.view === ActivityViews.Date) return;

		this.render();
	}

	@defer()
	private render() {
		if (this.paused) return;

		const view = this.getView() - 1;
		if (view === -1) return;

		const activity = this.activities[view];
		if (activity == null) return;

		this.renderActivity(activity, Side.Left, `lstat${view}`);
		this.renderActivity(activity, Side.Right, `rstat${view}`);

		if (activity.goalReached[Side.Left] || activity.goalReached[Side.Right]) {
			requestAnimationFrame(() => {
				if (activity.goalReached[Side.Left]) {
					document.getElementById<ArcElement>(`lstat${view}-goal`)!.parent?.animate('enable');
				}

				if (activity.goalReached[Side.Right]) {
					document.getElementById<ArcElement>(`rstat${view}-goal`)!.parent?.animate('enable');
				}
			});
		}

		document.getElementById<GroupElement>(`stats${view}`)!.animate('select');
	}

	private renderActivity(activity: Activity, side: Side, prefix: string) {
		const name = activity.names[side];

		const value = appManager.editing
			? 0
			: name === 'activeZoneMinutes'
			? today.adjusted[name]?.total
			: today.adjusted[name];
		const goal = name === 'activeZoneMinutes' ? goals[name]?.total : goals[name];

		const color = activityToColor[name];

		document.getElementById<ArcElement>(`${prefix}-goal`)!.style.fill = goal != null ? color : 'fb-black';

		const $progress = document.getElementById<ArcElement>(`${prefix}-progress`)!;
		$progress.style.fill = color;
		$progress.sweepAngle = 0;

		const $icon = document.getElementById<ImageElement>(`${prefix}-icon`)!;
		$icon.href = `images/${name}.png`;
		$icon.style.fill = color;
		($icon.children[0] as AnimateElement).to = color;

		activity.goalReached[side] = goal != null && value != null && value >= goal;

		const $value = document.getElementById<TextElement>(`${prefix}-value`)!;

		let unitsLabel: string | undefined;
		if (value != null) {
			switch (name) {
				case 'distance':
					if (units.distance === 'us') {
						$value.text = Number((value * meterToMile).toFixed(1)).toLocaleString();
						unitsLabel = 'distance_units_miles';
						break;
					}

					$value.text = Number((value / 1000).toFixed(1)).toLocaleString();
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
				case 'activeZoneMinutes':
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
			$value.y = $units.text.length > 0 ? -5 : 0;
		} else {
			$value.y = 0;
		}

		const angle = goal != null ? Math.min(Math.floor(360 * ((value ?? 0) / goal)), 360) : 0;
		const bounceAngle = Math.max(Math.floor(angle - 15), 0);

		// console.log(`${key}: value=${value}, goal=${goal}, angle=${angle}, bounceAngle=${bounceAngle}`);

		let $animate = $progress.children[1] as AnimateElement;
		$animate.from = bounceAngle;
		$animate.to = angle;

		$animate = $progress.children[2] as AnimateElement;
		$animate.to = bounceAngle;
		$animate.from = goal != null ? 360 : 0;

		$animate = $progress.children[3] as AnimateElement;
		$animate.to = goal != null ? 360 : 0;
	}

	private autoRotateHandle: number = 0;
	private autoRotateOverride = false;

	private setAutoRotate(enabled: boolean) {
		clearInterval(this.autoRotateHandle);
		this.autoRotateHandle = 0;
		this.autoRotateOverride = false;

		if (this.paused || !enabled || !display.on || display.aodActive) return;

		this.setView(ActivityViews.Date);

		this.autoRotateHandle = setInterval(
			() => this.setView(this.getView() + 1),
			configuration.get('autoRotateInterval'),
		);
	}

	private getView(): ActivityViews {
		return Number(this.$view.value ?? ActivityViews.Date);
	}

	private setView(view: ActivityViews, vibrationPattern?: VibrationPatternName, initializing: boolean = false) {
		if (view < 0 || view > this.maxViews) {
			view = ActivityViews.Date;
		}

		if (view !== ActivityViews.Date && view !== this.maxViews && !appManager.donated) {
			view = this.maxViews;
		}

		if (vibrationPattern != null) {
			vibration.start(vibrationPattern);
		}

		const previous = this.getView();
		if (view === previous) {
			if (initializing) {
				this.onViewChanged({ type: 'activityView', previous: previous, view: view }, true);
			}

			return view;
		}

		this.$view.value = view;

		// Force an update, since we can't trust the cycleview to always do it
		this.onViewChanged({ type: 'activityView', previous: previous, view: view }, initializing);

		return view;
	}

	private get maxViews() {
		return appManager.donated ? this.activities.length : this.activities.length + 1;
	}

	// DEMO MODE
	switchView(view: ActivityViews) {
		this.setView(view);
	}
}
