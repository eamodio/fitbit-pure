import { Disposable } from '../system';

export interface Event<T> {
	(listener: (e: T) => any, thisArgs?: any): Disposable;
}

type Listener<T> = [(e: T) => void, any] | ((e: T) => void);

export class EventEmitter<T> {
	private static readonly _noop = function() {};

	private _disposed: boolean = false;
	private _event?: Event<T>;
	private _deliveryQueue?: LinkedList<[Listener<T>, T]>;
	protected _listeners?: LinkedList<Listener<T>>;

	constructor() {}

	get event(): Event<T> {
		if (this._event == null) {
			this._event = (listener: (e: T) => any, thisArgs?: any) => {
				if (this._listeners == null) {
					this._listeners = new LinkedList();
				}

				const remove = this._listeners.push(!thisArgs ? listener : [listener, thisArgs]);

				const result = {
					dispose: () => {
						result.dispose = EventEmitter._noop;
						if (!this._disposed) {
							remove();
						}
					}
				};

				return result;
			};
		}

		return this._event;
	}

	fire(event: T): void {
		if (this._listeners) {
			// put all [listener,event]-pairs into delivery queue
			// then emit all event. an inner/nested event might be
			// the driver of this

			if (!this._deliveryQueue) {
				this._deliveryQueue = new LinkedList();
			}

			for (let iter = this._listeners.iterator(), e = iter.next(); !e.done; e = iter.next()) {
				this._deliveryQueue.push([e.value, event]);
			}

			while (this._deliveryQueue.size > 0) {
				const [listener, event] = this._deliveryQueue.shift()!;
				try {
					if (typeof listener === 'function') {
						// eslint-disable-next-line no-useless-call
						listener.call(undefined, event);
					} else {
						listener[0].call(listener[1], event);
					}
				} catch {}
			}
		}
	}

	dispose() {
		if (this._listeners) {
			this._listeners.clear();
		}
		if (this._deliveryQueue) {
			this._deliveryQueue.clear();
		}
		this._disposed = true;
	}
}

class Node<T> {
	static readonly Undefined = new Node<any>(undefined);

	element: T;
	next: Node<T>;
	prev: Node<T>;

	constructor(element: T) {
		this.element = element;
		this.next = Node.Undefined;
		this.prev = Node.Undefined;
	}
}

class LinkedList<T> {
	private _first: Node<T> = Node.Undefined;
	private _last: Node<T> = Node.Undefined;
	private _size: number = 0;

	get size(): number {
		return this._size;
	}

	isEmpty(): boolean {
		return this._first === Node.Undefined;
	}

	clear(): void {
		this._first = Node.Undefined;
		this._last = Node.Undefined;
		this._size = 0;
	}

	push(element: T): () => void {
		const newNode = new Node(element);
		if (this._first === Node.Undefined) {
			this._first = newNode;
			this._last = newNode;
		} else {
			const oldLast = this._last;
			this._last = newNode;
			newNode.prev = oldLast;
			oldLast.next = newNode;
		}
		this._size += 1;

		let didRemove = false;
		return () => {
			if (!didRemove) {
				didRemove = true;
				this._remove(newNode);
			}
		};
	}

	shift(): T | undefined {
		if (this._first === Node.Undefined) return undefined;

		const res = this._first.element;
		this._remove(this._first);
		return res;
	}

	private _remove(node: Node<T>): void {
		if (node.prev !== Node.Undefined && node.next !== Node.Undefined) {
			// middle
			const anchor = node.prev;
			anchor.next = node.next;
			node.next.prev = anchor;
		} else if (node.prev === Node.Undefined && node.next === Node.Undefined) {
			// only node
			this._first = Node.Undefined;
			this._last = Node.Undefined;
		} else if (node.next === Node.Undefined) {
			// last
			this._last = this._last.prev;
			this._last.next = Node.Undefined;
		} else if (node.prev === Node.Undefined) {
			// first
			this._first = this._first.next;
			this._first.prev = Node.Undefined;
		}

		// done
		this._size -= 1;
	}

	iterator(): Iterator<T> {
		let element: { done: false; value: T };
		let node = this._first;
		return {
			next: function(): IteratorResult<T> {
				if (node === Node.Undefined) return FIN;

				if (element == null) {
					element = { done: false, value: node.element };
				} else {
					element.value = node.element;
				}
				node = node.next;
				return element;
			}
		};
	}
}

interface Iterator<T> {
	next(): IteratorResult<T>;
}

type IteratorResult<T> = IteratorDefinedResult<T> | IteratorUndefinedResult;

interface IteratorDefinedResult<T> {
	readonly done: false;
	readonly value: T;
}

interface IteratorUndefinedResult {
	readonly done: true;
	readonly value: undefined;
}

const FIN: IteratorUndefinedResult = { done: true, value: undefined };
