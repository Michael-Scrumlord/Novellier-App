import { useState } from 'react';
import {
    LexicalComposer,
    RichTextPlugin,
    ContentEditable,
    HistoryPlugin,
    AutoFocusPlugin,
    ListPlugin,
    LinkPlugin,
    TabIndentationPlugin,
    TabNode,
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    AutoLinkNode,
    LinkNode,
} from '../../lib/lexical-bundle.js';
import LexicalToolbar from './LexicalToolbar.jsx';
import EditorSyncPlugin from './plugins/EditorSyncPlugin.jsx';
import TabPlugin from './plugins/TabPlugin.jsx';
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
            <LexicalComposer initialConfig={editorConfig}>
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

