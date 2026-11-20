export interface ListDomChanges {
    changedListElements: Element[];
    removedItemElements: Element[];
}

// A list changed when cards were added or removed inside it, or when it was added itself, alone or within a larger part
// of the page; a change elsewhere on the page, e.g. the cart counter, changes no list. A removed card may be removed
// itself or within a removed part of the page, e.g. a list replaced by an ajax re-render.
export function readListDomChanges(
    records: MutationRecord[],
    listSelector: string,
    itemSelector: string,
): ListDomChanges {
    const changedListElements = new Set<Element>();
    const removedItemElements = new Set<Element>();

    for (const record of records) {
        // Only text changed, e.g. a counter or a price: no card or list was added or removed.
        if (!hasElementNode(record.addedNodes) && !hasElementNode(record.removedNodes)) {
            continue;
        }

        const changedElement = record.target instanceof Element ? record.target : null;
        const enclosingListElement = changedElement?.closest(listSelector);

        if (enclosingListElement) {
            changedListElements.add(enclosingListElement);
        }

        getMatchingElements(record.addedNodes, listSelector).forEach((element) => changedListElements.add(element));
        getMatchingElements(record.removedNodes, itemSelector).forEach((element) => removedItemElements.add(element));
    }

    return {
        changedListElements: Array.from(changedListElements),
        removedItemElements: Array.from(removedItemElements),
    };
}

function hasElementNode(nodes: NodeList): boolean {
    return Array.from(nodes).some((node) => node instanceof Element);
}

function getMatchingElements(nodes: NodeList, selector: string): Element[] {
    const matchingElements: Element[] = [];

    for (const node of Array.from(nodes)) {
        if (!(node instanceof Element)) {
            continue;
        }

        if (node.matches(selector)) {
            matchingElements.push(node);
        }

        matchingElements.push(...Array.from(node.querySelectorAll(selector)));
    }

    return matchingElements;
}
