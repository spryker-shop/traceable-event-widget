<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShopTest\Yves\TraceableEventWidget\Resolver;

use Codeception\Test\Unit;
use SprykerShop\Yves\TraceableEventWidget\Resolver\UserActionTrackingResolver;
use SprykerShop\Yves\TraceableEventWidget\TraceableEventWidgetConfig;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Auto-generated group annotations
 *
 * @group SprykerShopTest
 * @group Yves
 * @group TraceableEventWidget
 * @group Resolver
 * @group UserActionTrackingResolverTest
 * Add your own group annotations below this line
 */
class UserActionTrackingResolverTest extends Unit
{
    protected const string COOKIE_VALUE = '1';

    public function testIsUserActionTrackingEnabledReturnsTrueWithoutTheDisableCookie(): void
    {
        // Arrange
        $userActionTrackingResolver = $this->createUserActionTrackingResolver(new Request());

        // Act
        $isUserActionTrackingEnabled = $userActionTrackingResolver->isUserActionTrackingEnabled();

        // Assert
        $this->assertTrue($isUserActionTrackingEnabled);
    }

    public function testIsUserActionTrackingEnabledReturnsFalseWithTheDisableCookie(): void
    {
        // Arrange
        $cookieName = (new TraceableEventWidgetConfig())->getUserActionTrackingDisableCookieName();
        $userActionTrackingResolver = $this->createUserActionTrackingResolver(new Request([], [], [], [$cookieName => static::COOKIE_VALUE]));

        // Act
        $isUserActionTrackingEnabled = $userActionTrackingResolver->isUserActionTrackingEnabled();

        // Assert
        $this->assertFalse($isUserActionTrackingEnabled);
    }

    public function testIsUserActionTrackingEnabledReturnsFalseWithoutRequest(): void
    {
        // Arrange
        $userActionTrackingResolver = new UserActionTrackingResolver(new RequestStack(), new TraceableEventWidgetConfig());

        // Act
        $isUserActionTrackingEnabled = $userActionTrackingResolver->isUserActionTrackingEnabled();

        // Assert
        $this->assertFalse($isUserActionTrackingEnabled);
    }

    protected function createUserActionTrackingResolver(Request $request): UserActionTrackingResolver
    {
        $requestStack = new RequestStack();
        $requestStack->push($request);

        return new UserActionTrackingResolver($requestStack, new TraceableEventWidgetConfig());
    }
}
