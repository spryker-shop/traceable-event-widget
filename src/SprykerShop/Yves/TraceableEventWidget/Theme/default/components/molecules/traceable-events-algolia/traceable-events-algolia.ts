/* eslint-disable max-lines */
import type algolia from 'search-insights';
import type { InsightsMethodMap } from 'search-insights';
import {
    BaseTraceableEventAdapter,
    TraceableEventHandlers,
} from '../traceable-events-orchestrator/base-traceable-event-adapter';
import {
    EventName,
    EventsHandlerData,
    TraceableEventHandler,
} from '../traceable-events-orchestrator/traceable-events-orchestrator';
import { CONSENT_PURPOSE_STATISTICS, ConsentPurpose } from '../traceable-events-consent/consent-purposes';

declare global {
    interface GlobalEventsData {
        currency: string;
    }
}

interface InitialData {
    appId: string;
    apiKey: string;
    indexName: string;
    authenticatedUserToken?: string;
    userToken: string;
}

interface ProductDetails {
    sku: string;
    position?: number;
    // Null when the visitor may not see prices.
    price?: number | null;
    searchId?: string;
    quantity?: number;
}

interface Filter {
    name: string;
    value: string | string[];
}

interface ProductEventData extends EventsHandlerData<EventName> {
    products: ProductDetails[];
    searchId?: string;
    filters?: Filter[];
}

interface CartItemsChangeData extends EventsHandlerData<EventName> {
    eventDetail?: {
        increased?: ProductDetails[];
    };
}

interface OrderSuccessData extends EventsHandlerData<EventName> {
    products: ProductDetails[];
    total: number;
}

const SEARCH_QUERY_ID_KEY = 'algolia-search-query-id';
const FILTERS_KEY = 'algolia-filters';

type InsightsClient = typeof algolia;

export default class TraceableEventsAlgolia extends BaseTraceableEventAdapter {
    protected algoliaLimitProducts = 20;
    protected algoliaLimitFilters = 10;
    // Started by activate(); resolves to null when the library fails to load.
    protected insightsClientLoad: Promise<InsightsClient | null> | null = null;

    // Search insights measure how shoppers search and what they pick from the results.
    override get consentPurposes(): ConsentPurpose[] {
        return [CONSENT_PURPOSE_STATISTICS];
    }

    // Loaded only with consent: no user token reaches Algolia before, and no download without consent.
    override activate(): void {
        const { appId, apiKey, userToken, authenticatedUserToken } = this.initialData;

        this.insightsClientLoad ??= this.loadInsightsClient();
        // Chained before any event, so the library is set up before it sends one.
        this.callInsightsClient('init', {
            appId,
            apiKey,
            ...((authenticatedUserToken || userToken) && { userToken: authenticatedUserToken || userToken }),
            ...(authenticatedUserToken && { authenticatedUserToken }),
        });
    }

    // A library blocked e.g. by a content blocker sends nothing; tracking never breaks the page.
    protected async loadInsightsClient(): Promise<InsightsClient | null> {
        try {
            const { default: insightsClient } = await import(
                /* webpackMode: "lazy" */
                /* webpackChunkName: "search-insights" */
                'search-insights'
            );

            return insightsClient;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`TraceableEvents: ${this.name} - search-insights did not load: ${error}`);

            return null;
        }
    }

    override getHandlers(): Partial<TraceableEventHandlers> {
        return {
            PRODUCT_CLICK: [this.productClickHandler],
            FILTER_CLICK: [this.filterClickHandler],
            PAGE_LOAD: [this.viewedProductsHandler, this.purchaseHandler, this.viewedFiltersHandler],
            ADD_TO_CART: [this.addToCartHandler],
            CART_ITEMS_CHANGE: [this.cartItemsChangeHandler],
            ADD_TO_WISHLIST: [this.convertedClickHandler('Added to Wishlist')],
            ADD_TO_SHOPPING_LIST: [this.convertedClickHandler('Added to Shopping List')],
        };
    }

    protected productClickHandler(data: ProductEventData): void {
        const { products, page } = data;
        const { sku, position, searchId: queryID } = products?.[0] ?? {};
        const name = queryID ? 'clickedObjectIDsAfterSearch' : 'clickedObjectIDs';

        this.sendEvent(name, {
            eventName: this.normalizeEventName('Product Clicked', page),
            objectIDs: [String(sku)],
            ...(queryID && { queryID, positions: [position] }),
        });

        if (page === 'PDP') {
            window.sessionStorage.removeItem(FILTERS_KEY);
        }
    }

    protected filterClickHandler(data: ProductEventData): void {
        this.sendEvent('clickedFilters', {
            eventName: 'Filter Clicked',
            filters: this.getFilters(data.filters),
        });
    }

    protected viewedProductsHandler(data: ProductEventData): void {
        const { products, page } = data;
        const validPages = ['PDP', 'CATALOG'];

        if (!products?.length || !validPages.includes(page)) {
            return;
        }

        this.sendEvent('viewedObjectIDs', {
            eventName: this.normalizeEventName('Products Viewed', page),
            objectIDs: this.normalizeProducts(products).map(({ sku }) => sku),
        });
    }

    protected viewedFiltersHandler(data: ProductEventData): void {
        const { filters, page } = data;
        const keepFiltersFor = ['PDP', 'CATALOG'];

        if (!keepFiltersFor.includes(page)) {
            window.sessionStorage.removeItem(FILTERS_KEY);
        }

        if (!filters?.length || page !== 'CATALOG') {
            return;
        }

        const parsedFilters = this.getFilters(filters);

        this.sendEvent('viewedFilters', {
            eventName: 'Filters Viewed',
            filters: parsedFilters,
        });
        window.sessionStorage.setItem(FILTERS_KEY, JSON.stringify(parsedFilters));
    }

    protected convertedClickHandler(eventName: string): TraceableEventHandler {
        return (data: ProductEventData): void => {
            const { products, searchId: queryID, page } = data;
            const name = queryID ? 'convertedObjectIDsAfterSearch' : 'convertedObjectIDs';

            this.sendEvent(name, {
                eventName: this.normalizeEventName(eventName, page),
                objectIDs: this.normalizeProducts(products).map(({ sku }) => sku),
                ...(queryID && { queryID }),
            });

            const filters = window.sessionStorage.getItem(FILTERS_KEY);

            if (!filters) {
                return;
            }

            this.sendEvent('convertedFilters', {
                eventName: `Filters Converted: ${eventName}`,
                filters: JSON.parse(filters),
            });
        };
    }

    protected addToCartHandler(data: ProductEventData): void {
        const { searchId: globalQueryID, currency, products = [], page } = data;
        const name = globalQueryID ? 'addedToCartObjectIDsAfterSearch' : 'addedToCartObjectIDs';
        const eventData = {
            eventName: this.normalizeEventName('Added to Cart', page),
            objectIDs: [],
            currency,
            ...(globalQueryID && { queryID: globalQueryID }),
            objectData: [],
        };
        let value = 0;
        let isValueComplete = true;

        for (const product of this.normalizeProducts(products)) {
            const { sku, price, quantity, searchId } = product;
            const queryID = searchId === undefined ? globalQueryID : searchId;

            if (queryID) {
                const queries = { ...this.searchQueries };
                queries[sku] = queryID;
                sessionStorage.setItem(SEARCH_QUERY_ID_KEY, JSON.stringify(queries));
                eventData.queryID = queryID;
            }

            // Null for a customer who may not see prices; the Insights API rejects it.
            const isPriceMissing = price === undefined || price === null;

            eventData.objectData.push({ quantity, ...(!isPriceMissing && { price }) });
            eventData.objectIDs.push(sku);

            if (isPriceMissing) {
                isValueComplete = false;

                continue;
            }

            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            value = parseFloat((value + price * quantity).toFixed(2));
        }

        // A value without every price would understate the revenue.
        this.sendEvent(name, { ...eventData, ...(isValueComplete && { value }) });
    }

    // The async cart reports an add to cart as a change; the added lines are the increased ones.
    protected cartItemsChangeHandler(data: CartItemsChangeData): void {
        const increased = data.eventDetail?.increased ?? [];

        if (!increased.length) {
            return;
        }

        this.addToCartHandler({ ...data, products: increased });
    }

    protected purchaseHandler(data: OrderSuccessData): void {
        if (data.page !== 'CHECKOUT_SUCCESS' || !data.products.length) {
            return;
        }

        let withSearchQuery = false;
        const { products, currency, total: value } = data;
        const eventData = {
            eventName: 'Purchased',
            objectIDs: [],
            objectData: [],
            currency,
            value: this.normalizePrice(value),
        };
        const queries = this.searchQueries;

        for (const product of this.normalizeProducts(products)) {
            const { sku, price, quantity } = product;
            const queryID = queries[sku];

            if (queryID && !withSearchQuery) {
                withSearchQuery = true;
            }

            eventData.objectData.push({
                quantity,
                price,
                ...(queryID && { queryID }),
            });
            eventData.objectIDs.push(sku);
        }

        const name = withSearchQuery ? 'purchasedObjectIDsAfterSearch' : 'purchasedObjectIDs';

        this.sendEvent(name, eventData);
        sessionStorage.removeItem(SEARCH_QUERY_ID_KEY);
    }

    protected sendEvent(name: keyof InsightsMethodMap, data: Record<string, unknown>): void {
        this.callInsightsClient(name, {
            index: this.initialData.indexName,
            ...data,
        });
    }

    // Once the library has loaded; activate() starts the load before the orchestrator hands over any event.
    protected callInsightsClient(method: keyof InsightsMethodMap, payload: Record<string, unknown>): void {
        this.insightsClientLoad?.then((insightsClient) => {
            try {
                insightsClient?.(method, payload);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error(`TraceableEvents: ${this.name} - ${method} failed: ${error}`);
            }
        });
    }

    protected getFilters(_filters: Filter[]): string[] {
        const filtersMapper = this.filtersMapper;
        const filters: string[] = [];

        for (const filter of _filters) {
            const mappedKey = filtersMapper[filter.name];

            if (mappedKey === '') {
                continue;
            }

            const key = (mappedKey ?? filter.name).replace('[]', '');
            const data = Array.isArray(filter.value)
                ? filter.value.map((value) => `${key}:${value}`)
                : [`${key}:${filter.value}`];

            filters.push(...data);
        }

        return filters.slice(0, this.algoliaLimitFilters);
    }

    protected normalizeProducts(products: ProductDetails[]): ProductDetails[] {
        const _products: ProductDetails[] = [];
        const mapper: Record<string, number> = {};

        for (const product of products) {
            if (!product?.sku) {
                continue;
            }

            product.sku = String(product.sku);
            product.quantity = Number(product.quantity ?? 1);

            const { sku, price, quantity } = product;

            if (_products.length >= this.algoliaLimitProducts) {
                break;
            }

            if (mapper[sku] === undefined) {
                mapper[sku] = _products.length;
                product.price = this.normalizePrice(price);
                _products.push(product);

                continue;
            }

            const index = mapper[sku];
            _products[index].quantity += quantity;
        }

        return _products;
    }

    protected normalizePrice(price?: unknown): number {
        if (typeof price !== 'number') {
            return undefined;
        }

        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        return Number.isInteger(price) ? price / 100 : price;
    }

    protected normalizeEventName(eventName: string, page = ''): string {
        return page ? `${page.replaceAll('_', ' ')}: ${eventName}` : eventName;
    }

    protected get searchQueries(): Record<string, string> {
        return JSON.parse(sessionStorage.getItem(SEARCH_QUERY_ID_KEY) ?? '{}');
    }

    protected get initialData(): InitialData {
        return JSON.parse(this.getAttribute('initial'));
    }

    protected get filtersMapper(): Record<string, string> {
        return JSON.parse(this.getAttribute('filters-mapper'));
    }
}
