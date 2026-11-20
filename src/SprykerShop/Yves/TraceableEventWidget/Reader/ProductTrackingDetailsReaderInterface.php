<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget\Reader;

interface ProductTrackingDetailsReaderInterface
{
    /**
     * @param iterable<\Generated\Shared\Transfer\ProductViewTransfer|\Generated\Shared\Transfer\ItemTransfer|array<string, mixed>> $products
     *
     * @return array<string, array<string, mixed>> Keys are the concrete product SKU, or the abstract product SKU for a product without a concrete product.
     */
    public function getProductTrackingDetailsIndexedBySku(iterable $products, string $localeName): array;
}
