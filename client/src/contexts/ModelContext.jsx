import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { MODEL_OPTIONS } from '../constants/models.js';
import { MODEL_KEY } from '../constants/storage.js';
import { useAuthContext } from './AuthContext.jsx';

const ModelContext = createContext(null);

function getInitialModel() {
    return localStorage.getItem(MODEL_KEY) || 'phi3';
}

export function ModelProvider({ children }) {
    const { token } = useAuthContext();
    const [selectedModel, setSelectedModel] = useState(getInitialModel);
    const [modelPulling, setModelPulling] = useState(false);
    const [modelPullStatus, setModelPullStatus] = useState('');
    const [availableModels, setAvailableModels] = useState(MODEL_OPTIONS);

    useEffect(() => {
        if (!token) return;

        const loadModels = async () => {
            try {
                const response = await api.listModels(token);
                const groups = Array.isArray(response?.modelGroups) ? response.modelGroups : [];

                if (groups.length > 0) {
                    setAvailableModels(groups);

                    const allOptions = groups.flatMap((group) => group.options || []);
                    const selectedExists = allOptions.some((option) => option.value === selectedModel);
                    if (!selectedExists && allOptions[0]?.value) {
                        setSelectedModel(allOptions[0].value);
                        localStorage.setItem(MODEL_KEY, allOptions[0].value);
                    }
                }
            } catch (error) {
                console.warn('Unable to load model catalog from server, using fallback list.');
            }
        };

        loadModels();
    }, [token]);

    const setModel = async (value) => {
        setSelectedModel(value);
        localStorage.setItem(MODEL_KEY, value);
        setModelPulling(true);
        setModelPullStatus(`Pulling ${value}...`);
        try {
        if (token) {
            await api.ensureModel(token, value);
            setModelPullStatus(`Warming up ${value}...`);
            await api.warmupModel(token, value);
        }
        setModelPullStatus(`Ready: ${value}`);
        return `Model ready: ${value}`;
        } catch (error) {
        console.error('Model ensure failed:', error);
        setModelPullStatus(`Failed: ${value}`);
        return `Unable to load model: ${value}`;
        } finally {
        setModelPulling(false);
        }
    };

    const value = {
        availableModels,
        selectedModel,
        modelPulling,
        isModelPulling: modelPulling,
        modelPullStatus,
        setModel
    };

    return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
}

export function useModelContext() {
    const ctx = useContext(ModelContext);
    if (!ctx) {
        throw new Error('useModelContext must be used within ModelProvider');
    }
    return ctx;
}
