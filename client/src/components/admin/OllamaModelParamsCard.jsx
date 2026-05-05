import { useEffect, useState } from 'react';
import { llmProvider } from '../../services/llmProvider.js';
import { InlineBanner } from './AdminStates.jsx';

const SAVED_FLASH_DURATION_MS = 6000;

const PARAM_META = [
    {
        key: 'temperature',
        label: 'Temperature',
        description: 'Controls randomness. Lower values produce focused, deterministic output; higher values produce creative variation.',
        type: 'slider',
        min: 0, max: 2, step: 0.05,
        format: (v) => v.toFixed(2),
    },
    {
        key: 'num_predict',
        label: 'Max Tokens',
        description: 'Maximum number of tokens generated per response. Higher values allow longer output.',
        type: 'number',
        min: 50, max: 8192, step: 1,
    },
    {
        key: 'num_ctx',
        label: 'Context Window',
        description: 'Context size in tokens. Higher values retain more conversation history but require more VRAM.',
        type: 'number',
        min: 512, max: 32768, step: 512,
    },
    {
        key: 'num_gpu',
        label: 'GPU Layers',
        description: 'Number of model layers offloaded to GPU. Set to 0 for CPU-only inference.',
        type: 'number',
        min: 0, max: 128, step: 1,
    },
    {
        key: 'top_k',
        label: 'Top K',
        description: 'Limits the token candidate pool per step. Lower values produce more conservative output.',
        type: 'slider',
        min: 1, max: 100, step: 1,
        format: (v) => String(Math.round(v)),
    },
    {
        key: 'top_p',
        label: 'Top P',
        description: 'Nucleus sampling threshold. Keeps the smallest set of tokens whose cumulative probability meets this value.',
        type: 'slider',
        min: 0, max: 1, step: 0.01,
        format: (v) => v.toFixed(2),
    },
    {
        key: 'repeat_penalty',
        label: 'Repeat Penalty',
        description: 'Penalizes recently used tokens to reduce repetition. Increase if the model starts looping.',
        type: 'slider',
        min: 1, max: 2, step: 0.05,
        format: (v) => v.toFixed(2),
    },
];

const EMPTY_PARAMS = {
    temperature: 0.8,
    num_predict: 150,
    num_ctx: 2048,
    num_gpu: 1,
    top_k: 40,
    top_p: 0.9,
    repeat_penalty: 1.1,
};

function ParamRow({ meta, value, defaults, onChange }) {
    const { key, label, description, type, min, max, step, format } = meta;
    const display = value ?? EMPTY_PARAMS[key];
    const defaultVal = defaults?.[key];
    const isOverridden = defaultVal != null && display !== defaultVal;

    const handleSliderChange = (e) => onChange(key, Number(e.target.value));
    const handleNumberChange = (e) => {
        const n = Number(e.target.value);
        if (!Number.isNaN(n)) onChange(key, n);
    };

    return (
        <div className="vision-param-row">
            <div className="vision-param-meta">
                <span className="vision-param-label">{label}</span>
                {isOverridden && (
                    <span className="vision-param-default">default: {format ? format(defaultVal) : defaultVal}</span>
                )}
                <p className="vision-param-desc">{description}</p>
            </div>
            <div className="vision-param-control">
                {type === 'slider' ? (
                    <>
                        <input
                            type="range"
                            className="vision-param-slider"
                            min={min} max={max} step={step}
                            value={display}
                            onChange={handleSliderChange}
                        />
                        <input
                            type="number"
                            className="vision-input vision-input--nano"
                            min={min} max={max} step={step}
                            value={format ? format(display) : display}
                            onChange={handleNumberChange}
                        />
                    </>
                ) : (
                    <input
                        type="number"
                        className="vision-input vision-input--small"
                        style={{ width: '7.5rem' }}
                        min={min} max={max} step={step}
                        value={display}
                        onChange={handleNumberChange}
                    />
                )}
            </div>
        </div>
    );
}

function CardHeader() {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="eyebrow vision-stat-label">Model Parameters</span>
        </div>
    );
}

export default function OllamaModelParamsCard({ token }) {
    const [params, setParams] = useState(EMPTY_PARAMS);
    const [defaults, setDefaults] = useState({});
    const [draft, setDraft] = useState(EMPTY_PARAMS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [savedFlash, setSavedFlash] = useState(false);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;

        llmProvider.getLlmModelParams(token)
            .then((result) => {
                if (cancelled) return;
                const effective = { ...EMPTY_PARAMS, ...result.params };
                setParams(effective);
                setDraft(effective);
                setDefaults(result.defaults || {});
                setError('');
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Unable to load model parameters');
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [token]);

    const isDirty = PARAM_META.some(({ key }) => draft[key] !== params[key]);

    const handleChange = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
    const handleRevert = () => setDraft(params);

    const flash = () => {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), SAVED_FLASH_DURATION_MS);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const result = await llmProvider.setLlmModelParams(token, draft);
            const effective = { ...EMPTY_PARAMS, ...result.params };
            setParams(effective);
            setDraft(effective);
            flash();
        } catch (err) {
            setError(err.message || 'Unable to save parameters');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setSaving(true);
        setError('');
        try {
            const result = await llmProvider.resetLlmModelParams(token);
            const effective = { ...EMPTY_PARAMS, ...result.params };
            setParams(effective);
            setDraft(effective);
            flash();
        } catch (err) {
            setError(err.message || 'Unable to reset parameters');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="surface-card surface-card--hoverable vision-stat-card vision-stat-card--span-all">
                <span className="eyebrow vision-stat-label">Model Parameters</span>
                <span className="vision-stat-value" style={{ fontSize: '0.95rem' }}>Loading...</span>
            </div>
        );
    }

    return (
        <div
            className="surface-card surface-card--hoverable vision-stat-card vision-stat-card--span-all"
            style={{ gap: '0.75rem', padding: '1.1rem 1.25rem' }}
        >
            <CardHeader />

            <div className="vision-param-grid">
                {PARAM_META.map((meta) => (
                    <ParamRow
                        key={meta.key}
                        meta={meta}
                        value={draft[meta.key]}
                        defaults={defaults}
                        onChange={handleChange}
                    />
                ))}
            </div>

            <div className="vision-param-actions">
                <button
                    type="button"
                    className="btn btn--glass btn--small"
                    onClick={handleReset}
                    disabled={saving}
                >
                    Reset to defaults
                </button>
                <div style={{ flex: 1 }} />
                {isDirty && (
                    <button type="button" className="btn btn--glass btn--small" onClick={handleRevert}>
                        Revert
                    </button>
                )}
                <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {savedFlash && <InlineBanner variant="success">✓ Saved. Parameters are now active.</InlineBanner>}
            {error && (
                <div className="vision-error-banner" style={{ margin: 0, fontSize: '0.85rem' }}>{error}</div>
            )}
        </div>
    );
}