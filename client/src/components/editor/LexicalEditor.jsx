import { useEffect, useRef, useState } from 'react';
import {
    LexicalComposer,
    RichTextPlugin,
    ContentEditable,
    HistoryPlugin,
    AutoFocusPlugin,
    ListPlugin,
    LinkPlugin,
    TabIndentationPlugin,
    useLexicalComposerContext,
    $getRoot,
    $createParagraphNode,
    $createTextNode,
    $getSelection,
    $isRangeSelection,
    KEY_TAB_COMMAND,
    COMMAND_PRIORITY_LOW,
    $createTabNode,
    TabNode,
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    AutoLinkNode,
    LinkNode,
} from '../../lib/lexical-bundle.js';
import LexicalToolbar from './LexicalToolbar.jsx';
import { EDITOR_MARGIN_PRESETS } from '../../constants/typography.js';
import './LexicalEditor.css';

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
            h1: 'editor-h1',
            h2: 'editor-h2',
            h3: 'editor-h3',
        },
        list: {
            ul: 'editor-ul',
            ol: 'editor-ol',
            listitem: 'editor-listitem',
        },
        quote: 'editor-quote',
        link: 'editor-link',
    },
    nodes: [HeadingNode, ListNode, ListItemNode, QuoteNode, AutoLinkNode, LinkNode, TabNode],
    onError: (error) => console.error('Lexical Engine Error:', error),
};

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
                value
                    .split('\n')
                    .filter((line) => line.trim() !== '')
                    .forEach((line) => {
                        const p = $createParagraphNode();
                        p.append($createTextNode(line));
                        root.append(p);
                    });
            });
        }
    }, [editor, value]);

    return null;
}

function TabPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(
            KEY_TAB_COMMAND,
            (event) => {
                event.preventDefault();
                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        selection.insertNodes([$createTabNode()]);
                    }
                });
                return true;
            },
            COMMAND_PRIORITY_LOW
        );
    }, [editor]);

    return null;
}

export default function LexicalEditor({ value, onChange, placeholder }) {
    const [brightness, setBrightness] = useState(0);
    const [marginPreset, setMarginPreset] = useState('normal');

    // Toolbar switches to light appearance only when the page is clearly bright.
    const editorMode = brightness >= 80 ? 'light' : 'dark';
    const margin = EDITOR_MARGIN_PRESETS.find((p) => p.value === marginPreset) ?? EDITOR_MARGIN_PRESETS[0];

    // Drive page background and text independently so they move in opposite directions.
    // At 0: black page, near-white lightweight text. At 100: white page, near-black bold text.
    const pageBg = `hsl(0, 0%, ${brightness}%)`;
    const textColor = `hsl(0, 0%, ${Math.round((100 - brightness) * 0.92)}%)`;
    const fontWeight = Math.round(400 + (brightness / 100) * 300);

    return (
        <div
            className="lexical-wrapper"
            data-editor-mode={editorMode}
            style={{
                '--editor-brightness': brightness,
                '--page-bg': pageBg,
                '--editor-text-color': textColor,
                '--editor-font-weight': fontWeight,
            }}
        >
            <LexicalComposer
                initialConfig={{ ...editorConfig, editorState: () => $getRoot().clear() }}
            >
                <LexicalToolbar
                    brightness={brightness}
                    onSetBrightness={setBrightness}
                    marginPreset={marginPreset}
                    onSetMarginPreset={setMarginPreset}
                />
                <div className="lexical-canvas">
                    <div
                        className="editor-page"
                        style={{
                            '--page-margin-v': `${margin.v}px`,
                            '--page-margin-h': `${margin.h}px`,
                        }}
                    >
                        <RichTextPlugin
                            contentEditable={<ContentEditable className="lexical-input" />}
                            placeholder={<div className="lexical-placeholder">{placeholder}</div>}
                        />
                    </div>
                    <HistoryPlugin />
                    <AutoFocusPlugin />
                    <ListPlugin />
                    <LinkPlugin />
                    <TabIndentationPlugin />
                    <TabPlugin />
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
