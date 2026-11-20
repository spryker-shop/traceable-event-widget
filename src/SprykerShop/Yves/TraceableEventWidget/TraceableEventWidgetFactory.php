<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget;

use Spryker\Client\ProductCategoryStorage\ProductCategoryStorageClientInterface;
use Spryker\Client\ProductStorage\ProductStorageClientInterface;
use Spryker\Client\Store\StoreClientInterface;
use Spryker\Yves\Kernel\AbstractFactory;
use SprykerShop\Yves\TraceableEventWidget\Dependency\Client\TraceableEventWidgetToSearchHttpClientInterface;
use SprykerShop\Yves\TraceableEventWidget\Reader\ProductTrackingDetailsReader;
use SprykerShop\Yves\TraceableEventWidget\Reader\ProductTrackingDetailsReaderInterface;
use SprykerShop\Yves\TraceableEventWidget\Resolver\UserActionTrackingResolver;
use SprykerShop\Yves\TraceableEventWidget\Resolver\UserActionTrackingResolverInterface;
use SprykerShop\Yves\TraceableEventWidget\Resolver\WidgetSettingsResolver;
use SprykerShop\Yves\TraceableEventWidget\Resolver\WidgetSettingsResolverInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * @method \SprykerShop\Yves\TraceableEventWidget\TraceableEventWidgetConfig getConfig()
 */
class TraceableEventWidgetFactory extends AbstractFactory
{
    public function createWidgetSettingsResolver(): WidgetSettingsResolverInterface
    {
        return new WidgetSettingsResolver(
            $this->getSearchHttpClient(),
            $this->getConfig(),
        );
    }

    public function createUserActionTrackingResolver(): UserActionTrackingResolverInterface
    {
        return new UserActionTrackingResolver(
            $this->getRequestStack(),
            $this->getConfig(),
        );
    }

    public function createProductTrackingDetailsReader(): ProductTrackingDetailsReaderInterface
    {
        return new ProductTrackingDetailsReader(
            $this->getProductStorageClient(),
            $this->getProductCategoryStorageClient(),
            $this->getStoreClient(),
        );
    }

    public function getProductStorageClient(): ProductStorageClientInterface
    {
        return $this->getProvidedDependency(TraceableEventWidgetDependencyProvider::CLIENT_PRODUCT_STORAGE);
    }

    public function getProductCategoryStorageClient(): ProductCategoryStorageClientInterface
    {
        return $this->getProvidedDependency(TraceableEventWidgetDependencyProvider::CLIENT_PRODUCT_CATEGORY_STORAGE);
    }

    public function getStoreClient(): StoreClientInterface
    {
        return $this->getProvidedDependency(TraceableEventWidgetDependencyProvider::CLIENT_STORE);
    }

    public function getSearchHttpClient(): TraceableEventWidgetToSearchHttpClientInterface
    {
        return $this->getProvidedDependency(TraceableEventWidgetDependencyProvider::CLIENT_SEARCH_HTTP);
    }

    public function getRequestStack(): RequestStack
    {
        return $this->getProvidedDependency(TraceableEventWidgetDependencyProvider::SERVICE_REQUEST_STACK);
    }
}
