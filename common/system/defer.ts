declare function cancelAnimationFrame(handle: number): void;
declare function requestAnimationFrame(handler: (timestamp: number) => void): number;

export function defer<T extends (...arg: any) => any>() {
	return (target: any, key: string, descriptor: PropertyDescriptor & { [key: string]: any }) => {
		if (typeof descriptor.value !== 'function') {
			throw new Error('Not supported');
		}

		const deferKey = `$defer$${key}`;
		const fn = descriptor.value;

		descriptor.value = function(this: any, ...args: Parameters<T>) {
			cancelAnimationFrame(this[deferKey]);
			this[deferKey] = requestAnimationFrame(() => fn.apply(this, args));
		};
	};
}
