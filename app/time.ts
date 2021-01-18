import clock, { TickEvent } from 'clock';
import { me as device } from 'device';
import { display } from 'display';
import { gettext } from 'i18n';
import { locale, preferences } from 'user-settings';
import document from 'document';
import { AppEvent, appManager } from './appManager';
import { ConfigChangeEvent, configuration } from './configuration';
import { defer } from '../common/system';

const screenWidth = device.screen.width;
const digitWidth = 66;
const separatorWidth = 16;
const fourDigitTimeX = screenWidth / 2 - (digitWidth * 4 + separatorWidth) / 2;
const threeDigitTimeX = screenWidth / 2 - (digitWidth * 5 + separatorWidth) / 2;

const enum Previous {
	Minutes = 0,
	Hours = 1,
	Day = 2,
	Month = 3,
}

export class TimeDisplay {
	private date: Date | undefined;
	private previous: Int8Array = new Int8Array(4);

	constructor() {
		configuration.onDidChange(this.onConfigurationChanged, this);
		appManager.onDidTriggerAppEvent(this.onAppEvent, this);
		clock.addEventListener('tick', this.onTick.bind(this));

		if (display.aodAvailable) {
			const aodOpacity = configuration.get('aodOpacity');
			// 0.6 is the default in the svg (index.gui)
			if (aodOpacity !== 60) {
				this.updateAlwaysOnOpacity(aodOpacity);
			}
		}

		this.onConfigurationChanged();
	}

	private _paused: boolean = false;
	get paused(): boolean {
		return this._paused;
	}
	set paused(value: boolean) {
		this._paused = value;

		this._$seconds = undefined;

		if (!value) {
			this.onConfigurationChanged();
		}
	}

	private _$seconds: TextElement | undefined;
	private get $seconds(): TextElement {
		if (this._$seconds == null) {
			this._$seconds = document.getElementById<TextElement>('time-secs')!;
		}
		return this._$seconds;
	}

	private onAppEvent(e: AppEvent) {
		if (this.paused) return;

		switch (e.type) {
			case 'display': {
				if (
					e.display.aodEnabled ||
					(e.display.on && e.display.aodAvailable && configuration.get('showSeconds'))
				) {
					this.updateClock(true);
				}

				this.render();

				requestAnimationFrame(() => {
					if (e.display.aodEnabled || (e.display.on && e.display.aodAvailable)) {
						if (configuration.get('aodShowDay')) {
							document
								.getElementById<GroupElement>('aod-day')!
								.animate(e.display.aodActive ? 'disable' : 'enable');
						}

						document
							.getElementById<GroupElement>('time')!
							.animate(e.display.aodActive ? 'disable' : 'enable');
						document
							.getElementById<ImageElement>('background')!
							.animate(e.display.aodActive ? 'disable' : 'enable');
					}

					if (configuration.get('animateSeparator')) {
						document
							.getElementById<ImageElement>('time-sep')!
							.animate(e.display.on && !e.display.aodActive ? 'select' : 'unselect');
					}
				});
				break;
			}
			case 'editing': {
				this.render();
				break;
			}
		}
	}

	private onConfigurationChanged(e?: ConfigChangeEvent) {
		if (this.paused) return;
		if (
			e?.key != null &&
			e.key !== 'animateSeparator' &&
			e.key !== 'aodOpacity' &&
			e.key !== 'aodShowDay' &&
			e.key !== 'showDate' &&
			e.key !== 'showDayOnDateHide' &&
			e.key !== 'showLeadingZero' &&
			e.key !== 'showSeconds'
		) {
			return;
		}

		if (e?.key == null || e?.key === 'animateSeparator') {
			document
				.getElementById<ImageElement>('time-sep')!
				.animate(!display.aodActive && configuration.get('animateSeparator') ? 'select' : 'unselect');

			if (e?.key === 'animateSeparator') return;
		}

		if (e?.key == null || e?.key === 'aodOpacity') {
			this.updateAlwaysOnOpacity(configuration.get('aodOpacity'));

			if (e?.key === 'aodOpacity') return;
		}

		if (e?.key == null || e?.key === 'aodShowDay') {
			const $aodDay = document.getElementById<ImageElement>('aod-day')!;
			if (configuration.get('aodShowDay')) {
				$aodDay.style.display = 'inline';

				if (display.aodEnabled && display.on) {
					$aodDay.animate(display.aodActive ? 'disable' : 'enable');
				}
			} else {
				$aodDay.style.display = 'none';
			}

			if (e?.key === 'aodShowDay') return;
		}

		if (e?.key == null || e?.key === 'showDate') {
			document.getElementById<GroupElement>('date')!.style.display = configuration.get('showDate')
				? 'inline'
				: 'none';
		}

		if (e?.key == null || e?.key === 'showSeconds') {
			if (configuration.get('showSeconds')) {
				this.$seconds.style.display = 'inline';
				this.updateClock(true);

				if (e?.key === 'showSeconds') {
					this.render();
				}
			} else {
				if (this._$seconds != null) {
					this.$seconds.style.display = 'none';
				}
				this.updateClock(false);
			}

			if (e?.key === 'showSeconds') return;
		}

		this.render();
	}

	private onTick({ date }: TickEvent) {
		if (this.paused) return;

		this.date = date;
		this.renderCore();
	}

	@defer()
	render() {
		this.renderCore(true);
	}

	private renderCore(force: boolean = false) {
		if (this.paused) return;

		const date = this.date ?? new Date();

		if (configuration.get('showSeconds') && !display.aodActive) {
			this.$seconds.text = `${toMonospaceDigits(date.getSeconds(), true)}s`;
		}

		const minutes = appManager.editing ? 0 : date.getMinutes();
		if (!force && minutes === this.previous[Previous.Minutes]) return;

		this.previous[Previous.Minutes] = minutes;

		const minute = zeroPad(minutes);
		document.getElementById<ImageElement>('time-min0')!.href = `images/${minute[0] ?? 0}.png`;
		document.getElementById<ImageElement>('time-min1')!.href = `images/${minute[1] ?? 0}.png`;

		const hours = appManager.editing ? 0 : date.getHours();
		if (!force && hours === this.previous[Previous.Hours]) return;

		this.previous[Previous.Hours] = hours;

		const hour = zeroPad(!appManager.editing && preferences.clockDisplay === '12h' ? hours % 12 || 12 : hours);

		let changed = false;
		let hidingLeadingZero = false;

		if (hour[0] === '0') {
			let $hour0 = document.getElementById<ImageElement>('time-hr0')!;
			if ($hour0.style.visibility !== 'hidden') {
				$hour0.style.visibility = 'hidden';
				changed = true;
			}

			$hour0 = document.getElementById<ImageElement>('time-hr0--zero')!;

			if (configuration.get('showLeadingZero')) {
				if ($hour0.style.visibility !== 'visible') {
					$hour0.style.visibility = 'visible';
					changed = true;
				}
			} else {
				hidingLeadingZero = true;

				if ($hour0.style.visibility !== 'hidden') {
					$hour0.style.visibility = 'hidden';
					changed = true;
				}
			}
		} else {
			let $hour0 = document.getElementById<ImageElement>('time-hr0--zero')!;
			if ($hour0.style.visibility !== 'hidden') {
				$hour0.style.visibility = 'hidden';
				changed = true;
			}

			$hour0 = document.getElementById<ImageElement>('time-hr0')!;
			$hour0.href = `images/${hour[0] ?? 0}.png`;

			if ($hour0.style.visibility !== 'visible') {
				$hour0.style.visibility = 'visible';
				changed = true;
			}
		}

		if (changed) {
			document.getElementById<GroupElement>('time')!.groupTransform!.translate.x = hidingLeadingZero
				? threeDigitTimeX
				: fourDigitTimeX;
		}

		document.getElementById<ImageElement>('time-hr1')!.href = `images/${hour[1] ?? 0}.png`;

		if (appManager.editing) return;

		const day = date.getDay();
		if (!force && day === this.previous[Previous.Day]) return;

		this.previous[Previous.Day] = day;

		const month = date.getMonth();
		if (!force && month === this.previous[Previous.Month]) return;

		this.previous[Previous.Month] = month;

		const dayOfMonth = date.getDate();

		const dayName = gettext(`day_short_${day}`);

		let $dayOfWeek;
		let $dayOfMonth;
		if (configuration.get('showDayOnDateHide')) {
			$dayOfWeek = document.getElementById<TextElement>('day-of-week')!;
			$dayOfWeek.text = dayName.toLocaleUpperCase();

			$dayOfMonth = document.getElementById<TextElement>('day-of-month')!;
			$dayOfMonth.text = dayOfMonth.toString().toLocaleUpperCase();
		}

		if (configuration.get('aodShowDay')) {
			$dayOfWeek = document.getElementById<TextElement>('aod-day-of-week')!;
			$dayOfWeek.text = dayName.toLocaleUpperCase();

			$dayOfMonth = document.getElementById<TextElement>('aod-day-of-month')!;
			$dayOfMonth.text = dayOfMonth.toString().toLocaleUpperCase();
		}

		if (!configuration.get('showDate')) return;

		const monthName = gettext(`month_short_${month}`);
		const dayMonthSeparator = gettext('day_month_separator');

		const $date = document.getElementById<TextElement>('date-value')!;

		let x: number;
		switch (locale.language) {
			case 'zh-cn':
				// 2月7日周二 = Month_Date_Weekday
				$date.text = `${monthName}${dayMonthSeparator}`;
				x = $date.getBBox().width;
				$date.text += `${dayOfMonth}${dayName}`;
				x += $date.getBBox().left;
				break;
			case 'ja-jp':
				// 8月3日（木）= Month_Date (Weekday)
				$date.text = `${monthName}${dayMonthSeparator}`;
				x = $date.getBBox().width;
				$date.text += `${dayOfMonth} (${dayName})`;
				x += $date.getBBox().left;
				break;
			case 'ko-kr':
				// 2/7 (목) = Month/date (day)
				$date.text = `${date.getMonth() + 1}${dayMonthSeparator}`;
				x = $date.getBBox().width;
				$date.text += `${dayOfMonth} (${dayName})`;
				x += $date.getBBox().left;
				break;
			case 'en-us':
			case 'en-ca':
			case 'es-pa':
			case 'es-pr':
			case 'en-se':
				// Thu, Feb 7
				$date.text = `${dayName}${dayMonthSeparator} ${monthName} `;
				x = $date.getBBox().width;
				$date.text += dayOfMonth;
				x += $date.getBBox().left;
				break;
			default:
				// Thu, 7 Feb
				$date.text = `${dayName}${dayMonthSeparator} `;
				x = $date.getBBox().width;
				$date.text += `${dayOfMonth} ${monthName}`;
				x += $date.getBBox().left;
				break;
		}

		const $dateHighlight = document.getElementById<TextElement>('date-day')!;
		$dateHighlight.x =
			x +
			// For some reason the Fitbit is off by a single pixel for these numbers
			(dayOfMonth == 4 || dayOfMonth == 8 || dayOfMonth == 10 || dayOfMonth == 14 || dayOfMonth == 18 ? 1 : 0);
		$dateHighlight.text = dayOfMonth.toString();
	}

	private updateAlwaysOnOpacity(aodOpacity: number) {
		if (!display.aodAvailable) return;

		const opacity = aodOpacity / 100;

		const $timeContainer = document.getElementById<GroupElement>('time')!;
		let $animate = $timeContainer.getElementById<AnimateElement>('aod-in');
		if ($animate != null) {
			$animate.from = opacity;
		}

		$animate = $timeContainer.getElementById<AnimateElement>('aod-out');
		if ($animate != null) {
			$animate.to = opacity;
		}

		const $aodDay = document.getElementById<GroupElement>('aod-day')!;
		// Only update the opacity if it isn't currently hidden
		if ($aodDay.style.opacity !== 0) {
			$aodDay.style.opacity = opacity;
		}

		$animate = $aodDay.getElementById<AnimateElement>('aod-in');
		if ($animate != null) {
			$animate.to = opacity;
		}
	}

	private updateClock(seconds: boolean) {
		clock.granularity = seconds && !display.aodActive ? 'seconds' : 'minutes';
	}
}

const chars = String.fromCharCode(0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19);

function toMonospaceDigits(num: number, pad = true): string {
	let digits: string;
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
