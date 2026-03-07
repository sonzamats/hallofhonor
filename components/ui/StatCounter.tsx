'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface StatCounterProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// Spring-based easing: fast start, slow finish
function springEase(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export default function StatCounter({
  value,
  label,
  prefix = '',
  suffix = '',
}: StatCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const prefersReduced = useReducedMotion();

  const animate = useCallback(() => {
    if (hasAnimated) return;
    setHasAnimated(true);

    if (prefersReduced) {
      setDisplayValue(value);
      return;
    }

    const duration = 1500; // ms
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = springEase(progress);
      setDisplayValue(Math.round(easedProgress * value));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [value, hasAnimated, prefersReduced]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  // If reduced motion, show final value immediately
  const shown = prefersReduced ? value : displayValue;

  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-3xl font-bold text-gold-400 tabular-nums">
        {prefix}
        {shown.toLocaleString()}
        {suffix}
      </div>
      <div className="small-caps text-sm text-text-muted mt-1">{label}</div>
    </div>
  );
}
