import { useEffect, useRef } from 'react';
import {
    useLexicalComposerContext,
    $getRoot,
    $createParagraphNode,
    $createTextNode,
} from '../../../lib/lexical-bundle.js';

export default function EditorSyncPlugin({ value, onChange }) {
    const [editor] = useLexicalComposerContext();
    const lastEditorStateString = useRef(null);
    // Captured synchronously during first render — before any content loads.
    // Used to clear the editor synchronously (setEditorState is sync; editor.update is not).
    const emptyEditorState = useRef(editor.getEditorState());

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
            editor.setEditorState(emptyEditorState.current);
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
