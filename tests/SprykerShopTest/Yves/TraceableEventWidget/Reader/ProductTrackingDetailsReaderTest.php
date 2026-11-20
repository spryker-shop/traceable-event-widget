<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShopTest\Yves\TraceableEventWidget\Reader;

use Codeception\Test\Unit;
use Generated\Shared\Transfer\ItemTransfer;
use Generated\Shared\Transfer\ProductViewTransfer;
use Generated\Shared\Transfer\StoreTransfer;
use Spryker\Client\ProductCategoryStorage\ProductCategoryStorageClientInterface;
use Spryker\Client\ProductStorage\ProductStorageClientInterface;
use Spryker\Client\Store\StoreClientInterface;
use SprykerShop\Yves\TraceableEventWidget\Reader\ProductTrackingDetailsReader;

/**
 * Auto-generated group annotations
 *
 * @group SprykerShopTest
 * @group Yves
 * @group TraceableEventWidget
 * @group Reader
 * @group ProductTrackingDetailsReaderTest
 * Add your own group annotations below this line
 */
class ProductTrackingDetailsReaderTest extends Unit
{
    protected const string LOCALE_NAME = 'en_US';

    protected const int ID_PRODUCT_ABSTRACT = 2147483000;

    protected const int ID_PRODUCT_CONCRETE = 2147483001;

    protected const string ABSTRACT_SKU = 'tracking-abstract-sku';

    protected const string CONCRETE_SKU = 'tracking-concrete-sku';

    protected const string ABSTRACT_NAME = 'Abstract product name';

    protected const string BRAND = 'Samsung';

    protected const string CATEGORY_NAME = 'Computer';

    protected const string VARIANT_ATTRIBUTE_KEY = 'color';

    protected const string VARIANT_VALUE = 'Red';

    protected const string STORE_NAME = 'DE';

    public function testGetProductTrackingDetailsIndexedBySkuKeysConcreteProductsByConcreteSkuAndSearchResultsByAbstractSku(): void
    {
        // Arrange
        $productTrackingDetailsReader = $this->createProductTrackingDetailsReader($this->createProductStorageClientMock());
        $products = [
            ['id_product_abstract' => static::ID_PRODUCT_ABSTRACT, 'abstract_sku' => static::ABSTRACT_SKU],
            (new ItemTransfer())->setIdProductAbstract(static::ID_PRODUCT_ABSTRACT)->setId(static::ID_PRODUCT_CONCRETE)->setSku(static::CONCRETE_SKU),
        ];

        // Act
        $productTrackingDetails = $productTrackingDetailsReader->getProductTrackingDetailsIndexedBySku($products, static::LOCALE_NAME);

        // Assert
        $this->assertSame([static::ABSTRACT_SKU, static::CONCRETE_SKU], array_keys($productTrackingDetails));
        $this->assertSame([], $productTrackingDetails[static::ABSTRACT_SKU]['variant']);
        $this->assertSame([
            'abstractSku' => static::ABSTRACT_SKU,
            'abstractName' => static::ABSTRACT_NAME,
            'brand' => static::BRAND,
            'variant' => [static::VARIANT_VALUE],
            'categories' => [['name' => static::CATEGORY_NAME]],
        ], $productTrackingDetails[static::CONCRETE_SKU]);
    }

    public function testGetProductTrackingDetailsIndexedBySkuDoesNotChangeTheGivenProductViews(): void
    {
        // Arrange
        $productTrackingDetailsReader = $this->createProductTrackingDetailsReader($this->createProductStorageClientMock());
        $productViewTransfer = (new ProductViewTransfer())->setIdProductAbstract(static::ID_PRODUCT_ABSTRACT)->setSku(static::ABSTRACT_SKU);

        // Act
        $productTrackingDetailsReader->getProductTrackingDetailsIndexedBySku([$productViewTransfer], static::LOCALE_NAME);

        // Assert
        $this->assertNull($productViewTransfer->getAbstractName());
    }

    public function testGetProductTrackingDetailsIndexedBySkuDoesNotReadTheStorageWithoutAbstractProducts(): void
    {
        // Arrange
        $productStorageClientMock = $this->createMock(ProductStorageClientInterface::class);
        $productStorageClientMock->expects($this->never())->method('expandProductViewTransfersWithProductAbstract');
        $productTrackingDetailsReader = $this->createProductTrackingDetailsReader($productStorageClientMock);

        // Act
        $productTrackingDetails = $productTrackingDetailsReader->getProductTrackingDetailsIndexedBySku([new ProductViewTransfer(), []], static::LOCALE_NAME);

        // Assert
        $this->assertSame([], $productTrackingDetails);
    }

    protected function createProductTrackingDetailsReader(ProductStorageClientInterface $productStorageClient): ProductTrackingDetailsReader
    {
        $productCategoryStorageClientMock = $this->createMock(ProductCategoryStorageClientInterface::class);
        $productCategoryStorageClientMock->method('expandProductViewTransfersWithCategoryPath')
            ->willReturnCallback(function (array $productViewTransfers, string $localeName, string $storeName): array {
                foreach ($productViewTransfers as $productViewTransfer) {
                    $productViewTransfer->setCategoryPath($storeName === static::STORE_NAME ? [static::CATEGORY_NAME] : []);
                }

                return $productViewTransfers;
            });
        $storeClientMock = $this->createMock(StoreClientInterface::class);
        $storeClientMock->method('getCurrentStore')->willReturn((new StoreTransfer())->setName(static::STORE_NAME));

        return new ProductTrackingDetailsReader($productStorageClient, $productCategoryStorageClientMock, $storeClientMock);
    }

    protected function createProductStorageClientMock(): ProductStorageClientInterface
    {
        $productStorageClientMock = $this->createMock(ProductStorageClientInterface::class);
        $productStorageClientMock->method('expandProductViewTransfersWithProductAbstract')
            ->willReturnCallback(function (array $productViewTransfers): array {
                foreach ($productViewTransfers as $productViewTransfer) {
                    $productViewTransfer
                        ->setAbstractSku(static::ABSTRACT_SKU)
                        ->setAbstractName(static::ABSTRACT_NAME)
                        ->setBrand(static::BRAND)
                        ->setSelectedVariantAttributes($productViewTransfer->getIdProductConcrete() ? [static::VARIANT_ATTRIBUTE_KEY => static::VARIANT_VALUE] : []);
                }

                return $productViewTransfers;
            });

        return $productStorageClientMock;
    }
}
