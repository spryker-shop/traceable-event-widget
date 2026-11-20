/* eslint-disable max-lines */
import Component from 'ShopUi/models/component';
import { BaseTraceableEventAdapter } from './base-traceable-event-adapter';
import { CONSENT_CHANGE_EVENT, DEFAULT_CONSENT_SELECTOR, withConsent } from '../traceable-events-consent/consent-gate';
import type { ConsentPurpose } from '../traceable-events-consent/consent-purposes';
import type TraceableEventsConsent from '../traceable-events-consent/traceable-events-consent';
import {
    ProductTrackingDetails,
    expandWithProductTrackingDetails,
    readProductTrackingDetails,
} from './product-tracking-details';

declare global {
    interface SPRYKER_EVENTS {
        PRODUCT_CLICK: undefined;
        FILTER_CLICK: undefined;
        PAGE_LOAD: undefined;
        ADD_TO_CART: undefined;
        REMOVE_FROM_CART: undefined;
        CHANGE_CART_QUANTITY: undefined;
        CART_ITEMS_CHANGE: undefined;
        ITEM_LIST_VIEW: undefined;
        CHECKOUT_START: undefined;
        SHIPMENT_SUBMIT: undefined;
        PAYMENT_SUBMIT: undefined;
        ADD_TO_WISHLIST: undefined;
        ADD_TO_SHOPPING_LIST: undefined;
    }

    interface EventPages {
        CATALOG: undefined;
        CART: undefined;
        HOME: undefined;
        PDP: undefined;
        QUICK_ORDER: undefined;
        CHECKOUT: undefined;
        CHECKOUT_SUCCESS: undefined;
    }

    interface GlobalEventsData {
        page?: keyof EventPages;
    }
}

export type EventName = keyof SPRYKER_EVENTS;

export interface EventTriggerData {
    attribute?: string;
    flatten?: boolean;
    selector?: string | 'self';
    value: unknown;
    multi?: boolean;
    // Looks the selector up among the ancestors of the trigger element instead of its descendants.
    closest?: boolean;
    composed: Record<string, EventTriggerData | EventTriggerData[]>;
}

export type EventTriggerDataDetails = Record<string, EventTriggerData | EventTriggerData[]>;

export interface EventTriggerDataGroupAs {
    key: string;
    toArray?: boolean;
}

export interface EventTrigger {
    selector: string;
    data: EventTriggerDataDetails;
    groupAs?: EventTriggerDataGroupAs;
}

export interface EventData<T extends EventName> {
    event: T;
    name: string;
    triggers?: EventTrigger[];
    // False hands every matching DOM event over, for events that each carry their own data, e.g. one cart change each.
    // Otherwise a matching DOM event that follows the previous one of the same event within the delay is dropped, e.g. a double click.
    debounce?: boolean;
}

export interface TraceableEvents {
    list: EventData<EventName>[];
    data: GlobalEventsData;
}

export interface EventsHandlerData<T extends EventName> extends Pick<EventData<T>, 'event'>, GlobalEventsData {
    [key: string]: unknown;
}

export type TraceableEventHandler = (data: EventsHandlerData<EventName>) => Promise<void> | void;

interface ValueDetails {
    composed?: EventTriggerDataDetails;
    value?: unknown;
    attribute: string;
    isElementAttribute?: boolean;
}

export default class TraceableEventsOrchestrator extends Component {
    protected groupedEvents: Partial<Record<string, EventData<EventName>[]>> = {};
    protected adapters: BaseTraceableEventAdapter[] = [];
    protected traceableEvents: TraceableEvents;
    protected initialHandlers = 0;
    protected debounceDelay = 300;
    // The time of the last DOM event of each event, per matched trigger element.
    protected lastDomEventTimes = new WeakMap<Element, Partial<Record<string, number>>>();
    protected controller = new AbortController();
    // The page's product tracking details, read once when an event is handled and used for all products of its data.
    protected productTrackingDetails: ProductTrackingDetails = {};
    protected activatedAdapters = new Set<BaseTraceableEventAdapter>();
    protected pageLoadHandledAdapters = new Set<BaseTraceableEventAdapter>();
    protected isPageLoadDispatched = false;
    // Looked up once: the consent component is rendered with the page. Undefined until then.
    protected consent: TraceableEventsConsent | null | undefined;

    constructor() {
        super();

        this.initialHandlers = document.querySelectorAll(this.adapterSelector).length;
        this.traceableEvents = JSON.parse(this.events);
        this.groupedEvents = Object.groupBy(this.traceableEvents.list, ({ name }) => name);

        // Listened to from the start, as a CMP may report the stored consent before this component's init().
        document.addEventListener(CONSENT_CHANGE_EVENT, () => this.consentChangeHandler(), {
            signal: this.controller.signal,
        });
    }

    protected init(): void {
        Object.keys(this.groupedEvents).forEach((name) => {
            document.addEventListener(name, (event: Event) => this.eventHandler(event), {
                signal: this.controller.signal,
            });
        });
    }

    disconnectedCallback() {
        this.controller.abort();
    }

    addAdapter(adapter: BaseTraceableEventAdapter): void {
        if (this.adapters.includes(adapter) || this.initialHandlers < this.adapters.length) {
            return;
        }

        this.adapters.push(adapter);

        if (this.initialHandlers === this.adapters.length) {
            this.isPageLoadDispatched = true;
            this.activateAllowedAdapters();
            this.eventHandler();
        }
    }

    // Stops the adapters consent no longer allows, starts those it allows now and reports the page load to them once.
    // Earlier actions are not replayed. A change before every adapter registered is read by the first activation.
    protected consentChangeHandler(): void {
        if (!this.isPageLoadDispatched) {
            return;
        }

        this.deactivateWithdrawnAdapters();
        this.activateAllowedAdapters();

        const adaptersWithoutPageLoad = [...this.activatedAdapters].filter(
            (adapter) => !this.pageLoadHandledAdapters.has(adapter),
        );

        if (adaptersWithoutPageLoad.length) {
            this.handleEvent(undefined, adaptersWithoutPageLoad);
        }
    }

    // E.g. a statistics and marketing tool starts with marketing consent only.
    protected activateAllowedAdapters(): void {
        for (const adapter of this.adapters) {
            const isAdapterToActivate = !this.activatedAdapters.has(adapter) && this.isAdapterAllowed(adapter);

            if (!isAdapterToActivate) {
                continue;
            }

            this.activatedAdapters.add(adapter);

            try {
                adapter.activate();
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error(`TraceableEvents: activate ${adapter.name} - ${error}`);
            }
        }
    }

    // Once none of its purposes is granted; activate() starts it again on a new grant.
    protected deactivateWithdrawnAdapters(): void {
        for (const adapter of [...this.activatedAdapters]) {
            if (this.isAdapterAllowed(adapter)) {
                continue;
            }

            this.activatedAdapters.delete(adapter);

            try {
                adapter.deactivate();
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error(`TraceableEvents: deactivate ${adapter.name} - ${error}`);
            }
        }
    }

    protected isAdapterAllowed(adapter: BaseTraceableEventAdapter): boolean {
        return adapter.consentPurposes.some((purpose) => this.isPurposeGranted(purpose));
    }

    protected isPurposeGranted(purpose: ConsentPurpose): boolean {
        return withConsent(this.findConsent(), this.isConsentRequired, (consent) => consent.isPurposeGranted(purpose));
    }

    // The orchestrator's event names, e.g. ADD_TO_CART, or an adapter's provider event names, e.g. GA4's purchase.
    isEventAllowed(adapterName: string, eventName: string, purposes: ConsentPurpose[]): boolean {
        return withConsent(this.findConsent(), this.isConsentRequired, (consent) =>
            consent.isEventAllowed(adapterName, eventName, purposes),
        );
    }

    protected findConsent(): TraceableEventsConsent | null {
        // Compared with undefined, not `??=`: a page without the component keeps null and is not searched again.
        if (this.consent === undefined) {
            this.consent = document.querySelector<TraceableEventsConsent>(this.consentSelector);
        }

        return this.consent;
    }

    protected getAllowedAdapters(
        eventName: EventName,
        adapters: BaseTraceableEventAdapter[],
    ): BaseTraceableEventAdapter[] {
        return adapters.filter(
            (adapter) =>
                this.activatedAdapters.has(adapter) &&
                this.isEventAllowed(adapter.name, eventName, adapter.getEventConsentPurposes(eventName)),
        );
    }

    removeAdapter(adapter: BaseTraceableEventAdapter): void {
        this.adapters = this.adapters.filter((item) => item !== adapter);
        this.activatedAdapters.delete(adapter);
        this.pageLoadHandledAdapters.delete(adapter);
    }

    protected async eventHandler(event?: Event | CustomEvent): Promise<void> {
        await this.handleEvent(event, this.adapters);
    }

    // Kept apart from eventHandler(), so a project override of it cannot drop the adapters a page load is for.
    protected async handleEvent(
        event: Event | CustomEvent | undefined,
        adapters: BaseTraceableEventAdapter[],
    ): Promise<void> {
        const eventsData = this.groupedEvents[event ? event.type : 'load'];

        // An event name without configured events has nothing to handle, also in debug mode.
        if (!eventsData) {
            return;
        }

        if (!this.adapters.length && !this.debug) {
            return;
        }

        // A submit event targets the form, which cannot tell the form's submit buttons apart; the submitter can.
        const target = ((event as SubmitEvent)?.submitter ?? event?.target) as HTMLElement;
        let eventData: EventData<EventName>;
        let trigger: EventTrigger;
        let container: HTMLElement;

        for (const _eventData of eventsData) {
            trigger = _eventData.triggers?.find((_trigger) => {
                // An event dispatched on the document, e.g. by another component, has no element to match the selector.
                container = target instanceof Element ? target.closest<HTMLElement>(_trigger.selector) : null;

                return container;
            });

            const noEvent =
                !trigger && (Boolean(event) || _eventData.triggers) && !(event instanceof CustomEvent && event.detail);

            if (noEvent) {
                continue;
            }

            eventData = _eventData;

            break;
        }

        if (!eventData || (event && this.isDebounced(eventData, container ?? null))) {
            return;
        }

        // Debug mode logs the event even without an allowed adapter.
        const allowedAdapters = this.getAllowedAdapters(eventData.event, adapters);

        if (!allowedAdapters.length && !this.debug) {
            return;
        }

        this.productTrackingDetails = readProductTrackingDetails();

        const initialData = {
            event: eventData.event,
            ...this.getGlobalData(),
            eventDetail: event instanceof CustomEvent ? event.detail : undefined,
        };
        const dynamicData = this.generateDynamicData(container, trigger?.data);
        const data = { ...initialData, ...this.transformData(dynamicData, trigger?.groupAs) };

        if (this.debug) {
            /* eslint-disable no-console */
            console.group('TraceableEvents: eventHandler');
            console.info('Event Data:', eventData);
            console.info('Trigger Data:', trigger);
            console.info('Adapter Data:', data);
            console.groupEnd();
            /* eslint-enable no-console */
        }

        // The page load is the call without an event, whichever event name the project configured for it.
        if (!event) {
            allowedAdapters.forEach((adapter) => this.pageLoadHandledAdapters.add(adapter));
        }

        // The navigation is never held: each adapter delivers in a way that outlives the page, e.g. a beacon request.

        try {
            await Promise.all(allowedAdapters.map((adapter) => adapter.eventsHandler(data)));
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`TraceableEvents: eventHandler - ${error}`);
        }
    }

    // Decided per matched event and per matched trigger element: a double click on one element is dropped, while clicks on two elements,
    // e.g. the remove buttons of two cart lines, both count. An event that sets `debounce: false` is never dropped.
    // Leading edge, like a debounce: the first DOM event is handed over, and each following one within the delay restarts the wait.
    protected isDebounced(eventData: EventData<EventName>, container: Element | null): boolean {
        if (eventData.debounce === false) {
            return false;
        }

        // An event without a trigger element, e.g. one another component dispatches, is debounced for the whole page.
        const debouncedElement = container ?? document.documentElement;
        const key = `${eventData.name}:${eventData.event}`;
        const lastDomEventTimes = this.lastDomEventTimes.get(debouncedElement) ?? {};
        const lastDomEventTime = lastDomEventTimes[key];
        const now = Date.now();

        this.lastDomEventTimes.set(debouncedElement, { ...lastDomEventTimes, [key]: now });

        return lastDomEventTime !== undefined && now - lastDomEventTime < this.debounceDelay;
    }

    // A page passes its own products in the global data, e.g. the product detail page; they get the details of the product tracking details widget as well.
    protected getGlobalData(): GlobalEventsData {
        const globalData: GlobalEventsData = { ...this.traceableEvents.data };

        for (const [key, value] of Object.entries(globalData)) {
            Object.assign(globalData, { [key]: expandWithProductTrackingDetails(value, this.productTrackingDetails) });
        }

        return globalData;
    }

    protected generateDynamicData(container: HTMLElement, data: EventTriggerDataDetails = {}): Record<string, unknown> {
        return Object.entries(data).reduce((acc, [key, _item]) => {
            const items = Array.isArray(_item) ? _item : [_item];

            for (const item of items) {
                const {
                    value: predefinedValue,
                    selector: itemSelector,
                    attribute: attributeName,
                    flatten,
                    composed,
                } = item;
                const attribute = attributeName ?? key;
                const isSelfAttribute = itemSelector === 'self';
                const element = this.findDataElement(container, item);

                if (!element && predefinedValue === undefined) {
                    continue;
                }

                if (this.debug && element) {
                    /* eslint-disable no-console */
                    console.group('TraceableEvents: generateDynamicData');
                    console.info(`element by ${itemSelector} selector`, element);
                    console.info('element was found from container', container);
                    console.groupEnd();
                    /* eslint-enable no-console */
                }

                const isElementAttribute = Boolean(isSelfAttribute || attributeName);
                const details = { value: predefinedValue, attribute, isElementAttribute, composed };
                const data = Array.isArray(element)
                    ? element.map((el) => this.getData(this.getValue(el, details)))
                    : this.getData(this.getValue(element, details));
                const shouldFlat = flatten && typeof data === 'object' && data !== null;

                return shouldFlat ? { ...acc, ...data } : { ...acc, [key]: data };
            }

            // Nothing found for this key: keep what the other keys collected.
            return acc;
        }, {});
    }

    protected findDataElement(container: HTMLElement, item: EventTriggerData): HTMLElement | HTMLElement[] | null {
        const { selector: itemSelector, multi, closest } = item;

        if (itemSelector === 'self') {
            return container;
        }

        if (closest) {
            return container.closest<HTMLElement>(itemSelector);
        }

        if (multi) {
            return Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
        }

        return container.querySelector<HTMLElement>(itemSelector);
    }

    protected getValue(element: HTMLElement, details: ValueDetails): unknown {
        const { composed, value, isElementAttribute, attribute } = details;

        if (composed) {
            return this.generateDynamicData(element, composed);
        }

        if (value !== undefined) {
            return value;
        }

        if (isElementAttribute) {
            return element[attribute] ?? element.getAttribute(attribute);
        }

        return element.textContent;
    }

    protected getData(value: unknown): unknown {
        const data = typeof value === 'string' ? this.parseString(value) : value;

        return expandWithProductTrackingDetails(data, this.productTrackingDetails);
    }

    protected transformData(
        data: Record<string, unknown>,
        transform?: EventTriggerDataGroupAs,
    ): Record<string, unknown> {
        if (!transform) {
            return data;
        }

        return { [transform.key]: transform.toArray ? [data] : data };
    }

    protected parseString(value: string): unknown {
        value = value.trim();

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    protected get events(): string {
        return this.getAttribute('events');
    }

    protected get adapterSelector(): string {
        return this.getAttribute('adapter-selector');
    }

    // A project template without the attribute still finds the default consent component.
    protected get consentSelector(): string {
        return this.getAttribute('consent-selector') ?? DEFAULT_CONSENT_SELECTOR;
    }

    // Required unless switched off: a project template without the attribute requires consent.
    protected get isConsentRequired(): boolean {
        return this.getAttribute('consent-required') !== 'false';
    }

    protected get debug(): boolean {
        return this.hasAttribute('debug');
    }
}
