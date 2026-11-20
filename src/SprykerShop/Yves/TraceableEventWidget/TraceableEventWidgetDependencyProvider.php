<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget;

use Spryker\Yves\Kernel\AbstractBundleDependencyProvider;
use Spryker\Yves\Kernel\Container;
use SprykerShop\Yves\TraceableEventWidget\Dependency\Client\TraceableEventWidgetToSearchHttpClientBridge;

class TraceableEventWidgetDependencyProvider extends AbstractBundleDependencyProvider
{
    /**
     * @var string
     */
    public const CLIENT_SEARCH_HTTP = 'CLIENT_SEARCH_HTTP';

    /**
     * @uses \Spryker\Yves\Http\Plugin\Application\HttpApplicationPlugin::SERVICE_REQUEST_STACK
     */
    public const string SERVICE_REQUEST_STACK = 'request_stack';

    public const string CLIENT_PRODUCT_STORAGE = 'CLIENT_PRODUCT_STORAGE';

    public const string CLIENT_PRODUCT_CATEGORY_STORAGE = 'CLIENT_PRODUCT_CATEGORY_STORAGE';

    public const string CLIENT_STORE = 'CLIENT_STORE';

    public function provideDependencies(Container $container): Container
    {
        $container = parent::provideDependencies($container);

        $container = $this->addSearchHttpClient($container);
        $container = $this->addRequestStack($container);
        $container = $this->addProductStorageClient($container);
        $container = $this->addProductCategoryStorageClient($container);
        $container = $this->addStoreClient($container);

        return $container;
    }

    protected function addSearchHttpClient(Container $container): Container
    {
        $container->set(static::CLIENT_SEARCH_HTTP, function (Container $container) {
            return new TraceableEventWidgetToSearchHttpClientBridge(
                $container->getLocator()->searchHttp()->client(),
            );
        });

        return $container;
    }

    protected function addRequestStack(Container $container): Container
    {
        $container->set(static::SERVICE_REQUEST_STACK, function (Container $container) {
            return $container->getApplicationService(static::SERVICE_REQUEST_STACK);
        });

        return $container;
    }

    protected function addProductStorageClient(Container $container): Container
    {
        $container->set(static::CLIENT_PRODUCT_STORAGE, function (Container $container) {
            return $container->getLocator()->productStorage()->client();
        });

        return $container;
    }

    protected function addProductCategoryStorageClient(Container $container): Container
    {
        $container->set(static::CLIENT_PRODUCT_CATEGORY_STORAGE, function (Container $container) {
            return $container->getLocator()->productCategoryStorage()->client();
        });

        return $container;
    }

    protected function addStoreClient(Container $container): Container
    {
        $container->set(static::CLIENT_STORE, function (Container $container) {
            return $container->getLocator()->store()->client();
        });

        return $container;
    }
}
