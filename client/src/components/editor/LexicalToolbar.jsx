import { useEffect, useCallback, useState } from 'react';
import {
    useLexicalComposerContext,
    $getSelection,
    $isRangeSelection,
    FORMAT_TEXT_COMMAND,
    FORMAT_ELEMENT_COMMAND,
    UNDO_COMMAND,
    REDO_COMMAND,
    $createParagraphNode,
    SELECTION_CHANGE_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    $setBlocksType,
    $patchStyleText,
    $getSelectionStyleValueForProperty,
    $createHeadingNode,
    $createQuoteNode,
    $isHeadingNode,
    $isQuoteNode,
    INSERT_UNORDERED_LIST_COMMAND,
    INSERT_ORDERED_LIST_COMMAND,
} from '../../lib/lexical-bundle.js';
import { EDITOR_FONTS, EDITOR_FONT_SIZES, EDITOR_MARGIN_PRESETS } from '../../constants/typography.js';
import './LexicalToolbar.css';

const TEXT_FORMATS = [
    { format: 'bold', icon: 'B', title: 'Bold' },
    { format: 'italic', icon: 'I', title: 'Italic', style: { fontStyle: 'italic' } },
    { format: 'underline', icon: 'U', title: 'Underline', style: { textDecoration: 'underline' } },
    { format: 'strikethrough', icon: 'S', title: 'Strikethrough', style: { textDecoration: 'line-through' } },
];

const ALIGN_FORMATS = [
    { format: 'left', icon: '⬚', title: 'Align Left' },
    { format: 'center', icon: '⬒', title: 'Align Center' },
    { format: 'right', icon: '⬏', title: 'Align Right' },
];

export default function LexicalToolbar({ brightness, onSetBrightness, marginPreset, onSetMarginPreset }) {
    const [editor] = useLexicalComposerContext();

    const [fontFamily, setFontFamily] = useState('inherit');
    const [fontSize, setFontSize] = useState('16px');
    const [blockType, setBlockType] = useState('paragraph');
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [textColor, setTextColor] = useState('#ffffff');
    const [highlightColor, setHighlightColor] = useState('#ffff00');

    const updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            setFontFamily($getSelectionStyleValueForProperty(selection, 'font-family', 'inherit'));
            setFontSize($getSelectionStyleValueForProperty(selection, 'font-size', '16px'));
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));
            setIsStrikethrough(selection.hasFormat('strikethrough'));

            const color = $getSelectionStyleValueForProperty(selection, 'color', '');
            if (color) setTextColor(color);
            const bg = $getSelectionStyleValueForProperty(selection, 'background-color', '');
            if (bg) setHighlightColor(bg);

            const anchorNode = selection.anchor.getNode();
            const element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();

            if ($isHeadingNode(element)) {
                setBlockType(element.getTag());
            } else if ($isQuoteNode(element)) {
                setBlockType('quote');
            } else {
                setBlockType('paragraph');
            }
        }
    }, []);

    useEffect(() => {
        const unregisterUpdate = editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => updateToolbar());
        });

        const unregisterCommand = editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                updateToolbar();
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );

        return () => {
            unregisterUpdate();
            unregisterCommand();
        };
    }, [editor, updateToolbar]);

    const formatText = (format) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    const formatAlign = (alignment) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);

    const applyStyle = useCallback((styleProperty, value) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { [styleProperty]: value });
            }
        });
    }, [editor]);

    const formatBlock = (newBlockType) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            if (newBlockType === 'paragraph') $setBlocksType(selection, () => $createParagraphNode());
            else if (newBlockType.startsWith('h')) $setBlocksType(selection, () => $createHeadingNode(newBlockType));
            else if (newBlockType === 'quote') $setBlocksType(selection, () => $createQuoteNode());
        });
    };

    return (
        <div className="editor-toolbar glass-card">
            <div className="toolbar-group">
                <button className="btn btn--glass btn--icon" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo">↺</button>
                <button className="btn btn--glass btn--icon" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo">↻</button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <select className="spatial-select spatial-select--small" value={blockType} onChange={(e) => formatBlock(e.target.value)}>
                    <option value="paragraph">Normal Text</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="quote">Quote</option>
                </select>

                <select className="spatial-select spatial-select--small" value={fontFamily} onChange={(e) => applyStyle('font-family', e.target.value)}>
                    {EDITOR_FONTS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                </select>

                <select className="spatial-select spatial-select--small" value={fontSize} onChange={(e) => applyStyle('font-size', e.target.value)}>
                    {EDITOR_FONT_SIZES.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
                </select>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                {TEXT_FORMATS.map(({ format, icon, title, style }) => {
                    const activeMap = { bold: isBold, italic: isItalic, underline: isUnderline, strikethrough: isStrikethrough };
                    const isActive = activeMap[format];
                    return (
                        <button
                            key={format}
                            className={`btn btn--glass btn--icon${isActive ? ' btn--active' : ''}`}
                            onClick={() => formatText(format)}
                            title={title}
                            style={style}
                        >
                            {icon}
                        </button>
                    );
                })}
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <label className="color-picker-wrapper" title="Text Color">
                    <span className="color-picker-icon">A</span>
                    <input type="color" className="color-input" value={textColor} onChange={(e) => { setTextColor(e.target.value); applyStyle('color', e.target.value); }} />
                </label>
                <label className="color-picker-wrapper" title="Highlight Color">
                    <span className="color-picker-icon" style={{ background: 'var(--accent-soft)' }}>H</span>
                    <input type="color" className="color-input" value={highlightColor} onChange={(e) => { setHighlightColor(e.target.value); applyStyle('background-color', e.target.value); }} />
                </label>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                {ALIGN_FORMATS.map(({ format, icon, title }) => (
                    <button key={format} className="btn btn--glass btn--icon" onClick={() => formatAlign(format)} title={title}>
                        {icon}
                    </button>
                ))}
                <button
                    className="btn btn--glass btn--icon"
                    onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
                    title="Bullet List"
                >
                    •
                </button>
                <button
                    className="btn btn--glass btn--icon"
                    onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
                    title="Numbered List"
                >
                    1.
                </button>
            </div>

            <div className="toolbar-spacer" />

            <div className="toolbar-group">
                <select
                    className="spatial-select spatial-select--small"
                    value={marginPreset}
                    onChange={(e) => onSetMarginPreset(e.target.value)}
                    title="Page margins"
                >
                    {EDITOR_MARGIN_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
            </div>

            <div className="toolbar-divider" />

            <div className="brightness-slider-wrap" title="Adjust editor brightness">
                <input
                    id="editor-brightness-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={brightness}
                    onChange={(e) => onSetBrightness(Number(e.target.value))}
                    className="brightness-slider"
                    aria-label="Editor brightness"
                />
                <span className="brightness-slider__label">
                    {brightness < 50 ? 'Dark' : 'Light'}
                </span>
            </div>
        </div>
    );
}