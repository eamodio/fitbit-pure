import clock, { TickEvent } from 'clock';
import { display } from 'display';
import { gettext } from 'i18n';
import { locale } from 'user-settings';
import { ConfigChanged, configuration } from './configuration';
import { addEventListener, defer, Disposable, log } from '../common/system';

export class DateDisplay {
	private _date: Date | undefined;
	private _disposable: Disposable | undefined;
	private _prevMonth: number | undefined;
	private _prevDay: number | undefined;

	constructor(
		private readonly $container: GroupElement,
		private readonly $date: TextElement,
		private readonly $dateHighlight: TextElement
	) {
		configuration.onDidChange(this.onConfigurationChanged, this);
		this.onConfigurationChanged();
	}

	@log('DateDisplay', {
		0: e => `e.key=${e?.key}`
	})
	private onConfigurationChanged(e?: ConfigChanged) {
		if (e?.key != null && e.key !== 'showDate') return;

		if (configuration.get('showDate')) {
			if (this._disposable == null) {
				this._disposable = addEventListener(clock, 'tick', e => this.onTick(e));

				this.$container.style.display = 'inline';

				if (display.on && !display.aodActive) {
					this.render();
				}
			}
		} else {
			this._disposable?.dispose();
			this._disposable = undefined;

			this.$container.style.display = 'none';
		}
	}

	@log('DateDisplay', {
		0: e => `date=${e.date}`
	})
	private onTick({ date }: TickEvent) {
		this._date = date;
		this.renderCore();
	}

	@defer()
	render() {
		this.renderCore(true);
	}

	@log('DateDisplay')
	private renderCore(force: boolean = false) {
		const date = this._date ?? new Date();

		const day = date.getDay();
		if (!force && day === this._prevDay) return;

		this._prevDay = day;

		const month = date.getMonth();
		if (!force && month === this._prevMonth) return;

		this._prevMonth = month;

		const monthName = gettext(`month_short_${month}`);
		const dayName = gettext(`day_short_${day}`);
		const dayMonthSeparator = gettext('day_month_separator');

		let x: number;
		switch (locale.language) {
			case 'zh-cn':
				// 2月7日周二 = Month_Date_Weekday
				this.$date.text = `${monthName}${dayMonthSeparator}${date.getDate()}`;
				x = this.$date.getBBox().width;
				this.$date.text += `${dayName}`;
				x += this.$date.getBBox().left;
				break;
			case 'ja-jp':
				// 8月3日（木）= Month_Date (Weekday)
				this.$date.text = `${monthName}${dayMonthSeparator}${date.getDate()}`;
				x = this.$date.getBBox().width;
				this.$date.text += ` (${dayName})`;
				x += this.$date.getBBox().left;
				break;
			case 'ko-kr':
				// 2/7 (목) = Month/date (day)
				this.$date.text = `${date.getMonth() + 1}${dayMonthSeparator}${date.getDate()}`;
				x = this.$date.getBBox().width;
				this.$date.text += ` (${dayName})`;
				x += this.$date.getBBox().left;
				break;
			case 'en-us':
			case 'en-ca':
			case 'es-pa':
			case 'es-pr':
			case 'en-se':
				// Thu, Feb 7
				this.$date.text = `${dayName}${dayMonthSeparator} ${monthName} ${date.getDate()}`;
				x = this.$date.getBBox().right;
				break;
			default:
				// Thu, 7 Feb
				this.$date.text = `${dayName}${dayMonthSeparator} ${date.getDate()}`;
				x = this.$date.getBBox().width;
				this.$date.text += ` ${monthName}`;
				x += this.$date.getBBox().left;
				break;
		}

		this.$dateHighlight.x = x;
		this.$dateHighlight.text = `${date.getDate()}`;
	}
}
