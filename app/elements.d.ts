interface AnimateElement extends Element {
	from: string | number | undefined;
	to: string | number | undefined;
	dur: string | number | undefined;

	repeatDur: string | number | undefined;
	repeatCount: 'indefinite' | string | number | undefined;
}

interface IconButtonElement extends Element, Styled {}
interface IconTextButtonElement extends Element, Styled {}

interface TextareaButtonElement extends Element, Styled {}
interface TextButtonElement extends Element, Styled {}

interface TumblerViewElement extends ContainerElement, Styled {
	value: number;
}

interface StyledElement extends Element, Styled {}

interface ElementSearch {
	getElementById<T extends Element>(id: string): T | null;
	getElementsByClassName<T extends Element>(className: string): T[];
}
