<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget\Resolver;

use SprykerShop\Yves\TraceableEventWidget\TraceableEventWidgetConfig;
use Symfony\Component\HttpFoundation\RequestStack;

class UserActionTrackingResolver implements UserActionTrackingResolverInterface
{
    public function __construct(
        protected RequestStack $requestStack,
        protected TraceableEventWidgetConfig $traceableEventWidgetConfig
    ) {
    }

    public function isUserActionTrackingEnabled(): bool
    {
        $request = $this->requestStack->getCurrentRequest();

        if ($request === null) {
            return false;
        }

        return !$request->cookies->get($this->traceableEventWidgetConfig->getUserActionTrackingDisableCookieName());
    }
}
