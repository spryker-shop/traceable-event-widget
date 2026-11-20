<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget;

use Spryker\Yves\Kernel\AbstractBundleConfig;

class TraceableEventWidgetConfig extends AbstractBundleConfig
{
    protected const string USER_ACTION_TRACKING_DISABLE_COOKIE_NAME = 'disableUserActionTracking';

    protected const string TRACKING_CONSENT_REQUIRED_SETTING_KEY = 'integrations:tracking_consent:consent:consent_required';

    /**
     * @uses \Spryker\Shared\KernelApp\KernelAppConstants::TENANT_IDENTIFIER
     *
     * @api
     *
     * @return string
     */
    public function getTenantIdentifier(): string
    {
        return $this->get('KERNEL_APP:TENANT_IDENTIFIER');
    }

    /**
     * @uses \SprykerShop\Shared\ShopApplication\ShopApplicationConstants::ENABLE_APPLICATION_DEBUG
     *
     * @api
     *
     * @return bool
     */
    public function isDebugEnabled(): bool
    {
        return $this->get('SHOP_APPLICATION:ENABLE_APPLICATION_DEBUG', false);
    }

    /**
     * Specification:
     * - Returns the name of the cookie that turns the storefront user action tracking off while the visitor has it.
     *
     * @api
     */
    public function getUserActionTrackingDisableCookieName(): string
    {
        return static::USER_ACTION_TRACKING_DISABLE_COOKIE_NAME;
    }

    /**
     * Specification:
     * - Returns whether the storefront tracks only with the shopper's consent, as set in the Back Office.
     * - Returns `true` when the setting is not stored or not synchronized yet.
     *
     * @api
     */
    public function isTrackingConsentRequired(): bool
    {
        $isTrackingConsentRequired = $this->getModuleConfig(static::TRACKING_CONSENT_REQUIRED_SETTING_KEY, true);

        return filter_var($isTrackingConsentRequired, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? true;
    }
}
