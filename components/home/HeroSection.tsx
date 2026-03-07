'use client';

import { useEffect, useMemo, useReducer } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

const RIBBON_COLORS = [
  '#4A90D9', // light blue
  '#C41E3A', // red
  '#FFD700', // gold
  '#FFFFFF', // white
  '#1B3A5C', // navy
  '#8B4513', // bronze
  '#4B0082', // purple
  '#228B22', // green
  '#FF8C00', // orange
  '#DC143C', // crimson
];

interface Dot {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  dx: number;
  dy: number;
}

function generateDots(count: number): Dot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    color: RIBBON_COLORS[Math.floor(Math.random() * RIBBON_COLORS.length)],
    duration: 15 + Math.random() * 25,
    delay: Math.random() * -20,
    dx: (Math.random() - 0.5) * 30,
    dy: (Math.random() - 0.5) * 20,
  }));
}

export default function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const dots = useMemo(() => generateDots(25), []);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-900">
      {/* Constellation background */}
      {!prefersReducedMotion && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {dots.map((dot) => (
            <motion.div
              key={dot.id}
              className="absolute rounded-full"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: dot.size,
                height: dot.size,
                backgroundColor: dot.color,
                opacity: 0.4 + Math.random() * 0.3,
              }}
              animate={{
                x: [0, dot.dx, -dot.dx * 0.5, 0],
                y: [0, dot.dy, -dot.dy * 0.7, 0],
                opacity: [0.3, 0.7, 0.4, 0.3],
              }}
              transition={{
                duration: dot.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: dot.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Static dots for reduced motion */}
      {prefersReducedMotion && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {dots.map((dot) => (
            <div
              key={dot.id}
              className="absolute rounded-full"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: dot.size,
                height: dot.size,
                backgroundColor: dot.color,
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      )}

      {/* Grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Content */}
      <div className="relative z-20 mx-auto max-w-4xl px-6 text-center">
        <motion.h1
          className="font-display text-5xl font-black text-cream md:text-7xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Every Decoration.
          <br />
          Every Hero.
          <br />
          Every Story.
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-2xl font-body text-xl text-text-muted"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        >
          The complete record of American military valor &mdash; 3,527
          decorations across 2,891 recipients
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
        >
          <Link
            href="/map"
            className="inline-block rounded-lg bg-gold-400 px-8 py-4 font-display font-bold text-navy-950 transition-colors hover:bg-gold-300"
          >
            Explore the Map
          </Link>
          <Link
            href="/search"
            className="inline-block rounded-lg border-2 border-cream px-8 py-4 font-display text-cream transition-colors hover:bg-cream/10"
          >
            Search Recipients
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
