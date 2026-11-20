# Traceable Events Orchestrator

## Overview

The **Traceable Events Orchestrator** is a dynamic event-handling system that allows you to track specific user interactions within your application and respond to them through configurable event triggers. This orchestrator uses adapters to modularize and manage event handlers, making it ideal for scenarios requiring complex user tracking, such as e-commerce applications.

## Features

-   **Event Orchestration**: Track and respond to a wide range of user interactions.
-   **Adapter-Based Architecture**: Modular adapters allow for specific handling of individual event types.
-   **Customizable Event Triggers**: Define triggers using CSS selectors, exceptions, and relative targets.
-   **Data Capture**: Collect contextual information from DOM elements based on event triggers.
-   **Twig Integration**: Configure events directly within Twig templates.

## Components

### Traceable Events Orchestrator

This is the core class that listens to and manages events. Event configurations are set up in Twig, allowing the orchestrator to track specific elements and interactions and pass data to registered adapters.

### BaseTraceableEventAdapter

Adapters are used to handle specific events. They register with the orchestrator and are notified when relevant events occur, allowing custom logic for each event type.

## Getting Started

### Step 1: Define Events in Twig and global data.

Define the events and their configurations in your Twig template using the `EventData` format. Each event should specify (events.list):

-   **Event Type**: The type of interaction to track (e.g., `PAGE_LOAD`, `PRODUCT_CLICK`).
-   **Event Name**: An identifier for the event.
-   **Triggers**: Specific conditions that must be met for the event to trigger.

Define any global data that will be available across all events. (events.data)

A trigger selector is matched against the clicked or submitting element and its ancestors, and the first event of the list with a matching trigger handles the DOM event. For a `submit` event, the matching starts at the button that submitted the form (`SubmitEvent.submitter`), so the trigger can tell the form's submit buttons apart; a selector for the form itself still matches, as the form is an ancestor of the button. Before version 1.5.0 the matching started at the event target, the form itself. Select the clicked element itself, e.g. a button, rather than a focused one: Safari and Firefox on macOS do not focus a button on click. To read data outside the clicked element, start the lookup from one of its ancestors with `closest: true`.

Example:

```twig
{% set events = {
    list: [
        {
            event: 'PAGE_LOAD',
            name: 'load',
        },
        {
            event: 'PRODUCT_CLICK',
            name: 'click',
            triggers: [
                {
                    selector: '.js-product-item',
                    groupAs: {
                        key: 'products',
                        toArray: true,
                    },
                    data: {
                        details: {
                            selector: 'self',
                            flatten: true,
                        },
                    },
                },
                {
                    selector: '.suggestion-product',
                    groupAs: {
                        key: 'products',
                        toArray: true,
                    },
                    data: {
                        sku: {
                            selector: 'self',
                        },
                        searchId: {
                            value: null,
                        },
                    },
                }
            ],
        },
    ],
    data: {
        currency: currency | spaceless,
    },
} %}
```

### Step 2: Use Traceable Event Widget

Embed the `TraceableEventWidget` in your template with the configured events and global data:

```twig
{% block eventTracker %}
    {% widget 'TraceableEventWidget' with {
        events: events,
    } only %}
{% endwidget %}
```

## Creating Adapters

Adapters are classes that extend the `BaseTraceableEventAdapter` and define specific logic to handle various types of events. Below is an example and explanation of creating an adapter, `TraceableEventsAlgolia`, which integrates with the Algolia Insights API to track specific events.

### Example: TraceableEventsAlgolia Adapter

```typescript
declare global {
    interface GlobalEventData {
        // Augment global data with params
    }

    interface SPRYKER_EVENTS {
        // Add additional custom events
    }
}

interface ProductEventData extends EventsHandlerData<EventName> {
    // Add params for specific event
}

export default class TraceableEventsAdapter extends BaseTraceableEventAdapter {
    override init(): void {
        // Custom initialization logic (optional)

        super.init();
    }

    override getHandlers(): Partial<TraceableEventHandlers> {
        return {
            PRODUCT_CLICK: [this.productClickHandler],
            // Other events
        };
    }

    protected productClickHandler(data: ProductEventData): void {
        // Custom handler logic for product click events
    }
}
```

### Steps to Create an Adapter

1. **Extend BaseTraceableEventAdapter**: Start by extending `BaseTraceableEventAdapter` to inherit core functionalities.
2. **Initialize Custom Logic**: Override the `init` method to initialize any third-party services or set up data.
3. **Define Handlers in getHandlers()**: Override `getHandlers()` to specify which methods handle specific events. Each handler is mapped to an event type (e.g., `PRODUCT_CLICK`, `PAGE_LOAD`).
4. **Implement Event Handlers**: Each handler method should process event data and perform the necessary actions, such as sending data to a tracking service.

### Adapter Extending on Project Level

If you need to extend existing events with custom logic or/and add new event you can extend adapter on project level, see example below.

```typescript
declare global {
    interface SPRYKER_EVENTS {
        NEW_EVENT: undefined;
    }
}

interface EventData extends EventsHandlerData<EventName> {
    // Add params for specific event
}

export default class ProjectEventsAdapter extends TraceableEventsCoreAdapter {
    override getHandlers(): Partial<TraceableEventHandlers> {
        const events = super.getHandlers();

        return {
            ...events,
            PRODUCT_CLICK: [...events['PRODUCT_CLICK'], this.additionalLogicClickEvent],
            NEW_EVENT: [this.projectEvent],
        };
    }

    protected projectEvent(data: EventData): void {
        // Custom handler for new event
    }

    protected additionalLogicClickEvent(data: ProductEventData): void {
        // Custom handler for product click event
    }
}
```

Then you can add it to twig events configuration.

```twig
{% block eventTracker %}
    {% set events = {
        list: events.list | merge([{
            event: 'NEW_EVENT',
            name: event handler name,
            triggers: [...event triggers],
        }]),
        data: events.data,
    } %}

    {{ parent() }}
{% endblock %}
```

## Event Configuration Guide

### Event Structure

-   **`event`**: Specifies the event type (e.g., `PAGE_LOAD`, `PRODUCT_CLICK`).
-   **`name`**: A case-sensitive string representing the event type to listen for (`click`, `change`, `load`).
-   **`debounce`**: Optional, `true` by default: a DOM event that matches the event on the same trigger element within 300 ms of its previous one is dropped, e.g. a double click. DOM events on different trigger elements, e.g. the remove buttons of two cart lines, are all handled. Set `false` for an event that carries its own data every time, e.g. a cart change. It applies to the event alone, so other events with the same `name` do not change it. Before version 1.5.0 every DOM event of the same type within 300 ms was dropped, whichever event and element it matched.
-   **`triggers`**: An array of conditions for capturing the event.
    -   **`selector`**: CSS selector for the element to monitor.
    -   **`groupAs`**: Groups data into a key, optionally as an array.
    -   **`data`**: Data points to capture, supporting:
        -   **`selector`**: Element from which to extract data (`'self'` for the target).
        -   **`flatten`**: Merges nested data into a single object.
        -   **`attribute`**: The attribute to retrieve (default: key name).
        -   **`value`**: A static value if defined.
        -   **`multi`**: Specifies whether to capture multiple matching elements.
        -   **`closest`**: Looks the selector up among the ancestors of the trigger element instead of its descendants.
        -   **`composed`**: Nested structure to compose data objects.

### Example: Event Configuration

```twig
{% set events = {
    list: events.list | merge([{
        event: 'EVENT_EXAMPLE', // The name of the event to be tracked
        name: 'click', // The type of user interaction that triggers the event
        triggers: [
            {
                selector: '.js-related-products', // The CSS selector for the element to monitor for user interaction
                groupAs: {
                    key: 'relatedProducts', // Group data under the 'relatedProducts' key
                    toArray: true, // Convert the grouped data into an array format
                },
                data: {
                    details: {
                        selector: 'self', // Look for the 'details' attribute within the current element
                        flatten: true, // Flatten the structure of the object to simplify it
                    },
                    name: {
                        selector: '.product-name', // Search for an element with the 'product-name' class within the monitored element
                        attribute: 'price', // Use the 'price' attribute as the value; if absent, fallback to the element's text content
                    },
                    price: {
                        value: 'static value', // Assign a fixed value to the 'price' attribute
                    },
                    attributes: {
                        selector: '.attribute-selector',
                        multi: true, // Collect all matching elements and return their data as an array
                    },
                    metadata: {
                        multi: true,
                        selector: '.metadata-row',
                        composed: { // Create nested structures for more detailed data gathering and start searching elements from `.metadata-row` selector.
                            brand: {
                                selector: '.product-brand',
                                attribute: 'textContent'
                            },
                            category: {
                                selector: '.product-category',
                            },
                        },
                    },
                },
            },
        ],
    }]),
    data: events.data,
} %}

{# Expected transformed data format in the console:
  {
      ...global data/event metadata,
      relatedProducts: {
          // Flattened data from the 'details' attribute
          name: VALUE, // The value taken from the 'name' selector or attribute
          price: 'static value', // The fixed 'price' value
          attributes: [VALUE, VALUE, VALUE, ...], // Array of values collected from elements matching '.attribute-selector'
          metadata: [
              {
                  brand: VALUE, // 'brand' data extracted from the '.metadata-row .product-brand' element
                  category: VALUE, // 'category' data from the '.metadata-row .product-category' element
              },
              {
                  brand: VALUE, // 'brand' data extracted from the '.metadata-row .product-brand' element
                  category: VALUE, // 'category' data from the '.metadata-row .product-category' element
              },
              ...
          ]
      }
  }
#}
```

## Cookie Consent

Spryker ships no consent management platform (CMP) and no consent banner; a project uses the CMP it owns. Consent is decided on two levels:

| Level | Who | Decides |
| --- | --- | --- |
| Adapter | The adapter, in core or in its module | Which Spryker purposes its events serve: `statistics`, `marketing` or `preferences` |
| Consent component | The project, in one file | Which category of its CMP each Spryker purpose is, and whether the shopper granted it |

The orchestrator starts an adapter, through its `activate()` method, once the shopper granted any of the adapter's purposes: before, it loads no provider script, writes no cookie and receives no event. An event reaches an adapter only when every purpose the event serves for that adapter is granted. Without consent, events are dropped, never stored; consent given later on the same page reports that page's load (`PAGE_LOAD`) to the adapters it allows, not the actions taken before. Consent withdrawn on the page stops, through its `deactivate()` method, every started adapter none of whose purposes is granted any more: it receives no event from then on, and an adapter whose provider sends on its own, e.g. Google Analytics, stops the provider. Consent given again starts it again through `activate()`, without reporting the page's load a second time. Cookies a provider already wrote are left to the CMP, which removes them on withdrawal.

Consent is required by default. An environment without real shoppers, e.g. a development or test environment, can switch it off in the Back Office: Configuration → Integrations → Tracking Consent → Require Consent, globally or per store.

The requirement is the orchestrator's `consent-required` attribute; a project template of the orchestrator without it requires consent. A shop that requires consent and renders no consent component, or wires no CMP, tracks nothing. A shop that switches the requirement off tracks without consent, which is the project's responsibility.

### Consent Purposes of an Adapter

An adapter declares its purposes in `consentPurposes`, `statistics` by default, and, when its events serve different purposes, the purposes of each event in `getEventConsentPurposes()`:

```ts
import {
    CONSENT_PURPOSE_MARKETING,
    CONSENT_PURPOSE_STATISTICS,
    ConsentPurpose,
} from 'TraceableEventWidget/components/molecules/traceable-events-consent/consent-purposes';

export default class TraceableEventsSomePixel extends BaseTraceableEventAdapter {
    // Starts with statistics or with marketing consent.
    override get consentPurposes(): ConsentPurpose[] {
        return [CONSENT_PURPOSE_STATISTICS, CONSENT_PURPOSE_MARKETING];
    }

    // Adding to cart feeds ad audiences as well; every other event is statistics only.
    override getEventConsentPurposes(eventName: EventName): ConsentPurpose[] {
        if (eventName === 'ADD_TO_CART') {
            return [CONSENT_PURPOSE_STATISTICS, CONSENT_PURPOSE_MARKETING];
        }

        return [CONSENT_PURPOSE_STATISTICS];
    }
}
```

| Adapter | Purposes |
| --- | --- |
| `traceable-events-google-analytics` | `statistics` |
| `traceable-events-algolia` | `statistics` |

### Connecting a CMP

Out of the box, the consent component maps every purpose to a category of the same name and reads the granted categories from the `trackingConsent` cookie, comma separated, e.g. `statistics,marketing`. Another cookie name is passed in the component's `consentCookieName` data. Any CMP can set it from its consent callback and then tell the orchestrator:

```js
document.cookie = 'trackingConsent=statistics; path=/; max-age=31536000; SameSite=Lax';
document.dispatchEvent(new Event('traceable-events-consent-change'));
```

To read the CMP directly instead, a project overrides the consent component in its own theme, e.g. `src/Pyz/TraceableEventWidget/src/Pyz/Yves/TraceableEventWidget/Theme/default/components/molecules/traceable-events-consent/traceable-events-consent.ts`. That one file relates tracking to the CMP: `categoriesByPurpose` maps the Spryker purposes to the CMP's category names, `isCategoryGranted()` reads the CMP's consent, and `init()` subscribes to the CMP and calls `notifyConsentChange()`. Example for Cookiebot:

```ts
import TraceableEventsConsentCore from 'TraceableEventWidget/components/molecules/traceable-events-consent/traceable-events-consent';

declare global {
    interface Window {
        Cookiebot?: { consent: Record<string, boolean> };
    }
}

export default class TraceableEventsConsent extends TraceableEventsConsentCore {
    protected init(): void {
        window.addEventListener('CookiebotOnConsentReady', () => this.notifyConsentChange());
        // Reports a consent Cookiebot already has.
        super.init();
    }

    // Cookiebot's categories are necessary, preferences, statistics and marketing: the same names as the Spryker purposes.
    protected isCategoryGranted(category: string): boolean {
        return window.Cookiebot?.consent[category] === true;
    }
}
```

### Grouping Single Events Differently

A CMP may group events differently from the adapter, e.g. a purchase as conversion tracking under its advertising category, while every other Google Analytics event is analytics. The consent component's `getEventPurposes()` moves single events to other purposes, in the same project file; it receives the adapter's name, the event name and the purposes the adapter declares. Event names are the orchestrator's, e.g. `ADD_TO_CART`, and the names an adapter sends to its provider, e.g. Google Analytics' `purchase`, which the adapter checks before sending:

```ts
protected getEventPurposes(
    adapterName: string,
    eventName: string,
    defaultPurposes: ConsentPurpose[],
): ConsentPurpose[] {
    if (adapterName === 'traceable-events-google-analytics' && eventName === 'purchase') {
        return [...defaultPurposes, CONSENT_PURPOSE_MARKETING];
    }

    return defaultPurposes;
}
```

A purpose of the project's own, e.g. `conversion`, works the same way once `categoriesByPurpose` maps it to a CMP category. The adapter still starts by its own purposes, so a purpose added here only restricts the event.

The project's `index.ts` registers it under the same name, `traceable-events-consent`. The `disableUserActionTracking` cookie still suppresses the orchestrator, and with it every adapter, regardless of consent.

## Data Flow

1. **Event Trigger**: When a defined event trigger is met, the orchestrator captures data based on the trigger configuration.
2. **Data Processing**: The orchestrator gathers data points specified in the configuration, using attributes or default values.
3. **Event Handling**: Adapters registered to the orchestrator receive the event data for further processing.

## Debug Mode

Enable debugging by setting the `debug` attribute in the Twig template. This logs event details to the console for inspection.

```twig
{% define attributes = {
    debug: true,
} %}
```

## Error Handling

The orchestrator logs errors during event handling to the console, allowing for easy troubleshooting.
