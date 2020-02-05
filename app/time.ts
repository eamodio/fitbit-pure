import clock, { TickEvent } from 'clock';
import { display, Display } from 'display';
import { gettext } from 'i18n';
import { locale, preferences } from 'user-settings';
import document from 'document';
import { AppManager } from './appManager';
import { ConfigChanged, configuration } from './configuration';
import { defer, log } from '../common/system';

const emptyDate = new Date(0, 0, 0, 0, 0, 0, 0);
const leadingZeroClassRegex = /\btheme-color--accent-foreground\b\s\bdimmed\b/;

enum Previous {
	Minutes = 0,
	Hours = 1,
	Day = 2,
	Month = 3
}

export class TimeDisplay {
	private _date: Date | undefined;
	private _previous: Int8Array = new Int8Array(4);

	constructor(
		private readonly appManager: AppManager,
		private readonly $hour0: ImageElement,
		private readonly $hour1: ImageElement,
		private readonly $minute0: ImageElement,
		private readonly $minute1: ImageElement,
		private readonly $seconds: TextElement
	) {
		clock.addEventListener('tick', e => this.onTick(e));

		appManager.onDidChangeDisplay(this.onDisplayChanged, this);
		appManager.onDidChangeEditMode(this.onEditModeChanged, this);
		configuration.onDidChange(this.onConfigurationChanged, this);

		if (display.aodEnabled) {
			const aodOpacity = configuration.get('aodOpacity');
			// 0.6 is the default in the svg (index.gui)
			if (aodOpacity !== 0.6) {
				this.updateAlwaysOnOpacity(aodOpacity);
			}
		}

		this.onConfigurationChanged();
	}

	@log('TimeDisplay', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (
			e?.key != null &&
			e.key !== 'animateSeparator' &&
			e.key !== 'aodOpacity' &&
			e.key !== 'showDate' &&
			e.key !== 'showLeadingZero' &&
			e.key !== 'showSeconds'
		) {
			return;
		}

		if (e?.key == null || e?.key === 'animateSeparator') {
			document
				.getElementById<ImageElement>('time-separator')!
				.animate(!display.aodActive && configuration.get('animateSeparator') ? 'enable' : 'disable');

			if (e?.key === 'animateSeparator') return;
		}

		if (e?.key == null || e?.key === 'aodOpacity') {
			this.updateAlwaysOnOpacity(configuration.get('aodOpacity'));

			if (e?.key === 'aodOpacity') return;
		}

		if (e?.key == null || e?.key === 'showDate') {
			document.getElementById<GroupElement>('date-display')!.style.display = configuration.get('showDate')
				? 'inline'
				: 'none';
		}

		if (e?.key == null || e?.key === 'showSeconds') {
			if (configuration.get('showSeconds')) {
				this.$seconds.style.display = 'inline';
				this.updateClock(true);
			} else {
				this.$seconds.style.display = 'none';
				this.updateClock(false);
			}

			if (e?.key === 'showSeconds') return;
		}

		this.render();
	}

	private onDisplayChanged(sensor: Display) {
		if (sensor.aodEnabled && configuration.get('showSeconds')) {
			this.updateClock(true);
		}

		this.render();

		requestAnimationFrame(() => {
			if (sensor.aodEnabled) {
				document.getElementById<GroupElement>('time-display')!.animate(sensor.aodActive ? 'unload' : 'load');
				document.getElementById<ImageElement>('background')!.animate(sensor.aodActive ? 'unload' : 'load');
			}

			if (configuration.get('animateSeparator')) {
				document
					.getElementById<ImageElement>('time-separator')!
					.animate(sensor.on && !sensor.aodActive ? 'enable' : 'disable');
			}
		});
	}

	@log('TimeDisplay')
	private onEditModeChanged(editing: boolean) {
		this.render();
	}

	// @log('TimeDisplay', {
	// 	0: e => `date=${e.date}`
	// })
	private onTick({ date }: TickEvent) {
		this._date = date;
		this.renderCore();
	}

	@defer()
	render() {
		this.renderCore(true);
	}

	// @log('TimeDisplay')
	private renderCore(force: boolean = false) {
		const date = this._date ?? emptyDate;

		if (configuration.get('showSeconds') && !display.aodActive) {
			this.$seconds.text = `${toMonospaceDigits(date.getSeconds(), true)}s`;
		}

		const minutes = this.appManager.editing ? 0 : date.getMinutes();
		if (!force && minutes === this._previous[Previous.Minutes]) return;

		this._previous[Previous.Minutes] = minutes;

		const minute = zeroPad(minutes);
		this.$minute0.href = `images/${minute[0] ?? 0}.png`;
		this.$minute1.href = `images/${minute[1] ?? 0}.png`;

		const hours = this.appManager.editing ? 0 : date.getHours();
		if (!force && hours === this._previous[Previous.Hours]) return;

		this._previous[Previous.Hours] = hours;

		const hour = zeroPad(!this.appManager.editing && preferences.clockDisplay === '12h' ? hours % 12 || 12 : hours);
		this.$hour0.href = `images/${hour[0] ?? 0}.png`;
		if (hour[0] === '0') {
			if (configuration.get('showLeadingZero')) {
				if (!leadingZeroClassRegex.test(this.$hour0.class)) {
					this.$hour0.class += ' theme-color--accent-foreground dimmed';
					this.appManager.refresh();
				}

				if (this.$hour0.style.visibility !== 'visible') {
					document.getElementById<GroupElement>('time-display')!.groupTransform!.translate.x = 0;
					this.$hour0.style.visibility = 'visible';
				}
			} else if (this.$hour0.style.visibility !== 'hidden') {
				this.$hour0.style.visibility = 'hidden';
				document.getElementById<GroupElement>('time-display')!.groupTransform!.translate.x = -33;
			}
		} else {
			if (leadingZeroClassRegex.test(this.$hour0.class)) {
				this.$hour0.class = this.$hour0.class.replace(leadingZeroClassRegex, '');
				this.appManager.refresh();

				this.$hour0.style.fill = 'fb-white';

				let $animate = this.$hour0.getElementById<AnimateElement>('aod-animate-in');
				if ($animate != null) {
					$animate.from = 'fb-white';
					$animate.to = 'fb-white';
				}

				$animate = this.$hour0.getElementById<AnimateElement>('aod-animate-out');
				if ($animate != null) {
					$animate.from = 'fb-white';
					$animate.to = 'fb-white';
				}
			}

			if (this.$hour0.style.visibility !== 'visible') {
				document.getElementById<GroupElement>('time-display')!.groupTransform!.translate.x = 0;
				this.$hour0.style.visibility = 'visible';
			}
		}
		this.$hour1.href = `images/${hour[1] ?? 0}.png`;

		const day = date.getDay();
		if (!force && day === this._previous[Previous.Day]) return;

		this._previous[Previous.Day] = day;

		const month = date.getMonth();
		if (!force && month === this._previous[Previous.Month]) return;

		this._previous[Previous.Month] = month;

		if (!configuration.get('showDate')) return;

		const monthName = gettext(`month_short_${month}`);
		const dayName = gettext(`day_short_${day}`);
		const dayMonthSeparator = gettext('day_month_separator');

		const $date = document.getElementById<TextElement>('date-date')!;

		let x: number;
		switch (locale.language) {
			case 'zh-cn':
				// 2月7日周二 = Month_Date_Weekday
				$date.text = `${monthName}${dayMonthSeparator}${date.getDate()}`;
				x = $date.getBBox().width;
				$date.text += `${dayName}`;
				x += $date.getBBox().left;
				break;
			case 'ja-jp':
				// 8月3日（木）= Month_Date (Weekday)
				$date.text = `${monthName}${dayMonthSeparator}${date.getDate()}`;
				x = $date.getBBox().width;
				$date.text += ` (${dayName})`;
				x += $date.getBBox().left;
				break;
			case 'ko-kr':
				// 2/7 (목) = Month/date (day)
				$date.text = `${date.getMonth() + 1}${dayMonthSeparator}${date.getDate()}`;
				x = $date.getBBox().width;
				$date.text += ` (${dayName})`;
				x += $date.getBBox().left;
				break;
			case 'en-us':
			case 'en-ca':
			case 'es-pa':
			case 'es-pr':
			case 'en-se':
				// Thu, Feb 7
				$date.text = `${dayName}${dayMonthSeparator} ${monthName} ${date.getDate()}`;
				x = $date.getBBox().right;
				break;
			default:
				// Thu, 7 Feb
				$date.text = `${dayName}${dayMonthSeparator} ${date.getDate()}`;
				x = $date.getBBox().width;
				$date.text += ` ${monthName}`;
				x += $date.getBBox().left;
				break;
		}

		const $dateHighlight = document.getElementById<TextElement>('date-highlight')!;
		$dateHighlight.x = x;
		$dateHighlight.text = date.getDate().toString();

		const bbox = $dateHighlight.getBBox();

		const $dateHighlightBg = document.getElementById<RectElement>('date-highlight-bg')!;
		$dateHighlightBg.x = bbox.x;
		$dateHighlightBg.y = -bbox.height;
		$dateHighlightBg.height = bbox.height;
		$dateHighlightBg.width = bbox.width;
	}

	private updateAlwaysOnOpacity(aodOpacity: number) {
		const $timeContainer = document.getElementById<GroupElement>('time-display')!;

		let $animate = $timeContainer.getElementById<AnimateElement>('aod-animate-in');
		if ($animate != null) {
			$animate.from = aodOpacity;
		}

		$animate = $timeContainer.getElementById<AnimateElement>('aod-animate-out');
		if ($animate != null) {
			$animate.to = aodOpacity;
		}
	}

	private updateClock(seconds: boolean) {
		clock.granularity = seconds && !display.aodActive ? 'seconds' : 'minutes';
	}
}

const chars = String.fromCharCode(0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19);

function toMonospaceDigits(num: number, pad = true): string {
	let digits;
	if (pad && num < 10) {
		digits = chars[0] + chars[num];
	} else {
		digits = '';
		while (num > 0) {
			digits = chars[num % 10] + digits;
			num = (num / 10) | 0;
		}
	}
	return digits;
}

function zeroPad(num: number): string {
	return `${num < 10 ? '0' : ''}${num}`;
}
