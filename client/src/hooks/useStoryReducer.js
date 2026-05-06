import { useCallback, useReducer } from 'react';
import { DEFAULT_SECTION } from '../lib/storyTemplates.js';
import {
    getGroupedBeats,
    handleAddChapter,
    handleAddBeat,
    handleDeleteChapter,
    handleSetSectionContent,
} from '../utils/storyStateUtils.js';

function computeNextChapterIndex(beatIndex, chapterIdx, currentBeatIdx, currentChapterIdx) {
    if (currentBeatIdx === beatIndex && currentChapterIdx >= chapterIdx) {
        return Math.max(0, currentChapterIdx - 1);
    }
    return currentChapterIdx;
}

function defaultSections() {
    const id = `part-${Date.now()}`;
    return [{
        ...DEFAULT_SECTION,
        id: `${id}-ch-1`,
        beatKey: id,
        title: 'Part 1 - Chapter 1',
        content: '',
    }];
}

function reducer(state, action) {
    switch (action.type) {
        case 'SET_SECTIONS':
            return action.sections;
        case 'ADD_CHAPTER':
            return handleAddChapter(state, action.beatIndex, action.beats);
        case 'ADD_BEAT':
            return handleAddBeat(state);
        case 'DELETE_CHAPTER': {
            const { newSections } = handleDeleteChapter(
                state, action.beatIndex, action.chapterIdx,
                action.currentBeatIdx, action.currentChapterIdx, action.beats,
            );
            return newSections;
        }
        case 'SET_CONTENT':
            return handleSetSectionContent(state, action.index, action.content);
        case 'RENAME_BEAT': {
            const beats = action.beats || getGroupedBeats(state);
            const target = beats[action.beatIndex];
            const trimmed = String(action.title || '').trim();
            if (!target || !trimmed) return state;
            return state.map((s) =>
                s.beatKey === target.beatKey ? { ...s, beatTitle: trimmed } : s
            );
        }
        case 'RENAME_CHAPTER': {
            const beats = action.beats || getGroupedBeats(state);
            const targetChapter = beats[action.beatIndex]?.chapters?.[action.chapterIdx];
            const trimmed = String(action.title || '').trim();
            if (!targetChapter || !trimmed) return state;
            const next = [...state];
            next[targetChapter.index] = { ...next[targetChapter.index], title: trimmed };
            return next;
        }
        case 'RESET':
            return defaultSections();
        default:
            return state;
    }
}

export function useStoryReducer() {
    const [sections, dispatch] = useReducer(reducer, undefined, defaultSections);

    return {
        sections,
        setSections: useCallback((next) => dispatch({ type: 'SET_SECTIONS', sections: next }), []),
        addChapter: useCallback((beatIndex, beats) => dispatch({ type: 'ADD_CHAPTER', beatIndex, beats }), []),
        addBeat: useCallback(() => dispatch({ type: 'ADD_BEAT' }), []),
        deleteChapter: useCallback((beatIndex, chapterIdx, currentBeatIdx, currentChapterIdx, beats) => {
            dispatch({ type: 'DELETE_CHAPTER', beatIndex, chapterIdx, currentBeatIdx, currentChapterIdx, beats });
            return computeNextChapterIndex(beatIndex, chapterIdx, currentBeatIdx, currentChapterIdx);
        }, []),
        setSectionContentAtIndex: useCallback((index, content) =>
            dispatch({ type: 'SET_CONTENT', index, content }), []),
        renameBeat: useCallback((beatIndex, title, beats) =>
            dispatch({ type: 'RENAME_BEAT', beatIndex, title, beats }), []),
        renameChapter: useCallback((beatIndex, chapterIdx, title, beats) =>
            dispatch({ type: 'RENAME_CHAPTER', beatIndex, chapterIdx, title, beats }), []),
        resetSections: useCallback(() => dispatch({ type: 'RESET' }), []),
    };
}
