import { useEffect, useState } from 'react';
import { llmProvider } from '../../services/llmProvider.js';
import { InlineBanner } from './AdminStates.jsx';

const EMPTY_ENDPOINT = {
    url: '',
    fallbackUrl: '',
    source: 'env',
    observed: { llmAdapter: null, chromaAdapter: null },
    inSync: true,
};

const SAVED_FLASH_DURATION_MS = 6000;

const CARD_STYLE = {
    alignItems: 'stretch',
    gap: '0.6rem',
    padding: '1.1rem 1.25rem',
};

const HEADER_ROW_STYLE = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: '0.5rem',
};

const INPUT_ROW_STYLE = {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
};

function describeSource(source) {
    if (source === 'db') return 'admin panel';
    return 'env OLLAMA_URL';
}

function CardHeader({ activeUrl, source }) {
    return (
        <div style={HEADER_ROW_STYLE}>
            <span className="eyebrow vision-stat-label">Ollama Endpoint</span>
            <span className="vision-stat-label" style={{ fontSize: '0.7rem', opacity: 0.75 }}>
                active: <code>{activeUrl}</code> • source: {describeSource(source)}
            </span>
        </div>
    );
}

function EditorRow({ draftUrl, onChangeDraft, onTest, onSave, onRevert, isDirty, testing, saving }) {
    const inputStyle = { flex: 1, fontFamily: 'monospace', fontSize: '0.9rem' };
    const trimmed = draftUrl.trim();

    return (
        <div style={INPUT_ROW_STYLE}>
            <input
                className="vision-input"
                style={inputStyle}
                value={draftUrl}
                onChange={(event) => onChangeDraft(event.target.value)}
                placeholder="http://host.docker.internal:11434"
                spellCheck={false}
            />
            <button type="button" className="btn btn--glass" onClick={onTest} disabled={!trimmed || testing}>
                {testing ? 'Testing...' : 'Test'}
            </button>
            <button type="button" className="btn btn--primary" onClick={onSave} disabled={!isDirty || !trimmed || saving}>
                {saving ? 'Saving...' : 'Save'}
            </button>
            {isDirty && (
                <button type="button" className="btn btn--glass" onClick={onRevert}>
                    Revert
                </button>
            )}
        </div>
    );
}

function HelpText({ fallbackUrl }) {
    const style = { margin: 0, fontSize: '0.74rem', lineHeight: 1.4 };
    return (
        <p className="text-muted" style={style}>
            env default: <code>{fallbackUrl}</code> ·
            If Ollama runs on your Mac outside Docker, use{' '}
            <code>http://host.docker.internal:11434</code> (Docker Desktop) or your LAN IP.
        </p>
    );
}

function DriftBanner({ observed }) {
    return (
        <InlineBanner variant="warning">
            ⚠ Adapter drift: configured URL does not match live adapter state.
            {observed && (
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
                    llm: {observed.llmAdapter || '—'} · chroma: {observed.chromaAdapter || '—'}
                </div>
            )}
        </InlineBanner>
    );
}

function SavedFlashBanner({ flash }) {
    if (flash.inSync) {
        return <InlineBanner variant="success">✓ Saved. Active URL is now {flash.url}</InlineBanner>;
    }
    return <InlineBanner variant="warning">⚠ Saved but adapters did not update. See drift warning above.</InlineBanner>;
}

function TestResultBanner({ result, isDirty }) {
    if (!result.ok) {
        return <InlineBanner variant="error">✕ {result.error || 'Connection failed'}</InlineBanner>;
    }

    const modelLabel = result.modelCount === 1 ? 'model' : 'models';
    const persistHint = isDirty ? 'Click Save to persist.' : '';
    return (
        <InlineBanner variant="success">
            ✓ Connected — {result.modelCount} {modelLabel} installed at {result.url}. {persistHint}
        </InlineBanner>
    );
}

export default function OllamaEndpointCard({ token, onEndpointChanged }) {
    const [endpoint, setEndpoint] = useState(EMPTY_ENDPOINT);
    const [draftUrl, setDraftUrl] = useState('');
    const [testResult, setTestResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState('');
    const [savedFlash, setSavedFlash] = useState(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;

        const load = async () => {
            try {
                const result = await llmProvider.getEndpoint(token);
                if (cancelled) return;
                setEndpoint({ ...EMPTY_ENDPOINT, ...result });
                setDraftUrl(result.url || '');
                setError('');
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'Unable to load Ollama endpoint');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();
        return () => { cancelled = true; };
    }, [token]);

    const isDirty = draftUrl.trim() !== (endpoint.url || '').trim();

    const handleChangeDraft = (next) => {
        setDraftUrl(next);
        setTestResult(null);
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await llmProvider.testEndpoint(token, draftUrl);
            setTestResult(result);
        } catch (err) {
            setTestResult({ ok: false, error: err.message || 'Test failed' });
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSavedFlash(null);
        try {
            const result = await llmProvider.setEndpoint(token, draftUrl);
            const merged = { ...EMPTY_ENDPOINT, ...result };
            setEndpoint(merged);
            setDraftUrl(merged.url || draftUrl);
            setSavedFlash({
                url: merged.url || draftUrl,
                inSync: merged.inSync !== false,
                observed: merged.observed || null,
            });
            onEndpointChanged?.();
            setTimeout(() => setSavedFlash(null), SAVED_FLASH_DURATION_MS);
        } catch (err) {
            setError(err.message || 'Unable to save endpoint');
        } finally {
            setSaving(false);
        }
    };

    const handleRevert = () => {
        setDraftUrl(endpoint.url || '');
        setTestResult(null);
    };

    if (loading) {
        return (
            <div className="surface-card surface-card--hoverable vision-stat-card vision-stat-card--span-all">
                <span className="eyebrow vision-stat-label">Ollama Endpoint</span>
                <span className="vision-stat-value" style={{ fontSize: '0.95rem' }}>Loading...</span>
            </div>
        );
    }

    return (
        <div className="surface-card surface-card--hoverable vision-stat-card vision-stat-card--span-all" style={CARD_STYLE}>
            <CardHeader activeUrl={endpoint.url} source={endpoint.source} />

            <EditorRow
                draftUrl={draftUrl}
                onChangeDraft={handleChangeDraft}
                onTest={handleTest}
                onSave={handleSave}
                onRevert={handleRevert}
                isDirty={isDirty}
                testing={testing}
                saving={saving}
            />

            <HelpText fallbackUrl={endpoint.fallbackUrl} />

            {endpoint.inSync === false && <DriftBanner observed={endpoint.observed} />}
            {savedFlash && <SavedFlashBanner flash={savedFlash} />}
            {testResult && <TestResultBanner result={testResult} isDirty={isDirty} />}
            {error && <div className="vision-error-banner" style={{ margin: 0, fontSize: '0.85rem' }}>{error}</div>}
        </div>
    );
}