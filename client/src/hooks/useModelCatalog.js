import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { llmProvider } from '../services/llmProvider.js';
import { useSelectedModel } from './useSelectedModel.js';
import {
    filterAndSortModels,
    pickInitialFamily,
    pickInitialVariant,
    resolveSelectedVariant,
} from '../lib/modelCatalogSelectors.js';

export function useModelCatalog(token) {
    const { refresh: refreshModels } = useSelectedModel();

    const [catalog, setCatalog] = useState({ active: {}, models: [] });
    const [details, setDetails] = useState(null);
    const [selectedFamily, setSelectedFamily] = useState('');
    const [selectedVariantTag, setSelectedVariantTag] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [error, setError] = useState('');
    const [savingTarget, setSavingTarget] = useState('');
    const [pullingModel, setPullingModel] = useState('');
    const [pullProgress, setPullProgress] = useState({});

    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        llmProvider.getModelCatalog(token, deferredSearchQuery)
            .then((response) => {
                if (cancelled) return;
                const models = Array.isArray(response?.models) ? response.models : [];
                setCatalog({ active: response?.active || {}, models });
                setSelectedFamily((current) => pickInitialFamily(models, current));
                setError('');
            })
            .catch((err) => { if (!cancelled) setError(err.message || 'Unable to load model catalog'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [token, deferredSearchQuery]);

    useEffect(() => {
        if (!token || !selectedFamily) {
            setDetails(null);
            setSelectedVariantTag('');
            return;
        }
        let cancelled = false;
        setDetailsLoading(true);
        llmProvider.getModelDetails(token, selectedFamily)
            .then((response) => {
                if (cancelled) return;
                const next = response?.details || null;
                setDetails(next);
                setSelectedVariantTag((current) => pickInitialVariant(next, current));
                setError('');
            })
            .catch((err) => { if (!cancelled) setError(err.message || 'Unable to load model details'); })
            .finally(() => { if (!cancelled) setDetailsLoading(false); });
        return () => { cancelled = true; };
    }, [token, selectedFamily]);

    const refreshAll = useCallback(async () => {
        await refreshModels();
        const response = await llmProvider.getModelCatalog(token, deferredSearchQuery);
        const models = Array.isArray(response?.models) ? response.models : [];
        setCatalog({ active: response?.active || {}, models });
        setSelectedFamily((current) => pickInitialFamily(models, current));
        if (selectedFamily) {
            const detailsResponse = await llmProvider.getModelDetails(token, selectedFamily);
            const next = detailsResponse?.details || null;
            setDetails(next);
            setSelectedVariantTag((current) => pickInitialVariant(next, current));
        }
    }, [refreshModels, token, deferredSearchQuery, selectedFamily]);

    const handleSetActive = useCallback(async (target, model) => {
        if (!model) return;
        setError('');
        setSavingTarget(target);
        try {
            await llmProvider.setActiveModel(token, target, model);
            await refreshAll();
        } catch (err) {
            setError(err.message || 'Unable to set active model');
        } finally {
            setSavingTarget('');
        }
    }, [token, refreshAll]);

    const handlePull = useCallback(async (model) => {
        setError('');
        setPullingModel(model);
        try {
            await llmProvider.pullModel(token, model);
            await llmProvider.pollPullCompletion(token, model, {
                onProgress: (progress) => {
                    if (progress) setPullProgress((prev) => ({ ...prev, [model]: progress }));
                },
            });
            await refreshAll();
        } catch (err) {
            setError(err.message || 'Unable to start pull');
        } finally {
            setPullProgress((prev) => {
                const next = { ...prev };
                delete next[model];
                return next;
            });
            setPullingModel('');
        }
    }, [token, refreshAll]);

    const handleRemove = useCallback(async (model) => {
        if (!window.confirm(`Remove ${model}?`)) return;
        setError('');
        try {
            await llmProvider.removeModel(token, model);
            await refreshAll();
        } catch (err) {
            setError(err.message || 'Unable to remove model');
        }
    }, [token, refreshAll]);

    const visibleModels = useMemo(
        () => filterAndSortModels(catalog.models, deferredSearchQuery),
        [catalog.models, deferredSearchQuery]
    );

    const selectedVariant = useMemo(
        () => resolveSelectedVariant(details, selectedVariantTag),
        [details, selectedVariantTag]
    );

    const onEndpointChanged = useCallback(() => {
        refreshAll();
    }, [refreshAll]);

    return {
        catalog, details, loading, detailsLoading, error,
        searchQuery, selectedFamily, selectedVariantTag, selectedVariant,
        savingTarget, pullingModel, pullProgress, visibleModels,
        setSearchQuery, setSelectedFamily, setSelectedVariantTag,
        handleSetActive, handlePull, handleRemove, onEndpointChanged,
    };
}
