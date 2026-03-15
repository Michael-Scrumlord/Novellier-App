import React, { createContext, useContext, useState } from 'react';
import { api } from '../lib/api.js';
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
        selectedModel,
        modelPulling,
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
