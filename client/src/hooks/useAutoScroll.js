import { useEffect, useRef } from 'react';

const BOTTOM_SCROLL_THRESHOLD = 24;
// This is just a visual feature for the editor so it doesn't lock the user in to the bottom of the chat while text is generating.
export function useAutoScroll({ triggers = [], active, paused }) {
    const ref = useRef(null);
    const shouldAutoScrollRef = useRef(true);

    useEffect(() => {
        if (!ref.current || paused || !shouldAutoScrollRef.current) return;
        const node = ref.current;
        requestAnimationFrame(() => {
            node.scrollTop = node.scrollHeight;
        });
    }, [paused, ...triggers]);

    useEffect(() => {
        if (!active) return;
        shouldAutoScrollRef.current = true;
    }, [active]);

    const onScroll = () => {
        const node = ref.current;
        if (!node) return;
        const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
        shouldAutoScrollRef.current = distanceFromBottom <= BOTTOM_SCROLL_THRESHOLD;
    };

    return { ref, onScroll };
}