import { LoadingState, EmptyState } from './AdminStates.jsx';

function formatGiB(bytes) {
    if (!bytes || bytes <= 0) return '--';
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatRam(estimatedRamGb) {
    if (!estimatedRamGb || estimatedRamGb <= 0) return '--';
    return `${estimatedRamGb.toFixed(1)} GB RAM`;
}

function formatContext(contextWindow) {
    if (!contextWindow) return '--';
    return `${contextWindow} context`;
}

function formatDisk(variant) {
    if (variant.downloaded) return formatGiB(variant.diskSizeBytes);
    return 'Cloud Resource';
}

function VariantHeaderBadges({ variant }) {
    return (
        <div className="vision-details-badges">
            <span className="vision-badge">{formatContext(variant.contextWindow)}</span>
            <span className="vision-badge">{formatRam(variant.estimatedRamGb)}</span>
            <span className="vision-badge">{formatDisk(variant)}</span>
        </div>
    );
}

function ActiveRoleTags({ activeRoles, variantTag }) {
    return (
        <div className="vision-variant-roles">
            {activeRoles.suggestion === variantTag && (
                <span className="vision-badge vision-badge--active vision-badge--small">Suggestion</span>
            )}
            {activeRoles.summary === variantTag && (
                <span className="vision-badge vision-badge--active vision-badge--small">Summary</span>
            )}
            {activeRoles.embedding === variantTag && (
                <span className="vision-badge vision-badge--active vision-badge--small">Embedding</span>
            )}
        </div>
    );
}

function VariantNameCell({ variant, isDefault, activeRoles, onSelect }) {
    return (
        <td className="font-semibold">
            <button type="button" onClick={() => onSelect(variant.tag)} className="vision-variant-btn">
                {variant.tag}
                {isDefault && (
                    <span className="vision-badge vision-badge--small vision-badge--default">Default</span>
                )}
            </button>
            <ActiveRoleTags activeRoles={activeRoles} variantTag={variant.tag} />
        </td>
    );
}

function VariantResourcesCell({ variant }) {
    return (
        <td>
            <div className="vision-variant-resources">
                <span className="text-muted">Ctx: {formatContext(variant.contextWindow)}</span>
                <span className="text-muted">RAM: {formatRam(variant.estimatedRamGb)}</span>
                <span className="text-muted">Disk: {variant.downloaded ? formatGiB(variant.diskSizeBytes) : 'Cloud'}</span>
            </div>
        </td>
    );
}

function DownloadedActions({ variant, activeRoles, savingTarget, handleSetActive, handleRemove }) {
    const isSugg = activeRoles.suggestion === variant.tag;
    const isSumm = activeRoles.summary === variant.tag;
    const isEmb = activeRoles.embedding === variant.tag;
    const isAssignedToAnyRole = isSugg || isSumm || isEmb;
    const isEmbeddingModel = ( // Remember this in case a popular model has an embedding variant that should be assignable to non-embedding roles
        variant.tag.toLowerCase().includes('embed') ||
        variant.tag.toLowerCase() === (activeRoles.embedding || '').toLowerCase()
    );

    const removeTitle = isAssignedToAnyRole ? 'Cannot remove an active model' : 'Remove from server';

    const onAssignChange = (event) => {
        const target = event.target.value;
        if (target) handleSetActive(target, variant.tag);
    };

    return (
        <>
            <div className="vision-select-wrapper">
                <select
                    className="vision-input vision-input--small vision-select"
                    value=""
                    onChange={onAssignChange}
                    disabled={Boolean(savingTarget)}
                >
                    <option value="" disabled>Assign Role...</option>
                    {!isEmbeddingModel && (
                        <option value="suggestion" disabled={isSugg}>Set as Suggestion</option>
                    )}
                    {!isEmbeddingModel && (
                        <option value="summary" disabled={isSumm}>Set as Summary</option>
                    )}
                    <option value="embedding" disabled={isEmb}>Set as Embedding</option>
                </select>
            </div>
            <button
                className="btn btn--glass btn--danger btn--small"
                type="button"
                disabled={isAssignedToAnyRole}
                title={removeTitle}
                onClick={() => handleRemove(variant.tag)}
            >
                Remove
            </button>
        </>
    );
}

function PullButton({ variant, pullingModel, pullProgress, handlePull }) {
    const isPulling = pullingModel === variant.tag;
    const percent = pullProgress?.[variant.tag]?.percent ?? 0;
    const label = isPulling ? `Pulling... ${percent}%` : 'Pull to Server';

    return (
        <button
            className="btn btn--primary btn--small"
            type="button"
            disabled={isPulling}
            onClick={() => handlePull(variant.tag)}
        >
            {label}
        </button>
    );
}

function VariantActionsCell({ children }) {
    return (
        <td className="align-right">
            <div className="vision-variant-actions">
                {children}
            </div>
        </td>
    );
}

function VariantRow({ isSelected, children }) {
    const rowClass = isSelected ? 'vision-table-row active-row' : 'vision-table-row';

    return (
        <tr className={rowClass}>
            {children}
        </tr>
    );
}

export default function ModelDetailsView({
    details,
    detailsLoading,
    selectedFamily,
    selectedVariantTag,
    selectedVariant,
    setSelectedVariantTag,
    activeRoles,
    savingTarget,
    pullingModel,
    pullProgress,
    handleSetActive,
    handlePull,
    handleRemove,
}) {
    return (
        <div className="surface-card vision-conversation-detail">
            <div className="vision-details-header">
                <div>
                    <h3 className="vision-details-title">
                        {details?.displayName || selectedFamily || 'Select a model'}
                    </h3>
                    <p className="text-muted vision-details-subtitle">
                        {details?.description || 'Choose a model family to inspect variants and assign roles.'}
                    </p>
                </div>
                {selectedVariant && <VariantHeaderBadges variant={selectedVariant} />}
            </div>

            {detailsLoading && (
                <div className="vision-loader-container vision-loader--compact">
                    <div className="vision-spinner" />
                    <p>Inspecting variants...</p>
                </div>
            )}

            {!detailsLoading && !details && <EmptyState>No model selected.</EmptyState>}

            {!detailsLoading && details && (
                <div className="vision-table-wrapper">
                    <table className="vision-table">
                        <thead>
                            <tr>
                                <th>Variant Tag</th>
                                <th>Resources</th>
                                <th className="align-right">Actions / Assignment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(details.variants || []).map((variant) => (
                                <VariantRow
                                    key={variant.tag}
                                    isSelected={variant.tag === selectedVariantTag}
                                >
                                    <VariantNameCell
                                        variant={variant}
                                        isDefault={variant.tag === details.selectedVariant?.tag}
                                        activeRoles={activeRoles}
                                        onSelect={setSelectedVariantTag}
                                    />
                                    <VariantResourcesCell variant={variant} />
                                    <VariantActionsCell>
                                        {variant.downloaded ? (
                                            <DownloadedActions
                                                variant={variant}
                                                activeRoles={activeRoles}
                                                savingTarget={savingTarget}
                                                handleSetActive={handleSetActive}
                                                handleRemove={handleRemove}
                                            />
                                        ) : (
                                            <PullButton
                                                variant={variant}
                                                pullingModel={pullingModel}
                                                pullProgress={pullProgress}
                                                handlePull={handlePull}
                                            />
                                        )}
                                    </VariantActionsCell>
                                </VariantRow>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}