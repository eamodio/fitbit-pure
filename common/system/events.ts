import { Disposable } from '../system';

export interface Event<T> {
	(listener: (e: T) => any, thisArgs?: any): Disposable;
}

type Listener<T> = [(e: T) => void, any] | ((e: T) => void);

export class EventEmitter<T> {
	private static readonly _noop = function () {
		/* noop */
	};

	private _disposed: boolean = false;
	private _event?: Event<T>;
	private _listeners?: Listener<T>[];
	private _queue?: [Listener<T>, T][];

	get event(): Event<T> {
		if (this._event == null) {
			this._event = (listener: (e: T) => any, thisArgs?: any) => {
				if (this._listeners == null) {
					this._listeners = [];
				}

				const item: Listener<T> = thisArgs == null ? listener : [listener, thisArgs];
				this._listeners.push(item);

				const result = {
					dispose: () => {
						result.dispose = EventEmitter._noop;
						if (!this._disposed) {
							const index = this._listeners?.indexOf(item);
							if (index != null && index !== -1) {
								this._listeners?.splice(index, 1);
							}
						}
					},
				};

				return result;
			};
		}

		return this._event;
	}

	fire(event: T): void {
		if (this._listeners == null) return;

		if (this._queue == null) {
			this._queue = [];
		}

		this._queue.push(
			...this._listeners.map<[Listener<T>, T]>(l => [l, event]),
		);

		while (this._queue.length > 0) {
			const [listener, event] = this._queue.shift()!;
			try {
				if (typeof listener === 'function') {
					listener(event);
				} else {
					listener[0].call(listener[1], event);
				}
			} catch {}
		}
	}

	dispose() {
		if (this._listeners != null) {
			this._listeners.length = 0;
		}
		if (this._queue != null) {
			this._queue.length = 0;
		}
		this._disposed = true;
	}
}
