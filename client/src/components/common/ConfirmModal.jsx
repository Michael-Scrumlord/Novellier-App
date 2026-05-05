import { createPortal } from 'react-dom';
import './ConfirmModal.css';

export default function ConfirmModal({
    isOpen,
    title = 'Confirm',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'danger',
    onConfirm,
    onCancel,
}) {
    if (!isOpen) return null;

    const confirmClass = tone === 'danger' ? 'btn btn--danger' : 'btn btn--primary';

    return createPortal(
        <div className="modal-shell modal-shell--top">
            <div className="confirm-modal-overlay" onClick={onCancel} aria-hidden="true" />
            <div className="confirm-modal-window" role="dialog" aria-modal="true">
                <div className="confirm-modal__header">
                    <h3>{title}</h3>
                </div>
                <div className="confirm-modal__body">
                    <p>{message}</p>
                </div>
                <div className="confirm-modal__footer">
                    <button className="btn btn--glass" type="button" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button className={confirmClass} type="button" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}