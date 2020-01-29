import { Display } from 'display';
import document from 'document';
import { AppManager } from './appManager';
import { addEventListener, Disposable, log } from '../common/system';

export class DonatePopup implements Disposable {
	private _disposable: Disposable | undefined;

	constructor(private readonly appManager: AppManager) {
		this._disposable = Disposable.from(
			this.appManager.onDidChangeDisplay(this.onDisplayChanged, this),
			addEventListener(this.$button, 'click', () => this.onButtonClick())
		);
	}

	dispose() {
		this._disposable?.dispose();
	}

	private get $button(): ComboButtonElement {
		return this.$popup.getElementById<ComboButtonElement>('donate-button')!;
	}

	private get $popup(): GroupElement {
		return document.getElementById<GroupElement>('donate-popup')!;
	}

	private get $steps(): GroupElement[] {
		return this.$popup.getElementsByClassName<GroupElement>('donate-step')!;
	}

	@log('DonatePopup')
	private onButtonClick() {
		const $steps = this.$steps;
		if ($steps[0].style.display !== 'none') {
			$steps[0].style.display = 'none';
			$steps[1].style.display = 'inline';

			const $button = this.$button;
			$button.getElementById<ImageElement>('combo-button-icon')!.href = 'images/check.png';
			$button.getElementById<ImageElement>('combo-button-icon-press')!.href = 'images/check-pressed.png';

			return;
		}

		const $popup = this.$popup;
		const $tumblers = [
			$popup.getElementById<TumblerViewElement>('donate-code-digit-1')!,
			$popup.getElementById<TumblerViewElement>('donate-code-digit-2')!,
			$popup.getElementById<TumblerViewElement>('donate-code-digit-3')!
		];

		const date = new Date();
		const value = `${date
			.getUTCFullYear()
			.toString()
			.substr(2)}${date.getUTCMonth().toString(16)}`;
		if ($tumblers.every(($, index) => $.value === Number(value[index]))) {
			this.accept();
		} else {
			this.reject();
		}
	}

	@log('DonatePopup', {
		0: sensor => `on=${sensor.on}, aodActive=${sensor.aodActive}`
	})
	private onDisplayChanged(sensor: Display) {
		if (!sensor.on || sensor.aodActive) {
			this.close();
		}
	}

	close() {
		this.$popup.style.display = 'none';
		this.dispose();
	}

	show() {
		this.reset();

		this.$popup.style.display = 'inline';
	}

	private accept() {
		this.appManager.donated = true;
		this.close();
	}

	private reject() {
		// Show an error state on the button for a short time
		this.$button.animate('enable');
	}

	private reset() {
		const $steps = this.$steps;
		$steps[0].style.display = 'inline';
		$steps[1].style.display = 'none';

		const $button = this.$button;
		$button.getElementById<ImageElement>('combo-button-icon')!.href = 'images/next.png';
		$button.getElementById<ImageElement>('combo-button-icon-press')!.href = 'images/next-pressed.png';
	}
}
