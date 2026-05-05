// This is a single re-export surface for all Lexical imports, so that we can manage version bumps in one place and avoid drift across packages.
export { LexicalComposer } from '@lexical/react/LexicalComposer';
export { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
export { ContentEditable } from '@lexical/react/LexicalContentEditable';
export { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
export { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
export { ListPlugin } from '@lexical/react/LexicalListPlugin';
export { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
export { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export {
    $getRoot,
    $createParagraphNode,
    $createTextNode,
    $getSelection,
    $isRangeSelection,
    createEditor,
    FORMAT_TEXT_COMMAND,
    FORMAT_ELEMENT_COMMAND,
    UNDO_COMMAND,
    REDO_COMMAND,
    SELECTION_CHANGE_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    COMMAND_PRIORITY_LOW,
    KEY_TAB_COMMAND,
    $createTabNode,
    TabNode,
} from 'lexical';

export {
    HeadingNode,
    QuoteNode,
    $createHeadingNode,
    $createQuoteNode,
    $isHeadingNode,
    $isQuoteNode,
} from '@lexical/rich-text';

export { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';

export { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';

export { AutoLinkNode, LinkNode } from '@lexical/link';

export {
    $setBlocksType,
    $patchStyleText,
    $getSelectionStyleValueForProperty,
} from '@lexical/selection';

export { $generateHtmlFromNodes } from '@lexical/html';