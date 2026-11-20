# TraceableEventWidget Module

[![Latest Stable Version](https://poser.pugx.org/spryker-shop/traceable-event-widget/v/stable.svg)](https://packagist.org/packages/spryker-shop/traceable-event-widget)
[![Minimum PHP Version](https://img.shields.io/badge/php-%3E%3D%208.3-8892BF.svg)](https://php.net/)

The TraceableEventWidget module provides a structured solution for capturing and managing specified user interactions within a web application. It enables the configuration of event triggers and modular adapters to support precise tracking and integration with analytics platforms, enhancing insights and interaction analysis.

## Installation

```
composer require spryker-shop/traceable-event-widget
```

## Documentation

[Spryker Documentation](https://docs.spryker.com)

## Product tracking data

The traceable events read the products from the page markup. A project that overrides one of the templates below keeps tracking only when its markup still has the element, the attribute and the class or form name the events select.

Every tracked element holds one product as JSON in an attribute: `sku`, `abstractSku`, `name`, `abstractName`, `brand`, `variant` (the values of the attributes the concrete products of the abstract product differ in, e.g. `["Red", "64 GB"]`), `categories` (the category path, top level first, as `{ name }` objects), `price` in cents (`null` when the visitor may not see prices) and, where the element has one, `quantity` and `groupKey`. Build the attribute value with the ShopUi `tracking-details` model, which outputs nothing while the storefront does not track user actions and applies the price permission. Include it with `ignore missing`, so the template still renders with a ShopUi version that does not have the model; the element then has no tracking details:

```twig
{% set trackingDetails %}{% include model('tracking-details') ignore missing with { product: {
    sku: item.sku,
    abstractSku: item.abstractSku,
    name: item.name,
    abstractName: item.abstractName,
    price: item.unitPrice,
    quantity: item.quantity,
} } only %}{% endset %}
<tr{% if trackingDetails %} tracking-details="{{ trackingDetails }}"{% endif %}>
```

| Template | Element the events read | Triggers |
|---|---|---|
| ShopUi `product-item` | the card with the `details` attribute | `form[name^="addToCartForm_"]`, the quick add button |
| CartPage `product-cart-item` | `.js-product-cart-item[tracking-details]` | `form[name^="removeFromCartForm_"]`, `form[name^="cartChangeQuantityForm_"]` |
| ConfigurableBundleWidget `configured-bundle` | `.js-configured-bundle [tracking-details]` | `form[action*="/cart/configured-bundle/remove/"]` |
| CartPage `page-layout-cart` | all cart lines above | `form[data-qa="multi-cart-clear-form"]`, `.js-product-quick-add-form__form`, `[data-create-shopping-list-from-cart-submitter]` |
| WishlistPage `wishlist-detail-table` | `tr[tracking-details]` inside `.js-wishlist-detail` | `.js-wishlist-move-to-cart` in the row, `.js-wishlist-move-all-to-cart` |
| ShoppingListPage `shopping-list` | `tr[tracking-details]` with `input[name^="shoppingListItem[quantity]"]` | a form submitted from the row, `form[action*="shopping-list/add-to-cart"]` with the checked rows, `button[name="add-all-available"]` with every row |
| CustomerPage `order-detail-table` | `.order-detail-table__item[tracking-details]` | `.js-cart-reorder-form__trigger` with the checked `.js-cart-reorder-form__selection` items, `.js-cart-reorder-all` |
| QuickOrderPage `quick-order-row-partial` | `.quick-order-row` holding `[tracking-details]` and `.js-formatted-number-input__hidden-input` | the clicked `[name="addToCart"]`, `[name="createOrder"]` or `[name="addToShoppingList"]` button |
| ProductAlternativeWidget `wishlist-product-alternative` | `tr[tracking-alternative-details]` | `.js-product-alternative-add-to-wishlist` in the row |

A product reports its abstract SKU and name, brand, variant and category path from one of these sources:
- Product views: `ProductStorageClient::expandProductViewTransfersWithProductAbstract()` sets `abstractSku`, `abstractName`, `brand` and `selectedVariantAttributes` (the super attributes of the concrete product, key to value), and `ProductCategoryStorageClient::expandProductViewTransfersWithCategoryPath()` sets `categoryPath`; each reads storage once for all given product views.
  `ProductStorageClient::mapProductStorageData()` sets `abstractSku` and `abstractName` of a product view built from abstract product data, and `brand` and `selectedVariantAttributes` of every product view, so the product detail page reads no more product data. `ProductStorageClient::getProductAbstractViewTransfers()` and `getProductConcreteViewTransfers()` run the abstract product expansion themselves; the wishlist, the shopping list and quick order call the product storage client for their rows. A list that needs the category path as well renders `ProductTrackingDetailsWidget`.
- Cart and quote request items: when the item is added to the cart, ProductCartConnector's `ProductCartPlugin` sets `abstractName`, `brand` and `selectedVariantAttributes` (the super attributes, key to value), and ProductCategory's `CategoryPathItemExpanderPlugin` sets `categoryPath`, so they are stored on the quote; the templates report the values of `selectedVariantAttributes` as the variant. Register `CategoryPathItemExpanderPlugin` in the project's `CartDependencyProvider` after `ProductCartPlugin`.
- Order items: SalesProductConnector's `ProductIdOrderItemExpanderPlugin` sets `idProductAbstract` and `abstractSku`, and its `SelectedVariantAttributesOrderItemExpanderPlugin` sets `selectedVariantAttributes` from the order item's metadata super attributes; register both in the project's `SalesDependencyProvider`.
- Any other list: `ProductTrackingDetailsWidget` of this module. A list template renders it once with the products of the list, e.g. `{% widget 'ProductTrackingDetailsWidget' args [data.products] only %}{% endwidget %}`. It accepts product views, cart or order items and search result products (`id_product_abstract`, `abstract_sku`), reads their abstract product data and category paths with two storage requests, through `ProductStorageClient::expandProductViewTransfersWithProductAbstract()` and `ProductCategoryStorageClient::expandProductViewTransfersWithCategoryPath()`, and renders them in one hidden `[data-product-tracking-details]` element, keyed by the concrete product SKU, or by the abstract product SKU for a search result. While the visitor has turned the tracking off, it reads nothing and renders nothing. The traceable events orchestrator adds these values to the tracking details of a product whose `sku` or `abstractSku` matches, wherever the product's own value is empty, both in the markup and in the products a page passes in the global `data` of its `events` config. The product detail page, the catalog, search and new products pages (CatalogPage `page-layout-catalog`), the product search grid, the similar and up-selling product carousels, product alternatives, also on the wishlist, replacement products, discount promotion products, the comparison page, CMS product widgets, content product lists and sets, the configured bundle summary and the order details page render it. Register it in the project's `ShopApplicationDependencyProvider::getGlobalWidgets()`.

Every category path is built by `CategoryService::getCategoryPath()` of the Category module: the storefront passes the categories it reads from storage, the cart plugin the categories it reads from the database, so a product gets the same path on its pages and in the cart.

The ShopUi `product-item` card reads `categoryPath`, `brand` and `selectedVariantAttributes` from its product view; on a list that renders `ProductTrackingDetailsWidget`, the orchestrator adds them when the product has none.

The product detail page, product set pages, the configured bundle summary and the quote request details pass their products in the `events` config of the `eventTracker` block instead of the markup. So do these pages, in the page data of their `PAGE_LOAD` event:
- CartPage `page-layout-cart`: `cartProducts`, the products of the cart shown.
- CheckoutPage `page-layout-checkout`, on every checkout step: page `CHECKOUT`, `checkoutProducts`, `checkoutCoupon` (the voucher codes, comma separated), `checkoutShippingTier` and `checkoutPaymentType` (the chosen shipment and payment method names the shopper sees, never payment details) and `checkoutStep` (`SHIPMENT` or `PAYMENT` on those steps). `CheckoutController` passes the quote to every step view for it. The step forms `form[name="shipmentCollectionForm"]` and `form[name="paymentForm"]` raise `SHIPMENT_SUBMIT` and `PAYMENT_SUBMIT`.
- CheckoutPage `page-layout-order-submitted`: `purchase` (`transactionId`, `shipping`, `tax`, `coupon`) and `purchaseProducts`, with the price paid per unit without tax.

In these lists a product bundle counts as one product, so the products inside it are left out. ShopUi `page-layout-main` raises `CHECKOUT_START` on a click on a link to the checkout (`a[href$="/checkout"]`).

## Product lists

A product list marks its element with `data-item-list-id` and `data-item-list-name`, and a paginated one with `data-item-list-index-offset`, the position of its first card. The `traceable-item-list-view-tracker` molecule, which ShopUi `page-layout-main` renders while the storefront tracks user actions, reports the cards seen in these lists as `ITEM_LIST_VIEW` and writes each card's position to `data-item-list-index`; a product card click (`PRODUCT_CLICK`) sends the list and the position as `itemListId`, `itemListName` and `index`. These lists are marked: the catalog and search results, the similar products (`similar_products`) and cart up-selling (`cart_upselling`) carousels, product alternatives, replacement products, the products of each discount promotion, and the CMS product, product group and content product list widgets. See the molecule's README.

With the cart in async mode, the CartPage `cart-items-change` molecule reads the cart lines when a cart action starts and compares them, by group key, with the lines of the re-rendered cart. It announces the added and removed quantities as `CART_ITEMS_CHANGE`, with the changed lines in the event detail (`increased` and `decreased`); each changed line is the `tracking-details` JSON of the cart line, with `quantity` set to the changed amount. This needs `CartPageConfig::IS_CART_ACTIONS_ASYNC_MODE_ENABLED` set to `true` in the project; nothing is kept in the session.
