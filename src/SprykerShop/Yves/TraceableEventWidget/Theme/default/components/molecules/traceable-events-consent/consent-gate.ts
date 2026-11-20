import type TraceableEventsConsent from './traceable-events-consent';

// The tag of the consent component, a custom element; also set as `consent-selector` in traceable-events-orchestrator.twig.
export const DEFAULT_CONSENT_SELECTOR = 'traceable-events-consent';

// Dispatched on the document when consent may have changed. Kept out of the consent component,
// so the orchestrator chunk does not pull the component in.
export const CONSENT_CHANGE_EVENT = 'traceable-events-consent-change';

// Required consent fails closed: without a consent component, or before it is defined, nothing is granted.
export const withConsent = (
    consent: TraceableEventsConsent | null,
    isConsentRequired: boolean,
    isGranted: (definedConsent: TraceableEventsConsent) => boolean,
): boolean => {
    if (!isConsentRequired) {
        return true;
    }

    const isConsentDefined = typeof consent?.isEventAllowed === 'function';

    return isConsentDefined && isGranted(consent);
};
