import Component from 'ShopUi/models/component';
import { CONSENT_CHANGE_EVENT } from './consent-gate';
import {
    CONSENT_PURPOSE_MARKETING,
    CONSENT_PURPOSE_PREFERENCES,
    CONSENT_PURPOSE_STATISTICS,
    ConsentPurpose,
} from './consent-purposes';

const CONSENT_COOKIE_CATEGORY_SEPARATOR = ',';

const DEFAULT_CATEGORIES_BY_PURPOSE: Readonly<Record<string, string>> = {
    [CONSENT_PURPOSE_STATISTICS]: 'statistics',
    [CONSENT_PURPOSE_MARKETING]: 'marketing',
    [CONSENT_PURPOSE_PREFERENCES]: 'preferences',
};

/*
 * Relates tracking to the project's consent management platform (CMP); see the README of the orchestrator.
 * Reads the granted categories from a cookie by default. A project that reads its CMP directly overrides
 * `categoriesByPurpose`, `isCategoryGranted()` and `init()`; `getEventPurposes()` groups single events differently.
 */
export default class TraceableEventsConsent extends Component {
    // Parsed again whenever the cookie string changes, so a CMP that does not report a change is still read.
    protected parsedCookieString: string | null = null;
    protected parsedConsentCookieCategories: string[] = [];

    // A consent stored before this component was defined is reported now, in case the orchestrator asked too early.
    protected init(): void {
        this.notifyConsentChange();
    }

    isPurposeGranted(purpose: ConsentPurpose): boolean {
        const category = this.categoriesByPurpose[purpose];

        return Boolean(category) && this.isCategoryGranted(category);
    }

    // Every purpose the event serves must be granted.
    isEventAllowed(adapterName: string, eventName: string, defaultPurposes: ConsentPurpose[]): boolean {
        return this.getEventPurposes(adapterName, eventName, defaultPurposes).every((purpose) =>
            this.isPurposeGranted(purpose),
        );
    }

    // A purpose added here restricts the event; the adapter still starts by its own purposes.
    protected getEventPurposes(
        _adapterName: string,
        _eventName: string,
        defaultPurposes: ConsentPurpose[],
    ): ConsentPurpose[] {
        return defaultPurposes;
    }

    protected notifyConsentChange(): void {
        document.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
    }

    protected isCategoryGranted(category: string): boolean {
        return this.consentCookieCategories.includes(category);
    }

    // A purpose without a category is never granted.
    protected get categoriesByPurpose(): Readonly<Record<string, string>> {
        return DEFAULT_CATEGORIES_BY_PURPOSE;
    }

    protected get consentCookieCategories(): string[] {
        const cookieString = document.cookie;

        if (cookieString !== this.parsedCookieString) {
            this.parsedCookieString = cookieString;
            this.parsedConsentCookieCategories = this.parseConsentCookieCategories(cookieString);
        }

        return this.parsedConsentCookieCategories;
    }

    // E.g. `trackingConsent=statistics,marketing`; no cookie grants nothing.
    protected parseConsentCookieCategories(cookieString: string): string[] {
        const consentCookie = cookieString
            .split('; ')
            .find((cookie) => cookie.startsWith(`${this.consentCookieName}=`));

        if (!consentCookie) {
            return [];
        }

        const consentCookieValue = this.decodeConsentCookieValue(
            consentCookie.slice(this.consentCookieName.length + 1),
        );

        if (consentCookieValue === null) {
            return [];
        }

        return consentCookieValue.split(CONSENT_COOKIE_CATEGORY_SEPARATOR).map((category) => category.trim());
    }

    // A value that is no valid URI encoding, e.g. `%E0` set by another script of the domain, grants nothing; thrown,
    // it would stop the page load and every later event of the page.
    protected decodeConsentCookieValue(encodedValue: string): string | null {
        try {
            return decodeURIComponent(encodedValue);
        } catch {
            return null;
        }
    }

    protected get consentCookieName(): string {
        return this.getAttribute('consent-cookie-name');
    }
}
