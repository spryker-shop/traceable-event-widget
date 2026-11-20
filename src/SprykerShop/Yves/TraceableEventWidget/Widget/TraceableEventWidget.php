<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget\Widget;

use Spryker\Yves\Kernel\Widget\AbstractWidget;

/**
 * @method \SprykerShop\Yves\TraceableEventWidget\TraceableEventWidgetConfig getConfig()
 * @method \SprykerShop\Yves\TraceableEventWidget\TraceableEventWidgetFactory getFactory()
 */
class TraceableEventWidget extends AbstractWidget
{
    protected const string PARAMETER_IS_USER_ACTION_TRACKING_ENABLED = 'isUserActionTrackingEnabled';

    protected const string PARAMETER_IS_TRACKING_CONSENT_REQUIRED = 'isTrackingConsentRequired';

    public function __construct()
    {
        $searchSettingsResolver = $this->getFactory()->createWidgetSettingsResolver();

        $this->addParameter('searchSettings', $searchSettingsResolver->resolveSearchSettings());
        $this->addParameter('tenantIdentifier', $searchSettingsResolver->resolveTenantIdentifier());
        $this->addParameter('adapterMolecules', $this->resolveAdapterMolecules($searchSettingsResolver->getActiveAdapter()));
        $this->addParameter('debug', $this->getConfig()->isDebugEnabled());
        $this->addParameter(static::PARAMETER_IS_USER_ACTION_TRACKING_ENABLED, $this->isUserActionTrackingEnabled());
        $this->addParameter(static::PARAMETER_IS_TRACKING_CONSENT_REQUIRED, $this->getConfig()->isTrackingConsentRequired());
    }

    public static function getName(): string
    {
        return 'TraceableEventWidget';
    }

    public static function getTemplate(): string
    {
        return '@TraceableEventWidget/views/traceable-event/traceable-event.twig';
    }

    protected function isUserActionTrackingEnabled(): bool
    {
        return $this->getFactory()->createUserActionTrackingResolver()->isUserActionTrackingEnabled();
    }

    /**
     * @param string|null $activeAdapter
     *
     * @return array<string>
     */
    protected function resolveAdapterMolecules(?string $activeAdapter): array
    {
        if ($activeAdapter === null) {
            return [];
        }

        return [
            'traceable-events-algolia',
        ];
    }
}
