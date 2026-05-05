export const EDITOR_FONTS = [
    { label: 'Default Font', value: 'Georgia, serif' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
    { label: 'Courier New', value: "'Courier New', Courier, monospace" },
    {
        label: 'Trebuchet MS',
        value: "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif",
    },
    { label: 'Impact', value: 'Impact, fantasy' },
];

export const EDITOR_FONT_SIZES = [
    { label: 'Small (12px)', value: '12px' },
    { label: 'Normal (16px)', value: '16px' },
    { label: 'Large (20px)', value: '20px' },
    { label: 'Title (24px)', value: '24px' },
    { label: 'Display (32px)', value: '32px' },
];

// Page margins in px (96dpi). US Letter = 816 × 1056px.
export const EDITOR_MARGIN_PRESETS = [
    { label: 'Normal (1")',        value: 'normal',   v: 96,  h: 96  },
    { label: 'Narrow (0.5")',      value: 'narrow',   v: 48,  h: 48  },
    { label: 'Moderate (¾" sides)', value: 'moderate', v: 96,  h: 72  },
    { label: 'Wide (2" sides)',    value: 'wide',     v: 96,  h: 192 },
];
