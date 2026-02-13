<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget;

use Spryker\Yves\Kernel\AbstractFactory;
use SprykerShop\Yves\TraceableEventWidget\Dependency\Client\TraceableEventWidgetToSearchHttpClientInterface;
use SprykerShop\Yves\TraceableEventWidget\Resolver\WidgetSettingsResolver;
use SprykerShop\Yves\TraceableEventWidget\Resolver\WidgetSettingsResolverInterface;

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

    public function getSearchHttpClient(): TraceableEventWidgetToSearchHttpClientInterface
    {
        return $this->getProvidedDependency(TraceableEventWidgetDependencyProvider::CLIENT_SEARCH_HTTP);
    }
}
