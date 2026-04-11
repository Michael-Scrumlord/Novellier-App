export const MODEL_OPTIONS = [
    {
        label: 'Local Models (Ollama)',
        options: [
            { value: 'phi3', label: 'Phi-3 (Balanced)' },
            { value: 'phi4-mini:3.8b', label: 'Phi-4 Mini (Balanced)' },
            { value: 'llama3.2', label: 'Llama 3.2 (Fast)' },
            { value: 'mistral', label: 'Mistral (Creative)' }
        ]
    }
];

export const FEEDBACK_OPTIONS = [
    { value: 'logic', label: 'Logical consistency' },
    { value: 'emotion', label: 'Emotional impact' },
    { value: 'believability', label: 'Believability' }
];

export const EXAMPLE_WORDS_PER_PAGE = 300;
