import { gettext } from 'i18n';
import { locale } from 'user-settings';

export function getLocalizedDate(date: Date) {
	const monthNum = date.getMonth();
	const monthName = gettext(`month_short_${monthNum}`);

	const weekdayNum = date.getDay();
	const dayName = gettext(`day_short_${weekdayNum}`);

	const dayMonthSeparator = gettext('day_month_separator');

	switch (locale.language) {
		case 'zh-cn':
			// 2月7日周二 = Month_Date_Weekday
			return `${monthName}${dayMonthSeparator}${date.getDate()}${dayName}`;
		case 'ja-jp':
			// 8月3日（木）= Month_Date (Weekday)
			return `${monthName}${dayMonthSeparator}${date.getDate()} (${dayName})`;
		case 'ko-kr':
			// 2/7 (목) = Month/date (day)
			return `${date.getMonth() + 1}${dayMonthSeparator}${date.getDate()} (${dayName})`;
		case 'en-us':
		case 'en-ca':
		case 'es-pa':
		case 'es-pr':
		case 'en-se':
			// Thu, Feb 7
			return `${dayName}${dayMonthSeparator} ${monthName} ${date.getDate()}`;
		default:
			// Thu, 7 Feb
			return `${dayName}${dayMonthSeparator} ${date.getDate()} ${monthName}`;
	}
}
