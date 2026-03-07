'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useInView } from 'framer-motion';

interface Stat {
  label: string;
  value: number;
  suffix?: string;
}

interface StatsBarProps {
  stats: Stat[];
}

function AnimatedNumber({
  value,
  suffix,
  inView,
}: {
  value: number;
  suffix?: string;
  inView: boolean;
}) {
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 30,
    restDelta: 0.5,
  });

  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  );

  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    if (inView) {
      spring.set(value);
    }
  }, [inView, value, spring]);

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [display]);

  return (
    <span className="font-display text-3xl text-gold-400">
      {displayValue}
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

export default function StatsBar({ stats }: StatsBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 gap-6 md:flex md:items-center md:justify-center md:gap-0 md:divide-x md:divide-navy-700"
    >
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="flex flex-col items-center px-8 py-4 text-center"
        >
          <AnimatedNumber
            value={stat.value}
            suffix={stat.suffix}
            inView={inView}
          />
          <span className="mt-1 text-sm uppercase tracking-wider text-text-muted">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
