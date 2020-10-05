import document from 'document';
import { AppEvent, AppManager } from './appManager';
import { addEventListener, Disposable } from '../common/system';

export class DonatePopup implements Disposable {
	private disposable: Disposable | undefined;

	constructor(private readonly appManager: AppManager) {
		this.disposable = Disposable.from(
			this.appManager.onDidTriggerAppEvent(this.onAppEvent, this),
			addEventListener(this.$backButton, 'click', () => this.onBackButtonClick()),
			addEventListener(this.$nextButton, 'click', () => this.onNextButtonClick()),
			addEventListener(document, 'unload', () => this.dispose()),
		);
	}

	dispose(): void {
		this.disposable?.dispose();
	}

	private get $backButton(): TextButtonElement {
		return this.$popup.getElementById<TextButtonElement>('back-button')!;
	}

	private get $nextButton(): TextButtonElement {
		return this.$popup.getElementById<TextButtonElement>('next-button')!;
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

	private onBackButtonClick() {
		console.log('DonatePopup:close');

		const $steps = this.$steps;
		if ($steps[0].style.display === 'none') {
			$steps[0].style.display = 'inline';
			$steps[1].style.display = 'none';

			this.$nextButton.text = 'Next';

			return;
		}

		this.close();
	}

	private onNextButtonClick() {
		const $steps = this.$steps;
		if ($steps[0].style.display !== 'none') {
			$steps[0].style.display = 'none';
			$steps[1].style.display = 'inline';

			this.$nextButton.text = 'Done';

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

	async close() {
		console.log('DonatePopup:close');

		await document.location.replace('index.view');

		// document.history.go(-1);
		// this.$popup.style.display = 'none';
		// this.dispose();
	}

	show() {
		console.log('DonatePopup:show');

		// this.$popup.style.display = 'inline';
	}

	private accept() {
		this.appManager.donated = true;
		this.close();
	}

	private reject() {
		// Show an error state on the button for a short time
		this.$nextButton.animate('enable');
	}
}
