import Component from 'ShopUi/models/component';
import {
    expandWithProductTrackingDetails,
    readProductTrackingDetails,
} from '../traceable-events-orchestrator/product-tracking-details';
import { getCardProductKey } from './card-product-key';
import { readListDomChanges } from './list-dom-changes';

// The product a card holds, before the tracker adds its position in the list.
export interface TraceableCardProduct {
    sku: string;
    [key: string]: unknown;
}

export interface TraceableListItem extends TraceableCardProduct {
    index: number;
}

export interface TraceableItemList {
    id: string;
    name: string;
    products: TraceableListItem[];
}

export interface TraceableItemListViewDetail {
    itemLists: TraceableItemList[];
}

export default class TraceableItemListViewTracker extends Component {
    protected visibilityObserver: IntersectionObserver;
    protected domChangeObserver: MutationObserver;
    protected observedItems = new WeakSet<Element>();
    // List id and product of every card already reported or waiting to be, e.g. `similar_products|066_23294028`, see getCardProductKey().
    protected seenProductKeys = new Set<string>();
    protected pendingItemLists = new Map<string, TraceableItemList>();
    protected reportTimeout: number | null = null;
    protected isScanScheduled = false;
    // The lists a DOM change added or changed, scanned once per frame; a change elsewhere on the page,
    // e.g. the cart counter, adds none.
    protected changedListElements = new Set<Element>();

    protected init(): void {
        this.visibilityObserver = new IntersectionObserver((entries) => this.onVisibilityChange(entries), {
            threshold: this.visibleRatio,
        });

        for (const listElement of Array.from(document.querySelectorAll(this.listSelector))) {
            this.changedListElements.add(listElement);
        }

        this.scanChangedLists();
        // Lists can be rendered later, e.g. the cart upselling products are loaded by ajax.
        this.domChangeObserver = new MutationObserver((records) => this.onDomChange(records));
        this.domChangeObserver.observe(document.body, { childList: true, subtree: true });
    }

    // The products already seen are reported at once, as the page goes on without the tracker.
    disconnectedCallback(): void {
        this.domChangeObserver?.disconnect();
        this.visibilityObserver?.disconnect();

        if (this.reportTimeout === null) {
            return;
        }

        window.clearTimeout(this.reportTimeout);
        this.report();
    }

    protected onDomChange(records: MutationRecord[]): void {
        const { changedListElements, removedItemElements } = readListDomChanges(
            records,
            this.listSelector,
            this.itemSelector,
        );

        // A removed card never becomes visible, so it is no longer observed; one added back later is observed again.
        for (const itemElement of removedItemElements) {
            this.visibilityObserver.unobserve(itemElement);
            this.observedItems.delete(itemElement);
        }

        changedListElements.forEach((listElement) => this.changedListElements.add(listElement));

        if (!this.changedListElements.size) {
            return;
        }

        this.scheduleScan();
    }

    protected scheduleScan(): void {
        if (this.isScanScheduled) {
            return;
        }

        this.isScanScheduled = true;
        window.requestAnimationFrame(() => {
            this.isScanScheduled = false;
            this.scanChangedLists();
        });
    }

    protected scanChangedLists(): void {
        const changedListElements = Array.from(this.changedListElements);

        this.changedListElements.clear();

        for (const listElement of changedListElements) {
            if (!listElement.isConnected) {
                continue;
            }

            this.scanItems(listElement);
        }
    }

    protected scanItems(listElement: Element): void {
        const indexesByProduct = new Map<string, number>();
        // A paginated list, e.g. category results, continues counting from its earlier pages.
        const indexOffset = Number(listElement.getAttribute(this.indexOffsetAttribute)) || 0;

        for (const itemElement of Array.from(listElement.querySelectorAll(this.itemSelector))) {
            const item = this.parseItem(itemElement);

            if (!item?.sku) {
                continue;
            }

            const productKey = getCardProductKey(item);

            if (!indexesByProduct.has(productKey)) {
                indexesByProduct.set(productKey, indexesByProduct.size);
            }

            itemElement.setAttribute(this.indexAttribute, String(indexOffset + indexesByProduct.get(productKey)));

            if (this.observedItems.has(itemElement)) {
                continue;
            }

            this.observedItems.add(itemElement);
            this.visibilityObserver.observe(itemElement);
        }
    }

    protected onVisibilityChange(entries: IntersectionObserverEntry[]): void {
        for (const entry of entries) {
            if (!entry.isIntersecting) {
                continue;
            }

            this.visibilityObserver.unobserve(entry.target);
            this.addSeenProduct(entry.target);
        }
    }

    protected addSeenProduct(itemElement: Element): void {
        const listElement = itemElement.closest(this.listSelector);
        const item = this.parseItem(itemElement);
        const listId = listElement?.getAttribute(this.listIdAttribute);

        if (!listId || !item?.sku) {
            return;
        }

        const productKey = `${listId}|${getCardProductKey(item)}`;

        if (this.seenProductKeys.has(productKey)) {
            return;
        }

        this.seenProductKeys.add(productKey);

        if (!this.pendingItemLists.has(listId)) {
            const listName = listElement.getAttribute(this.listNameAttribute) ?? listId;

            this.pendingItemLists.set(listId, { id: listId, name: listName, products: [] });
        }

        const index = Number(itemElement.getAttribute(this.indexAttribute));

        this.pendingItemLists.get(listId).products.push({ ...item, index });
        this.scheduleReport();
    }

    protected scheduleReport(): void {
        if (this.reportTimeout !== null) {
            return;
        }

        this.reportTimeout = window.setTimeout(() => this.report(), this.reportDelay);
    }

    // A card holds only what it shows; the abstract product name, brand, variant and categories come from the product tracking
    // details of the page, read when the products are reported, as the orchestrator does for the data of every other event.
    protected report(): void {
        const productTrackingDetails = readProductTrackingDetails();
        const itemLists = Array.from(this.pendingItemLists.values()).map((itemList) => ({
            ...itemList,
            products: expandWithProductTrackingDetails(
                itemList.products,
                productTrackingDetails,
            ) as TraceableListItem[],
        }));
        const detail: TraceableItemListViewDetail = { itemLists };

        this.reportTimeout = null;
        this.pendingItemLists.clear();

        document.dispatchEvent(new CustomEvent<TraceableItemListViewDetail>(this.viewEventName, { detail }));
    }

    protected parseItem(itemElement: Element): TraceableCardProduct | null {
        const value = itemElement.getAttribute(this.itemAttribute);

        if (!value) {
            return null;
        }

        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }

    protected get listSelector(): string {
        return this.getAttribute('list-selector');
    }

    protected get listIdAttribute(): string {
        return this.getAttribute('list-id-attribute');
    }

    protected get listNameAttribute(): string {
        return this.getAttribute('list-name-attribute');
    }

    protected get indexOffsetAttribute(): string {
        return this.getAttribute('index-offset-attribute');
    }

    protected get itemSelector(): string {
        return this.getAttribute('item-selector');
    }

    protected get itemAttribute(): string {
        return this.getAttribute('item-attribute');
    }

    protected get indexAttribute(): string {
        return this.getAttribute('index-attribute');
    }

    protected get viewEventName(): string {
        return this.getAttribute('view-event');
    }

    protected get visibleRatio(): number {
        return Number(this.getAttribute('visible-ratio'));
    }

    protected get reportDelay(): number {
        return Number(this.getAttribute('report-delay'));
    }
}
