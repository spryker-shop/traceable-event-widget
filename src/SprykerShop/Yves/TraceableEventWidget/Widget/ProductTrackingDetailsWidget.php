<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget\Widget;

use Spryker\Yves\Kernel\Widget\AbstractWidget;

/**
 * Renders the tracking details of the products of a list in one element: abstract product SKU and name, brand, variant and categories.
 * The traceable events orchestrator adds them to the tracking details of an element of the list whose own value is empty.
 *
 * @method \SprykerShop\Yves\TraceableEventWidget\TraceableEventWidgetFactory getFactory()
 */
class ProductTrackingDetailsWidget extends AbstractWidget
{
    protected const string PARAMETER_PRODUCT_TRACKING_DETAILS = 'productTrackingDetails';

    /**
     * @param iterable<\Generated\Shared\Transfer\ProductViewTransfer|\Generated\Shared\Transfer\ItemTransfer|array<string, mixed>> $products Product views, order or cart items, or search result products.
     */
    public function __construct(iterable $products)
    {
        $this->addParameter(static::PARAMETER_PRODUCT_TRACKING_DETAILS, $this->getProductTrackingDetails($products));
    }

    public static function getName(): string
    {
        return 'ProductTrackingDetailsWidget';
    }

    public static function getTemplate(): string
    {
        return '@TraceableEventWidget/views/product-tracking-details/product-tracking-details.twig';
    }

    /**
     * @param iterable<\Generated\Shared\Transfer\ProductViewTransfer|\Generated\Shared\Transfer\ItemTransfer|array<string, mixed>> $products
     *
     * @return array<string, array<string, mixed>>
     */
    protected function getProductTrackingDetails(iterable $products): array
    {
        if (!$this->getFactory()->createUserActionTrackingResolver()->isUserActionTrackingEnabled()) {
            return [];
        }

        return $this->getFactory()
            ->createProductTrackingDetailsReader()
            ->getProductTrackingDetailsIndexedBySku($products, $this->getLocale());
    }
}
