export const STEP_COPY = {
    start: {
        title: 'Create a new story',
        subtitle: 'Start from a beat template or begin with a blank draft.',
    },
    genre: {
        title: 'Choose a Genre',
        subtitle: 'Select a structural foundation.',
    },
    confirm: {
        title: 'Finalize Details',
        subtitle: 'Adjust your beats and title.',
    },
};

export function previousStep(currentStep, useTemplate) {
    if (currentStep === 'confirm' && useTemplate) return 'genre';
    return 'start';
}

export function buildSectionsFromBeats(editableBeats) {
    return editableBeats.map((beat, index) => ({
        id: `${beat.key || 'beat'}-${index}`,
        beatKey: beat.key || `beat-${index + 1}`,
        title: beat.label,
        guidance: beat.guidance,
        content: '',
    }));
}