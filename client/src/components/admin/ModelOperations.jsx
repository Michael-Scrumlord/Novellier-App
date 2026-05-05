import { useModelCatalog } from '../../hooks/useModelCatalog.js';
import { AdminPageHead, LoadingState, ErrorBanner } from './AdminStates.jsx';
import ModelSidebar from './ModelSidebar.jsx';
import ModelDetailsView from './ModelDetailsView.jsx';
import OllamaEndpointCard from './OllamaEndpointCard.jsx';
import OllamaModelParamsCard from './OllamaModelParamsCard.jsx';

function ActiveRoleStat({ label, model }) {
    return (
        <div className="surface-card surface-card--hoverable vision-stat-card">
            <span className="eyebrow vision-stat-label">{label}</span>
            <span className="vision-stat-value vision-stat-value--mono">
                {model || 'Unassigned'}
            </span>
        </div>
    );
}

function SearchInput({ value, onChange }) {
    return (
        <div className="vision-search-wrapper">
            <input
                className="vision-input vision-search-input"
                placeholder="Search models..."
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}

export default function ModelOperations({ token }) {
    const catalog = useModelCatalog(token);

    if (catalog.loading && catalog.catalog.models.length === 0) {
        return <LoadingState message="Loading Ollama catalog..." />;
    }

    const active = catalog.catalog.active || {};

    return (
        <section className="vision-module-container">
            <AdminPageHead
                crumb={['Admin', 'Infrastructure', 'Models']}
                title="Ollama Model Catalog"
                desc="Search the Ollama library, inspect variants, and assign runtime roles."
                actions={<SearchInput value={catalog.searchQuery} onChange={catalog.setSearchQuery} />}
            />

            <div className="vision-stat-grid vision-stat-grid--compact">
                <OllamaEndpointCard token={token} onEndpointChanged={catalog.onEndpointChanged} />
                <ActiveRoleStat label="Suggestion Engine" model={active.suggestion} />
                <ActiveRoleStat label="Summary Engine"    model={active.summary} />
                <ActiveRoleStat label="Embedding Engine"  model={active.embedding} />
                <OllamaModelParamsCard token={token} />
            </div>

            <ErrorBanner>{catalog.error}</ErrorBanner>

            <div className="vision-conversation-layout vision-conversation-layout--admin">
                <ModelSidebar
                    visibleModels={catalog.visibleModels}
                    selectedFamily={catalog.selectedFamily}
                    setSelectedFamily={catalog.setSelectedFamily}
                />

                <ModelDetailsView
                    details={catalog.details}
                    detailsLoading={catalog.detailsLoading}
                    selectedFamily={catalog.selectedFamily}
                    selectedVariantTag={catalog.selectedVariantTag}
                    selectedVariant={catalog.selectedVariant}
                    setSelectedVariantTag={catalog.setSelectedVariantTag}
                    activeRoles={active}
                    savingTarget={catalog.savingTarget}
                    pullingModel={catalog.pullingModel}
                    pullProgress={catalog.pullProgress}
                    handleSetActive={catalog.handleSetActive}
                    handlePull={catalog.handlePull}
                    handleRemove={catalog.handleRemove}
                />
            </div>
        </section>
    );
}
