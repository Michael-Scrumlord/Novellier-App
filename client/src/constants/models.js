export const MODEL_OPTIONS = [
    {
        label: 'Local Models (Free)',
        options: [
            { value: 'phi3', label: 'Phi-3 (Balanced)' },
            { value: 'llama3.2', label: 'Llama 3.2 (Fast)' },
            { value: 'mistral', label: 'Mistral (Creative)' },
        ]
    },
    {
        label: 'OpenAI (API Key Required)',
        options: [
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
            { value: 'gpt-4o', label: 'GPT-4o (Advanced)' },
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Economy)' }
        ]
    },
    {
        label: 'Google Gemini (API Key required)',
        options: [
            { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
            { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Advanced)' }
        ]
    }
];

export const FEEDBACK_OPTIONS = [
    { value: 'logic', label: 'Logical consistency' },
    { value: 'emotion', label: 'Emotional impact' },
    { value: 'believability', label: 'Believability' }
];

export const EXAMPLE_WORDS_PER_PAGE = 300;
