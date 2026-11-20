import Component from 'ShopUi/models/component';
import { CONSENT_PURPOSE_STATISTICS, ConsentPurpose } from '../traceable-events-consent/consent-purposes';
import TraceableEventsOrchestrator, {
    EventName,
    EventsHandlerData,
    TraceableEventHandler,
} from './traceable-events-orchestrator';

export type TraceableEventHandlers = Partial<Record<EventName, TraceableEventHandler[]>>;

export class BaseTraceableEventAdapter extends Component {
    protected orchestratorSelector: string;
    protected orchestrator: TraceableEventsOrchestrator | null = null;

    protected init(): void {
        this.addAdapter();
    }

    protected getHandlers(): Partial<TraceableEventHandlers> {
        throw new Error('BaseTraceableEventAdapter: getHandlers - Method is not implemented.');
    }

    // Called once any of the adapter's purposes is granted, and again after a withdrawal and a new grant.
    // An adapter loads or sets up its provider here, so nothing reaches the provider before.
    activate(): void {}

    // Called once every purpose of the adapter is withdrawn; no event reaches it from then on.
    // An adapter whose provider sends on its own, e.g. a page view on a history change, stops it here.
    deactivate(): void {}

    // The adapter starts once any of these is granted.
    get consentPurposes(): ConsentPurpose[] {
        return [CONSENT_PURPOSE_STATISTICS];
    }

    // All of these must be granted for the adapter to receive the event.
    getEventConsentPurposes(_eventName: EventName): ConsentPurpose[] {
        return this.consentPurposes;
    }

    // For an event sent under the provider's name, e.g. GA4's purchase, which a project may group differently.
    protected isProviderEventAllowed(providerEventName: string, purposes: ConsentPurpose[]): boolean {
        return this.orchestrator?.isEventAllowed(this.name, providerEventName, purposes) ?? false;
    }

    addAdapter(orchestratorSelector = '.js-traceable-events-orchestrator'): void {
        this.orchestratorSelector = orchestratorSelector;
        this.orchestrator = document.querySelector<TraceableEventsOrchestrator>(orchestratorSelector);
        this.orchestrator?.addAdapter(this);
    }

    async eventsHandler(data: EventsHandlerData<EventName>): Promise<void> {
        const handlers = this.getHandlers()[data.event];

        if (!handlers) {
            return;
        }

        await Promise.all(handlers.map((handler) => handler.apply(this, [data])));
    }

    disconnectedCallback() {
        this.orchestrator?.removeAdapter(this);
    }
}
