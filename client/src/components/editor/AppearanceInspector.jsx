import { useRef } from 'react';
import { createPortal } from 'react-dom';
import './AppearanceInspector.css';

export default function AppearanceInspector({
    isOpen,
    onClose,
    mode,
    titleValue,
    setTitle,
    style,
    setStyle,
    onApply,
}) {
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const isTitle = mode === 'title';
    const updateField = (field, value) => setStyle({ ...style, [field]: value });

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => updateField('imageUrl', event.target.result);
        reader.readAsDataURL(file);
    };

    const handleApply = () => {
        onApply();
        onClose();
    };

    return createPortal(
        <div className="vision-inspector-overlay" onClick={onClose}>
            <div className="vision-inspector-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vision-inspector-header">
                    <h2>{isTitle ? 'Story Title Appearance' : 'Chapter Heading Appearance'}</h2>
                    <button className="vision-inspector-close" onClick={onClose}>✕</button>
                </div>

                <div className="vision-inspector-body">
                    {isTitle && (
                        <div className="vision-inspector-group">
                            <label>Title Text</label>
                            <input
                                type="text"
                                className="vision-inspector-input"
                                value={titleValue || ''}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter story title..."
                            />
                        </div>
                    )}

                    <div className="vision-inspector-row">
                        <div className="vision-inspector-group vision-inspector-group--wide">
                            <label>Font Family</label>
                            <input
                                type="text"
                                className="vision-inspector-input"
                                value={style.font}
                                onChange={(e) => updateField('font', e.target.value)}
                                placeholder="e.g. Cormorant Garamond"
                            />
                        </div>
                        <div className="vision-inspector-group">
                            <label>Font Size</label>
                            <input
                                type="text"
                                className="vision-inspector-input"
                                value={style.size}
                                onChange={(e) => updateField('size', e.target.value)}
                                placeholder="e.g. 2.5rem"
                            />
                        </div>
                        <div className="vision-inspector-group">
                            <label>Color</label>
                            <input
                                type="color"
                                className="vision-inspector-color"
                                value={style.color}
                                onChange={(e) => updateField('color', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="vision-inspector-group">
                        <label>Background Image</label>
                        <div
                            className="vision-inspector-dropzone"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div
                                className="vision-inspector-preview"
                                style={{ backgroundImage: `url(${style.imageUrl || ''})` }}
                            />
                            <span className="vision-inspector-dropzone-text">
                                {style.imageUrl ? 'Click to replace image' : 'Click to upload local image'}
                            </span>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>
                    </div>
                </div>

                <div className="vision-inspector-footer">
                    <button className="btn btn--glass" onClick={onClose}>Cancel</button>
                    <button className="btn btn--primary" onClick={handleApply}>Apply Changes</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
