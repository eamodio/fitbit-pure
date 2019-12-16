export function debounce<T extends (...arg: any) => any>(wait: number) {
	return (target: any, key: string, descriptor: PropertyDescriptor & { [key: string]: any }) => {
		if (typeof descriptor.value !== 'function') {
			throw new Error('Not supported');
		}

		const debounceKey = `$debounce$${key}`;
		const fn = descriptor.value;

		descriptor.value = function(this: any, ...args: Parameters<T>) {
			clearTimeout(this[debounceKey]);
			this[debounceKey] = setTimeout(() => fn.apply(this, args), wait);
		};
	};
}
