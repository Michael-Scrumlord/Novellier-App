import { useEffect } from 'react';

export function useClickOutside(ref, onOutside, enabled) {
    useEffect(() => {
        if (!enabled) return undefined;

        const handleMouseDown = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                onOutside();
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [ref, onOutside, enabled]);
}