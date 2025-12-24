
"use client";

import { useState, useEffect, useRef, type RefObject } from 'react';

type UseOnScreenOptions = IntersectionObserverInit & {
    triggerOnce?: boolean;
};

export function useOnScreen(options?: UseOnScreenOptions): [RefObject<HTMLDivElement>, boolean] {
    const ref = useRef<HTMLDivElement>(null);
    const [isIntersecting, setIntersecting] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIntersecting(true);
                if (options?.triggerOnce) {
                    observer.unobserve(entry.target);
                }
            }
        }, options);

        observer.observe(element);
        
        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, [ref, options]);

    return [ref, isIntersecting];
}
