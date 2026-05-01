import { useState } from 'react';
import ConfirmModal from '../../common/ConfirmModal.jsx';
import './FactsPanel.css';

export default function FactsPanel({ facts, onUpdateFacts }) {
    const [expanded, setExpanded] = useState(false);
    const [factInput, setFactInput] = useState('');
    const [pendingDeleteIdx, setPendingDeleteIdx] = useState(null);

    const handleDeleteConfirmed = () => {
        if (pendingDeleteIdx === null) return;
        const newFacts = [...facts];
        newFacts.splice(pendingDeleteIdx, 1);
        onUpdateFacts(newFacts);
        setPendingDeleteIdx(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!factInput.trim()) return;
        onUpdateFacts([...facts, factInput.trim()]);
        setFactInput('');
    };

    return (
        <div className="beat-group">
            <button
                className={`beat-group__header row${expanded ? ' beat-group__header--active' : ''}`}
                onClick={() => setExpanded(!expanded)}
            >
                <span className="beat-group__label">World Facts Database</span>
                <div className="beat-group__actions">
                    <span className={`beat-group__toggle${expanded ? ' beat-group__toggle--expanded' : ' beat-group__toggle--collapsed'}`}>
                        ▾
                    </span>
                </div>
            </button>

            {expanded && (
                <div className="facts-panel__body">
                    <ul className="facts-panel__list">
                        {facts?.length > 0 ? (
                            facts.map((fact, idx) => (
                                <li key={idx} className="facts-panel__item">
                                    <button
                                        className="facts-panel__delete"
                                        onClick={(e) => { e.stopPropagation(); setPendingDeleteIdx(idx); }}
                                        title="Remove fact"
                                    >
                                        ✕
                                    </button>
                                    <span className="facts-panel__text">{fact}</span>
                                </li>
                            ))
                        ) : (
                            <li className="facts-panel__empty">No continuity facts established yet.</li>
                        )}
                    </ul>
                    <form className="facts-panel__form" onSubmit={handleSubmit}>
                        <input
                            className="facts-panel__input"
                            type="text"
                            value={factInput}
                            onChange={(e) => setFactInput(e.target.value)}
                            placeholder="Add a fact…"
                        />
                        <button type="submit" className="facts-panel__add">+</button>
                    </form>
                </div>
            )}

            <ConfirmModal
                isOpen={pendingDeleteIdx !== null}
                title="Remove Fact"
                message="Are you sure you want to remove this fact from the continuity database?"
                confirmLabel="Remove"
                tone="danger"
                onConfirm={handleDeleteConfirmed}
                onCancel={() => setPendingDeleteIdx(null)}
            />
        </div>
    );
}
