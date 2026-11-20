export interface CardProductIdentity {
    sku: string;
    abstractSku?: unknown;
    concreteSku?: unknown;
}

// The product a card shows, as the traceable events tell products apart: a card of a concrete product by its concrete SKU, a card
// of an abstract product by its abstract SKU. The card's own SKU is not enough, as an abstract product card may carry the SKU of
// one of its concrete products, e.g. among the alternatives of a discontinued product, next to a card of that concrete product.
export function getCardProductKey(product: CardProductIdentity): string {
    if (product.concreteSku) {
        return String(product.concreteSku);
    }

    return `abstract:${String(product.abstractSku || product.sku)}`;
}
