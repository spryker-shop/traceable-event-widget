// Filled by the product tracking details widget: one element per product list, its value maps a product SKU to the product's details.
const PRODUCT_TRACKING_DETAILS_SELECTOR = '[data-product-tracking-details]';
const PRODUCT_TRACKING_DETAILS_ATTRIBUTE = 'data-product-tracking-details';

type ProductData = Record<string, unknown> & { sku?: unknown; abstractSku?: unknown };
export type ProductTrackingDetails = Record<string, Record<string, unknown>>;

const isProductData = (data: unknown): data is ProductData =>
    typeof data === 'object' && data !== null && !Array.isArray(data) && 'sku' in data;

const isEmptyValue = (value: unknown): boolean =>
    value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

interface ParsedProductTrackingDetails {
    value: string | null;
    details: ProductTrackingDetails;
}

// Parsed once per element and value: an element re-rendered or changed by an ajax update is parsed again.
const parsedProductTrackingDetailsByElement = new WeakMap<Element, ParsedProductTrackingDetails>();

const parseProductTrackingDetails = (value: string | null): ProductTrackingDetails => {
    try {
        const details: unknown = JSON.parse(value);

        return typeof details === 'object' && details !== null ? (details as ProductTrackingDetails) : {};
    } catch {
        // An element with details that are no JSON adds none.
        return {};
    }
};

const readElementProductTrackingDetails = (element: Element): ProductTrackingDetails => {
    const value = element.getAttribute(PRODUCT_TRACKING_DETAILS_ATTRIBUTE);
    const parsed = parsedProductTrackingDetailsByElement.get(element);

    if (parsed?.value === value) {
        return parsed.details;
    }

    const details = parseProductTrackingDetails(value);
    parsedProductTrackingDetailsByElement.set(element, { value, details });

    return details;
};

// The details of all product lists on the page, merged into one map. Read once per event: the cart page renders its lines
// again after each cart change, so the details can change between events.
export const readProductTrackingDetails = (): ProductTrackingDetails => {
    const productTrackingDetails: ProductTrackingDetails = {};
    const elements = document.querySelectorAll<HTMLElement>(PRODUCT_TRACKING_DETAILS_SELECTOR);

    for (const element of Array.from(elements)) {
        Object.assign(productTrackingDetails, readElementProductTrackingDetails(element));
    }

    return productTrackingDetails;
};

const findDetailsBySku = (
    sku: unknown,
    productTrackingDetails: ProductTrackingDetails,
): Record<string, unknown> | undefined => (typeof sku === 'string' ? productTrackingDetails[sku] : undefined);

// The details of the concrete product SKU win over the ones of its abstract product SKU.
const findProductTrackingDetails = (
    productData: ProductData,
    productTrackingDetails: ProductTrackingDetails,
): Record<string, unknown> | undefined =>
    findDetailsBySku(productData.sku, productTrackingDetails) ??
    findDetailsBySku(productData.abstractSku, productTrackingDetails);

// Adds the details the product lists read in bulk to the tracking details of one product; a value the element sets itself is kept.
export const expandWithProductTrackingDetails = (
    data: unknown,
    productTrackingDetails: ProductTrackingDetails,
): unknown => {
    if (Array.isArray(data)) {
        return data.map((item) => expandWithProductTrackingDetails(item, productTrackingDetails));
    }

    if (!isProductData(data)) {
        return data;
    }

    const details = findProductTrackingDetails(data, productTrackingDetails);

    if (!details) {
        return data;
    }

    const expandedData: ProductData = { ...data };

    for (const [key, value] of Object.entries(details)) {
        if (isEmptyValue(expandedData[key]) && !isEmptyValue(value)) {
            expandedData[key] = value;
        }
    }

    return expandedData;
};
