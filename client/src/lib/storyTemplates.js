export const STORY_TEMPLATES = [
    {
        id: 'template-fantasy',
        genre: 'Fantasy',
        beats: [
            { key: 'hook', label: 'Hook', guidance: 'Open with a vivid moment that introduces the world and tone.' },
            { key: 'call', label: 'Call to Adventure', guidance: 'Present the quest, conflict, or catalyst.' },
            { key: 'refusal', label: 'Refusal', guidance: 'Show hesitation, stakes, or cost.' },
            { key: 'mentor', label: 'Mentor/Ally', guidance: 'Introduce guidance, tools, or allies.' },
            { key: 'threshold', label: 'Crossing the Threshold', guidance: 'Your protagonist commits and enters the new world.' },
            { key: 'trials', label: 'Trials', guidance: 'Escalate challenges and build skills.' },
            { key: 'ordeal', label: 'Ordeal', guidance: 'A major loss or revelation changes the plan.' },
            { key: 'reward', label: 'Reward', guidance: 'A temporary win or key discovery.' },
            { key: 'return', label: 'Return', guidance: 'Set up the final push toward resolution.' },
            { key: 'finale', label: 'Finale', guidance: 'Climactic confrontation and resolution.' }
        ]
    },
    {
        id: 'template-horror',
        genre: 'Horror',
        beats: [
            { key: 'normal', label: 'Normal World', guidance: 'Establish the baseline before dread sets in.' },
            { key: 'disturbance', label: 'Disturbance', guidance: 'Introduce the unsettling presence.' },
            { key: 'denial', label: 'Denial', guidance: 'Characters rationalize or dismiss warnings.' },
            { key: 'escalation', label: 'Escalation', guidance: 'Fear grows and rules change.' },
            { key: 'trap', label: 'Point of No Return', guidance: 'They are trapped or committed.' },
            { key: 'revelation', label: 'Revelation', guidance: 'Expose the true nature of the threat.' },
            { key: 'collapse', label: 'Collapse', guidance: 'Hope fails, tension peaks.' },
            { key: 'final-stand', label: 'Final Stand', guidance: 'Confront the horror directly.' },
            { key: 'aftermath', label: 'Aftermath', guidance: 'Resolve and show the cost.' }
        ]
    },
    {
        id: 'template-sci-fi',
        genre: 'Sci-Fi',
        beats: [
            { key: 'concept', label: 'Concept Promise', guidance: 'Showcase the core speculative idea.' },
            { key: 'inciting', label: 'Inciting Incident', guidance: 'Trigger the main conflict.' },
            { key: 'debate', label: 'Debate', guidance: 'Weigh the implications of the discovery.' },
            { key: 'commitment', label: 'Commitment', guidance: 'Commit to the mission or experiment.' },
            { key: 'midpoint', label: 'Midpoint Shift', guidance: 'Raise the stakes with new information.' },
            { key: 'complications', label: 'Complications', guidance: 'The system reacts, pressure mounts.' },
            { key: 'crisis', label: 'Crisis', guidance: 'The plan collapses or a sacrifice is needed.' },
            { key: 'climax', label: 'Climax', guidance: 'Resolve the conflict with ingenuity.' },
            { key: 'new-order', label: 'New Order', guidance: 'Show the changed world and aftermath.' }
        ]
    }
];

export const DEFAULT_SECTION = {
    key: 'draft',
    label: 'Draft',
    guidance: 'Start free-writing the core idea.'
};
