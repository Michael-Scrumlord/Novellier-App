import { useEffect } from 'react';

export function useModalKeybindings(bindings) {
    useEffect(() => {
        const onKeyDown = (event) => {
            for (const binding of bindings) {
                const keyMatches = Array.isArray(binding.key)
                    ? binding.key.includes(event.key)
                    : binding.key === event.key;
                if (!keyMatches) continue;
                if (binding.withMeta && !(event.metaKey || event.ctrlKey)) continue;

                event.preventDefault();
                binding.handler(event);
                return;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [bindings]);
}