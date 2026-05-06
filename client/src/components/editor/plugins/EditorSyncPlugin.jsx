import { useEffect, useRef } from 'react';
import {
    useLexicalComposerContext,
    $getRoot,
    $createParagraphNode,
    $createTextNode,
} from '../../../lib/lexical-bundle.js';

// Minimal valid Lexical state: root with one empty paragraph.
// Used to reset the editor when content is empty or missing.
// Parsed at call-time rather than captured at render, because the editor state
// at render (before DOM attachment) has an empty root, which Lexical forbids setting.
const EMPTY_EDITOR_STATE =
    '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

export default function EditorSyncPlugin({ value, onChange }) {
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
            // Use setEditorState (synchronous) so the update listener fires immediately
            // and lastEditorStateString is set before this effect returns. An async
            // editor.update() would fire later and could corrupt lastEditorStateString
            // after we've already navigated to a different chapter.
            editor.setEditorState(editor.parseEditorState(EMPTY_EDITOR_STATE));
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
