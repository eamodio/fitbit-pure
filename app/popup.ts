import document from 'document';
import { AppEvent, AppManager } from './appManager';
import { addEventListener, Disposable } from '../common/system';

export class DonatePopup implements Disposable {
	private _disposable: Disposable | undefined;

	constructor(private readonly appManager: AppManager) {
		this._disposable = Disposable.from(
			this.appManager.onDidTriggerAppEvent(this.onAppEvent, this),
			addEventListener(this.$button, 'click', () => this.onButtonClick()),
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

	private onAppEvent(e: AppEvent) {
		if (e.type !== 'display') return;

		if (!e.display.on || e.display.aodActive) {
			this.close();
		}
	}

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
			$popup.getElementById<TumblerViewElement>('code1')!,
			$popup.getElementById<TumblerViewElement>('code2')!,
			$popup.getElementById<TumblerViewElement>('code3')!,
		];

		const date = new Date();
		const value = `${date.getUTCFullYear().toString().substr(2)}${date.getUTCMonth().toString(16)}`;
		if ($tumblers.every(($, index) => $.value === Number(value[index]))) {
			this.accept();
		} else {
			this.reject();
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
