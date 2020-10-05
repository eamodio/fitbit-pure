import document from 'document';
import { AppEvent, AppManager } from './appManager';
import { addEventListener, Disposable } from '../common/system';

export class DonateView implements Disposable {
	private disposable: Disposable | undefined;
	private accepted = false;
	private resolver: ((value?: boolean | PromiseLike<boolean> | undefined) => void) | undefined;

	constructor(private readonly appManager: AppManager) {}

	dispose(): void {
		this.resolver?.(this.accepted);
		this.disposable?.dispose();
	}

	private get $backButton(): TextButtonElement {
		return this.$view.getElementById<TextButtonElement>('back-button')!;
	}

	private get $nextButton(): TextButtonElement {
		return this.$view.getElementById<TextButtonElement>('next-button')!;
	}

	private get $view(): GroupElement {
		return document.getElementById<GroupElement>('donate-view')!;
	}

	private get $steps(): GroupElement[] {
		return this.$view.getElementsByClassName<GroupElement>('donate-step')!;
	}

	private onAppEvent(e: AppEvent) {
		if (e.type !== 'display') return;

		if (!e.display.on || e.display.aodActive) {
			this.dispose();
		}
	}

	private onBackButtonClick() {
		const $steps = this.$steps;
		if ($steps[0].style.display === 'none') {
			$steps[0].style.display = 'inline';
			$steps[1].style.display = 'none';

			this.$nextButton.text = 'Next';

			return;
		}

		this.dispose();
	}

	private onNextButtonClick() {
		const $steps = this.$steps;
		if ($steps[0].style.display !== 'none') {
			$steps[0].style.display = 'none';
			$steps[1].style.display = 'inline';

			this.$nextButton.text = 'Done';

			return;
		}

		const $popup = this.$view;
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

	show(): Promise<boolean> {
		// eslint-disable-next-line no-async-promise-executor
		return new Promise<boolean>(async resolve => {
			this.resolver = resolve;
			await document.location.replace('./resources/donate.view');

			this.disposable = Disposable.from(
				this.appManager.onDidTriggerAppEvent(this.onAppEvent, this),
				addEventListener(this.$backButton, 'click', () => this.onBackButtonClick()),
				addEventListener(this.$nextButton, 'click', () => this.onNextButtonClick()),
				addEventListener(document, 'unload', () => this.dispose()),
			);
		});
	}

	private accept() {
		this.accepted = true;
		this.dispose();
	}

	private reject() {
		// Show an error state on the button for a short time
		this.$nextButton.animate('enable');
	}
}
