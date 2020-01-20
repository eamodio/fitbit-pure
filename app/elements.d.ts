interface AnimateElement extends Element {
	from: string | number | undefined;
	to: string | number | undefined;
	dur: string | number | undefined;
}

interface ComboButtonElement extends Element, Styled {}

interface SquareButtonElement extends Element, Styled {}

interface TumblerViewElement extends ContainerElement, Styled {
	value: number;
}

interface StyledElement extends Element, Styled {}

interface ElementSearch {
	getElementById<T extends Element>(id: string): T | null;
	getElementsByClassName<T extends Element>(className: string): T[];
}
