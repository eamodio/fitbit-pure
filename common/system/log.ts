const enableLogging = false;

export function log<T extends (...arg: any) => any>(
	instanceName: string,
	parameters?: false | { [arg: number]: false | ((arg: any) => string) }
) {
	return (target: any, key: string, descriptor: PropertyDescriptor & { [key: string]: any }) => {
		if (!enableLogging) return;

		let fn: Function | undefined;
		let fnKey: string | undefined;
		if (typeof descriptor.value === 'function') {
			fn = descriptor.value;
			fnKey = 'value';
		} else if (typeof descriptor.get === 'function') {
			fn = descriptor.get;
			fnKey = 'get';
		}
		if (fn == null || fnKey == null) throw new Error('Not supported');

		descriptor[fnKey] = function(this: any, ...args: Parameters<T>) {
			const prefix = `${instanceName}.${key}`;

			let loggableParams: string;
			if (parameters === false || args.length === 0) {
				loggableParams = emptyStr;
			} else {
				const paramFns = typeof parameters === 'object' ? parameters : undefined;
				let paramFn: undefined | false | ((arg: any) => string);

				let loggable;
				loggableParams = args
					.map((v: any, index: number) => {
						paramFn = paramFns?.[index];
						if (paramFn === undefined) {
							loggable = toLoggable(v);
						} else {
							if (paramFn === false) return undefined;

							loggable = paramFn(v);
							if (loggable === false) return undefined;
						}

						return loggable;
					})
					.filter(Boolean)
					.join(', ');
			}

			console.log(`${prefix}${loggableParams ? ` ${loggableParams}` : ''}`);

			const start = Date.now();

			let result;
			try {
				result = fn!.apply(this, args);
			} catch (ex) {
				console.error(ex);
				throw ex;
			}

			console.log(`${prefix}${loggableParams ? ` ${loggableParams}` : ''} \u2022 ${Date.now() - start} ms`);
			return result;
		};
	};
}

const emptyStr = '';

function toLoggable(p: any, sanitize?: ((key: string, value: any) => any) | undefined) {
	if (typeof p !== 'object') return String(p);

	try {
		return JSON.stringify(p, sanitize);
	} catch {
		return '<error>';
	}
}

interface Console {
	assert(assertion: boolean, message?: any, ...optionalParams: any[]): void;
	error(message?: any, ...optionalParams: any[]): void;
	info(message?: any, ...optionalParams: any[]): void;
	log(message?: any, ...optionalParams: any[]): void;
	warn(message?: any, ...optionalParams: any[]): void;
	trace(): void;
}
declare const console: Console;
