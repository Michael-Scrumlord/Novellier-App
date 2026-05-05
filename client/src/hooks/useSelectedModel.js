import { useCallback, useEffect, useState } from 'react';
import { llmProvider } from '../services/llmProvider.js';
import { MODEL_KEY } from '../constants/storage.js';
import { DEFAULT_MODEL } from '../constants/ai.js';
import { useAuthContext } from '../contexts/AuthContext.jsx';

const EMPTY_GROUPS = [];

function isEmbedding(value) {
    return /embed/i.test(value || '');
}

function pickFallback(allOptions) {
    const generative = allOptions.filter((o) => !isEmbedding(o.value));
    return generative[0]?.value || allOptions[0]?.value || '';
}

export function useSelectedModel() {
    const { token } = useAuthContext();
    const [selectedModel, setSelected] = useState(() => localStorage.getItem(MODEL_KEY) || '');
    const [availableModels, setAvailableModels] = useState(EMPTY_GROUPS);

    const refresh = useCallback(async () => {
        if (!token) return;
        try {
            const response = await llmProvider.listModels(token);
            const groups = Array.isArray(response?.modelGroups) ? response.modelGroups : EMPTY_GROUPS;
            setAvailableModels(groups);

            const allOptions = groups.flatMap((g) => g.options || []);
            const allValues = new Set(allOptions.map((o) => o.value));

            let preferred = '';
            try {
                const config = await llmProvider.getModelConfig(token);
                if (config?.active?.suggestion) preferred = config.active.suggestion;
            } catch {
                // Config unavailable; fall back to localStorage choice.
            }
            if (!preferred) preferred = localStorage.getItem(MODEL_KEY) || '';

            const next = allValues.has(preferred) && !isEmbedding(preferred)
                ? preferred
                : (allValues.has(DEFAULT_MODEL) ? DEFAULT_MODEL : pickFallback(allOptions));

            if (next) {
                setSelected(next);
                localStorage.setItem(MODEL_KEY, next);
            }
        } catch {
            console.warn('Unable to load model catalog.');
        }
    }, [token]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const setModel = useCallback((value) => {
        setSelected(value);
        localStorage.setItem(MODEL_KEY, value);
    }, []);

    return { selectedModel, availableModels, setModel, refresh };
}
