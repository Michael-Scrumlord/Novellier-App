import { useMemo, useReducer } from 'react';
import { DEFAULT_SECTION } from '../lib/storyTemplates.js';
import { buildSectionsFromBeats, previousStep } from '../utils/templateWizardUtils.js';

const initialState = {
    step: 'start',
    useTemplate: true,
    selectedTemplateId: '',
    title: 'Untitled draft',
    editableBeats: [],
    customGenre: '',
};

function wizardReducer(state, action) {
    switch (action.type) {
        case 'START':
            return {
                ...state,
                useTemplate: action.useTemplate,
                step: action.useTemplate ? 'genre' : 'confirm',
                selectedTemplateId: action.useTemplate ? state.selectedTemplateId : '',
                editableBeats: action.useTemplate ? state.editableBeats : [],
            };
        case 'SELECT_GENRE':
            return {
                ...state,
                selectedTemplateId: action.templateId,
                editableBeats: action.beats,
                step: 'confirm',
            };
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'UPDATE_BEAT':
            return {
                ...state,
                editableBeats: state.editableBeats.map((beat, idx) =>
                    idx === action.index ? { ...beat, ...action.updates } : beat
                ),
            };
        case 'REMOVE_BEAT':
            return {
                ...state,
                editableBeats: state.editableBeats.filter((_, idx) => idx !== action.index),
            };
        case 'ADD_BEAT': {
            const nextIndex = state.editableBeats.length + 1;
            return {
                ...state,
                editableBeats: [
                    ...state.editableBeats,
                    {
                        key: `beat-${nextIndex}`,
                        label: `New beat ${nextIndex}`,
                        guidance: 'Describe the intent of this beat.',
                    },
                ],
            };
        }
        case 'BACK':
            return { ...state, step: previousStep(state.step, state.useTemplate) };
        default:
            return state;
    }
}

export function useTemplateWizard({ templates, onCreate, onClose }) {
    const [state, dispatch] = useReducer(wizardReducer, initialState);

    const selectedTemplate = useMemo(
        () => templates.find((template) => template.id === state.selectedTemplateId),
        [templates, state.selectedTemplateId]
    );

    const handleStart = (choice) => dispatch({ type: 'START', useTemplate: choice });

    const handleGenreSelect = (templateId) => {
        const template = templates.find((entry) => entry.id === templateId);
        const beats = template ? template.beats.map((beat) => ({
            key: beat.key,
            label: beat.label,
            guidance: beat.guidance,
        })) : [];
        dispatch({ type: 'SELECT_GENRE', templateId, beats });
    };

    const handleCreate = () => {
        const sections = state.useTemplate && selectedTemplate
            ? buildSectionsFromBeats(state.editableBeats)
            : [{ ...DEFAULT_SECTION, content: '' }];

        const genre = state.useTemplate
            ? (selectedTemplate?.genre || null)
            : (state.customGenre || null);

        onCreate({
            title: state.title,
            templateId: state.useTemplate ? (selectedTemplate?.id || null) : null,
            genre,
            sections,
        });
        onClose();
    };

    return {
        state,
        dispatch,
        selectedTemplate,
        handleStart,
        handleGenreSelect,
        handleCreate,
    };
}