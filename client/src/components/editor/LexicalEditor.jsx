import React, { useEffect, useRef, useCallback } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getRoot, $getSelection, $isRangeSelection,
    FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND,
    UNDO_COMMAND, REDO_COMMAND,
    $createParagraphNode, $createTextNode
} from 'lexical';
import { $setBlocksType, $patchStyleText } from '@lexical/selection';
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { AutoLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import './LexicalEditor.css'; 
import { EDITOR_FONTS, EDITOR_FONT_SIZES } from '../../constants/typography.js';

const editorConfig = {
    namespace: 'NovellierEditor',
    theme: {
        text: {
            bold: 'text-bold',
            italic: 'text-italic',
            underline: 'text-underline',
            strikethrough: 'text-strikethrough',
        },
        paragraph: 'editor-paragraph',
        heading: {
            h1: 'editor-h1', h2: 'editor-h2', h3: 'editor-h3',
        },
        list: {
            ul: 'editor-ul', ol: 'editor-ol', listitem: 'editor-listitem',
        },
        quote: 'editor-quote',
        link: 'editor-link',
    },
    nodes: [HeadingNode, ListNode, ListItemNode, QuoteNode, AutoLinkNode, LinkNode],
    onError: (error) => console.error('Lexical Engine Error:', error),
};

function SpatialToolbarPlugin() {
    const [editor] = useLexicalComposerContext();

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

    const formatBlock = (blockType) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            if (blockType === 'paragraph') $setBlocksType(selection, () => $createParagraphNode());
            else if (blockType.startsWith('h')) $setBlocksType(selection, () => $createHeadingNode(blockType));
            else if (blockType === 'quote') $setBlocksType(selection, () => $createQuoteNode());
        });
    };

    return (
        <div className="editor-toolbar glass-card">
            {/* History Group */}
            <div className="toolbar-group">
                <button className="btn btn--glass btn--icon" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo">↺</button>
                <button className="btn btn--glass btn--icon" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo">↻</button>
            </div>

            <div className="toolbar-divider" />

            {/* Typography Group */}
            <div className="toolbar-group">
              <select className="spatial-select spatial-select--small" onChange={(e) => formatBlock(e.target.value)} defaultValue="paragraph">
                <option value="paragraph">Normal Text</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="quote">Quote</option>
              </select>
              
              {/* Font Family Dropdown */}
              <select className="spatial-select spatial-select--small" onChange={(e) => applyStyle('font-family', e.target.value)} defaultValue="inherit">
                {EDITOR_FONTS.map(font => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>

              {/* Font Size Dropdown */}
              <select className="spatial-select spatial-select--small" onChange={(e) => applyStyle('font-size', e.target.value)} defaultValue="16px">
                {EDITOR_FONT_SIZES.map(size => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
            </div>

            <div className="toolbar-divider" />

            {/* Formatting Group */}
            <div className="toolbar-group">
                <button className="btn btn--glass btn--icon" onClick={() => formatText('bold')} title="Bold">B</button>
                <button className="btn btn--glass btn--icon" onClick={() => formatText('italic')} title="Italic" style={{fontStyle: 'italic'}}>I</button>
                <button className="btn btn--glass btn--icon" onClick={() => formatText('underline')} title="Underline" style={{textDecoration: 'underline'}}>U</button>
                <button className="btn btn--glass btn--icon" onClick={() => formatText('strikethrough')} title="Strikethrough" style={{textDecoration: 'line-through'}}>S</button>
            </div>

            <div className="toolbar-divider" />

            {/* Color Group */}
            <div className="toolbar-group">
                <label className="color-picker-wrapper" title="Text Color">
                    <span className="color-picker-icon">A</span>
                    <input type="color" className="color-input" onChange={(e) => applyStyle('color', e.target.value)} />
                </label>
                <label className="color-picker-wrapper" title="Highlight Color">
                    <span className="color-picker-icon" style={{background: 'var(--accent-soft)'}}>H</span>
                    <input type="color" className="color-input" onChange={(e) => applyStyle('background-color', e.target.value)} />
                </label>
            </div>

            <div className="toolbar-divider" />

            {/* Alignment Group */}
            <div className="toolbar-group">
              <button className="btn btn--glass btn--icon" onClick={() => formatAlign('left')} title="Align Left">⬚</button>
              <button className="btn btn--glass btn--icon" onClick={() => formatAlign('center')} title="Align Center">⬒</button>
              <button className="btn btn--glass btn--icon" onClick={() => formatAlign('right')} title="Align Right">⬏</button>
              <button className="btn btn--glass btn--icon" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} title="Bullet List">•</button>
            </div>
        </div>
    );
}

function EditorSyncPlugin({ value, onChange }) {
    const [editor] = useLexicalComposerContext();
    
    const lastEditorStateString = useRef(null);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

            const stringifiedState = JSON.stringify(editorState.toJSON());
            
            lastEditorStateString.current = stringifiedState;
            
            if (typeof onChange === 'function') {
                onChange(stringifiedState);
          }
        });
  }, [editor, onChange]);

    useEffect(() => {
        if (value === lastEditorStateString.current) return;
        lastEditorStateString.current = value;

        if (!value || value === '{}' || value.trim() === '') {
            editor.update(() => $getRoot().clear());
            return;
        }

        try {
            const parsedState = JSON.parse(value);
            if (parsedState && parsedState.root) {
                editor.setEditorState(editor.parseEditorState(value));
            }
        } catch (e) {
            editor.update(() => {
                const root = $getRoot();
                root.clear();
                value.split('\n').filter(line => line.trim() !== '').forEach(line => {
                    const p = $createParagraphNode();
                    p.append($createTextNode(line));
                    root.append(p);
                });
            });
        }
    }, [editor, value]);

    return null;
}

export default function LexicalEditor({ value, onChange, placeholder }) {
    return (
        <div className="lexical-wrapper">
            <LexicalComposer initialConfig={{ ...editorConfig, editorState: () => $getRoot().clear() }}>
                <SpatialToolbarPlugin />
                <div className="lexical-canvas">
                    <RichTextPlugin
                        contentEditable={<ContentEditable className="lexical-input" />}
                        placeholder={<div className="lexical-placeholder">{placeholder}</div>}
                    />
                    <HistoryPlugin />
                    <AutoFocusPlugin />
                    <ListPlugin />
                    <LinkPlugin />
                    <EditorSyncPlugin value={value} onChange={onChange} />
                </div>
            </LexicalComposer>
        </div>
    );
}

export function getTextFromLexicalState(content) {
    try {
        if (!content) return '';
        const state = JSON.parse(content);
        let text = '';
        const extractText = (nodes) => {
            if (!Array.isArray(nodes)) return;
            nodes.forEach((node) => {
                if (node.text) text += node.text;
                if (node.children) extractText(node.children);
            });
        };
        extractText(state.root?.children);
        return text;
    } catch {
        return typeof content === 'string' ? content : '';
    }
}

export function getWordCount(content) {
    const text = getTextFromLexicalState(content);
    return text.trim() ? text.trim().split(/\s+/).length : 0;
}