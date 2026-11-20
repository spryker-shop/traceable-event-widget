Reports the product cards a customer actually saw in product lists as a document event, for traceable event adapters.

Every element matching `list-selector` is a product list, every `item-selector` element inside it is a product card holding its product as JSON in `item-attribute`. The tracker writes each card's position in its list, from 0, to `index-attribute`, so a click on a card can report the same position. Cards of the same SKU share the position of the first one. A paginated list sets the position of its first card in `index-offset-attribute`, so positions continue across pages.

A card counts as seen once `visible-ratio` of it is in view, so slides of a carousel that are scrolled out of view are not reported. Every product is reported once per list and page, also when an ajax update renders the list again. Seen products are collected for `report-delay` milliseconds and reported together:

```ts
{
    itemLists: [
        {
            id: 'similar_products',
            name: 'Similar products',
            products: [{ ...product, index }],
        },
    ],
}
```

Each product carries the details the `ProductTrackingDetailsWidget` renders for the page, e.g. the abstract product name, brand and categories, like the products of every other event.

Register the view event in the `events` config with `debounce: false`, so adapters receive the detail as `eventDetail` and no report is dropped, e.g. `{ event: 'ITEM_LIST_VIEW', name: 'item-list-view', debounce: false }`.

## Code sample

```twig
{% include molecule('traceable-item-list-view-tracker', 'TraceableEventWidget') ignore missing only %}
```
