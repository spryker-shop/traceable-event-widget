<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget\Reader;

use Generated\Shared\Transfer\ItemTransfer;
use Generated\Shared\Transfer\ProductViewTransfer;
use Spryker\Client\ProductCategoryStorage\ProductCategoryStorageClientInterface;
use Spryker\Client\ProductStorage\ProductStorageClientInterface;
use Spryker\Client\Store\StoreClientInterface;

class ProductTrackingDetailsReader implements ProductTrackingDetailsReaderInterface
{
    protected const string SEARCH_RESULT_KEY_ID_PRODUCT_ABSTRACT = 'id_product_abstract';

    protected const string SEARCH_RESULT_KEY_ABSTRACT_SKU = 'abstract_sku';

    protected const string DETAILS_KEY_ABSTRACT_SKU = 'abstractSku';

    protected const string DETAILS_KEY_ABSTRACT_NAME = 'abstractName';

    protected const string DETAILS_KEY_BRAND = 'brand';

    protected const string DETAILS_KEY_VARIANT = 'variant';

    protected const string DETAILS_KEY_CATEGORIES = 'categories';

    protected const string CATEGORY_KEY_NAME = 'name';

    public function __construct(
        protected ProductStorageClientInterface $productStorageClient,
        protected ProductCategoryStorageClientInterface $productCategoryStorageClient,
        protected StoreClientInterface $storeClient
    ) {
    }

    /**
     * @param iterable<\Generated\Shared\Transfer\ProductViewTransfer|\Generated\Shared\Transfer\ItemTransfer|array<string, mixed>> $products
     *
     * @return array<string, array<string, mixed>>
     */
    public function getProductTrackingDetailsIndexedBySku(iterable $products, string $localeName): array
    {
        $productViewTransfers = $this->mapProductsToProductViewTransfers($products);

        if (!$productViewTransfers) {
            return [];
        }

        $productViewTransfers = $this->productStorageClient->expandProductViewTransfersWithProductAbstract($productViewTransfers, $localeName);
        $productViewTransfers = $this->productCategoryStorageClient->expandProductViewTransfersWithCategoryPath(
            $productViewTransfers,
            $localeName,
            $this->storeClient->getCurrentStore()->getNameOrFail(),
        );
        $productTrackingDetailsIndexedBySku = [];

        foreach ($productViewTransfers as $productViewTransfer) {
            $sku = $this->findTrackingSku($productViewTransfer);

            if ($sku === null) {
                continue;
            }

            $productTrackingDetailsIndexedBySku[$sku] = $this->createProductTrackingDetails($productViewTransfer);
        }

        return $productTrackingDetailsIndexedBySku;
    }

    /**
     * @param iterable<\Generated\Shared\Transfer\ProductViewTransfer|\Generated\Shared\Transfer\ItemTransfer|array<string, mixed>> $products
     *
     * @return list<\Generated\Shared\Transfer\ProductViewTransfer>
     */
    protected function mapProductsToProductViewTransfers(iterable $products): array
    {
        $productViewTransfers = [];

        foreach ($products as $product) {
            $productViewTransfer = $this->mapProductToProductViewTransfer($product);

            if (!$productViewTransfer->getIdProductAbstract()) {
                continue;
            }

            $productViewTransfers[] = $productViewTransfer;
        }

        return $productViewTransfers;
    }

    /**
     * A new product view is built for every product, so the expansion never changes the product views the page renders.
     *
     * @param \Generated\Shared\Transfer\ProductViewTransfer|\Generated\Shared\Transfer\ItemTransfer|array<string, mixed> $product
     */
    protected function mapProductToProductViewTransfer(ProductViewTransfer|ItemTransfer|array $product): ProductViewTransfer
    {
        if ($product instanceof ProductViewTransfer) {
            return (new ProductViewTransfer())
                ->setIdProductAbstract($product->getIdProductAbstract())
                ->setIdProductConcrete($product->getIdProductConcrete())
                ->setSku($product->getSku())
                ->setAttributes($product->getAttributes());
        }

        if ($product instanceof ItemTransfer) {
            return (new ProductViewTransfer())
                ->setIdProductAbstract($product->getIdProductAbstract())
                ->setIdProductConcrete($product->getId())
                ->setSku($product->getSku())
                ->setAttributes($product->getSelectedVariantAttributes());
        }

        return (new ProductViewTransfer())
            ->setIdProductAbstract($product[static::SEARCH_RESULT_KEY_ID_PRODUCT_ABSTRACT] ?? null)
            ->setSku($product[static::SEARCH_RESULT_KEY_ABSTRACT_SKU] ?? null);
    }

    protected function findTrackingSku(ProductViewTransfer $productViewTransfer): ?string
    {
        if ($productViewTransfer->getIdProductConcrete()) {
            return $productViewTransfer->getSku();
        }

        return $productViewTransfer->getAbstractSku() ?? $productViewTransfer->getSku();
    }

    /**
     * @return array<string, mixed>
     */
    protected function createProductTrackingDetails(ProductViewTransfer $productViewTransfer): array
    {
        $categories = [];

        foreach ($productViewTransfer->getCategoryPath() as $categoryName) {
            $categories[] = [static::CATEGORY_KEY_NAME => $categoryName];
        }

        return [
            static::DETAILS_KEY_ABSTRACT_SKU => $productViewTransfer->getAbstractSku(),
            static::DETAILS_KEY_ABSTRACT_NAME => $productViewTransfer->getAbstractName(),
            static::DETAILS_KEY_BRAND => $productViewTransfer->getBrand(),
            static::DETAILS_KEY_VARIANT => array_values($productViewTransfer->getSelectedVariantAttributes()),
            static::DETAILS_KEY_CATEGORIES => $categories,
        ];
    }
}
