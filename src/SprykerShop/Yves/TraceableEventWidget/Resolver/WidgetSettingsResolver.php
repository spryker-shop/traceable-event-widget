<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerShop\Yves\TraceableEventWidget\Resolver;

use Generated\Shared\Transfer\SearchHttpConfigCriteriaTransfer;
use Generated\Shared\Transfer\SearchHttpConfigTransfer;
use Spryker\Client\Kernel\AbstractBundleConfig;
use Spryker\Client\Kernel\ClassResolver\Config\BundleConfigNotFoundException;
use Spryker\Client\Kernel\ClassResolver\Config\BundleConfigResolver;
use SprykerShop\Yves\TraceableEventWidget\Dependency\Client\TraceableEventWidgetToSearchHttpClientInterface;
use SprykerShop\Yves\TraceableEventWidget\TraceableEventWidgetConfig;

class WidgetSettingsResolver implements WidgetSettingsResolverInterface
{
    protected const ADAPTER_ALGOLIA = 'algolia';

    protected const ADAPTER_SEARCH_HTTP = 'search_http';

    protected ?AbstractBundleConfig $algoliaConfig = null;

    protected ?SearchHttpConfigTransfer $searchHttpConfigTransfer = null;

    public function __construct(
        protected TraceableEventWidgetToSearchHttpClientInterface $searchHttpClient,
        protected TraceableEventWidgetConfig $config,
    ) {
        $this->algoliaConfig = $this->resolveAlgoliaConfig();
        $this->searchHttpConfigTransfer = $this->searchHttpClient->findSearchConfig(new SearchHttpConfigCriteriaTransfer());
    }

    /**
     * @return array<string, mixed>
     */
    public function resolveSearchSettings(): array
    {
        if ($this->algoliaConfig !== null) {
            return $this->getSearchSettingsFromAlgoliaConfig();
        }

        if ($this->searchHttpConfigTransfer !== null) {
            return $this->searchHttpConfigTransfer->getSettings();
        }

        return [];
    }

    public function resolveTenantIdentifier(): string
    {
        if ($this->algoliaConfig !== null && method_exists($this->algoliaConfig, 'getTenantIdentifier')) {
            return $this->algoliaConfig->getTenantIdentifier();
        }

        if ($this->searchHttpConfigTransfer !== null) {
            return $this->config->getTenantIdentifier();
        }

        return '';
    }

    public function getActiveAdapter(): ?string
    {
        if ($this->algoliaConfig !== null) {
            return static::ADAPTER_ALGOLIA;
        }

        if ($this->searchHttpConfigTransfer !== null) {
            return static::ADAPTER_SEARCH_HTTP;
        }

        return null;
    }

    protected function resolveAlgoliaConfig(): ?AbstractBundleConfig
    {
        try {
            return (new BundleConfigResolver())->resolve('SprykerEco\Client\Algolia');
        } catch (BundleConfigNotFoundException) {
            return null;
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function getSearchSettingsFromAlgoliaConfig(): array
    {
        if ($this->algoliaConfig === null) {
            return [];
        }

        $searchSettings = [];

        if (method_exists($this->algoliaConfig, 'getApplicationId')) {
            $searchSettings['algolia_app_id'] = $this->algoliaConfig->getApplicationId();
        }

        if (method_exists($this->algoliaConfig, 'getSearchOnlyApiKey')) {
            $searchSettings['algolia_app_key'] = $this->algoliaConfig->getSearchOnlyApiKey();
        }

        if (method_exists($this->algoliaConfig, 'getProjectMappingFacets')) {
            $searchSettings['project_mapping_facets'] = $this->algoliaConfig->getProjectMappingFacets();
        }

        return $searchSettings;
    }
}
