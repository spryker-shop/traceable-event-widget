<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget\Resolver;

interface WidgetSettingsResolverInterface
{
    /**
     * @return array<string, mixed>
     */
    public function resolveSearchSettings(): array;

    public function resolveTenantIdentifier(): string;

    public function getActiveAdapter(): ?string;
}
