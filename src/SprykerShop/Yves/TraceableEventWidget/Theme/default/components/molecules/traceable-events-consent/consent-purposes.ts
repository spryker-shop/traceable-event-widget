// Adapters declare which purposes their events serve; the consent component maps each to a CMP category.
export const CONSENT_PURPOSE_STATISTICS = 'statistics';
export const CONSENT_PURPOSE_MARKETING = 'marketing';
export const CONSENT_PURPOSE_PREFERENCES = 'preferences';

// Open to the purposes a project adds, e.g. `conversion`, while keeping the Spryker ones suggested.
export type ConsentPurpose =
    | typeof CONSENT_PURPOSE_STATISTICS
    | typeof CONSENT_PURPOSE_MARKETING
    | typeof CONSENT_PURPOSE_PREFERENCES
    | (string & Record<never, never>);
