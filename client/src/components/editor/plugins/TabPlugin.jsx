import { useEffect } from 'react';
import {
    useLexicalComposerContext,
    $getSelection,
    $isRangeSelection,
    KEY_TAB_COMMAND,
    COMMAND_PRIORITY_LOW,
    $createTabNode,
} from '../../../lib/lexical-bundle.js';

export default function TabPlugin() {
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
