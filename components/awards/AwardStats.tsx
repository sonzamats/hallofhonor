'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConflictStat {
  name: string;
  count: number;
}

interface BranchStat {
  name: string;
  count: number;
}

interface AwardStatsData {
  totalAwarded: number;
  byConflict: ConflictStat[];
  byBranch: BranchStat[];
  posthumousCount: number;
  withValorCount: number;
}

interface AwardStatsProps {
  stats: AwardStatsData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BRANCH_COLORS: Record<string, string> = {
  Army: '#4B5320',
  Navy: '#1B4F8A',
  'Marine Corps': '#8B0000',
  'Air Force': '#5B8DB8',
  'Coast Guard': '#E87722',
  'Space Force': '#0D1B2A',
};

function getBranchColor(name: string): string {
  return BRANCH_COLORS[name] ?? '#8a9bb5';
}

/**
 * Spring-based easing: fast start, slow finish.
 */
function springEase(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

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

function useInView(threshold = 0.2): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}

// ---------------------------------------------------------------------------
// Animated number component
// ---------------------------------------------------------------------------

function AnimatedNumber({
  value,
  inView,
  reducedMotion,
}: {
  value: number;
  inView: boolean;
  reducedMotion: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  const animate = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    const duration = 1200;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.round(springEase(progress) * value));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [value, reducedMotion]);

  useEffect(() => {
    if (inView) animate();
  }, [inView, animate]);

  const shown = reducedMotion ? value : display;

  return <>{shown.toLocaleString()}</>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConflictBarChart({
  data,
  inView,
  reducedMotion,
}: {
  data: ConflictStat[];
  inView: boolean;
  reducedMotion: boolean;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const pct = (item.count / maxCount) * 100;

        return (
          <div key={item.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-body text-cream/90 truncate mr-3">
                {item.name}
              </span>
              <span className="text-sm font-body text-gold-400 font-semibold tabular-nums shrink-0">
                <AnimatedNumber
                  value={item.count}
                  inView={inView}
                  reducedMotion={reducedMotion}
                />
              </span>
            </div>
            <div className="h-2 rounded-full bg-navy-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gold-400"
                initial={{ width: 0 }}
                animate={inView ? { width: `${pct}%` } : { width: 0 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : {
                        type: 'spring',
                        stiffness: 60,
                        damping: 18,
                        delay: idx * 0.06,
                      }
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BranchBreakdown({
  data,
  inView,
  reducedMotion,
}: {
  data: BranchStat[];
  inView: boolean;
  reducedMotion: boolean;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div>
      {/* Segmented bar */}
      <div className="flex h-4 rounded-full overflow-hidden bg-navy-800">
        {data.map((item, idx) => {
          const pct = (item.count / total) * 100;
          return (
            <motion.div
              key={item.name}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ backgroundColor: getBranchColor(item.name) }}
              initial={{ width: 0 }}
              animate={inView ? { width: `${pct}%` } : { width: 0 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : {
                      type: 'spring',
                      stiffness: 60,
                      damping: 18,
                      delay: idx * 0.05,
                    }
              }
              title={`${item.name}: ${item.count.toLocaleString()}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-sm font-body">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: getBranchColor(item.name) }}
              aria-hidden="true"
            />
            <span className="text-cream/80">{item.name}</span>
            <span className="text-text-muted tabular-nums">
              <AnimatedNumber
                value={item.count}
                inView={inView}
                reducedMotion={reducedMotion}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HighlightStat({
  value,
  label,
  inView,
  reducedMotion,
}: {
  value: number;
  label: string;
  inView: boolean;
  reducedMotion: boolean;
}) {
  return (
    <div className="text-center rounded-lg bg-navy-800/60 p-4">
      <div className="font-display text-2xl font-bold text-gold-400 tabular-nums">
        <AnimatedNumber value={value} inView={inView} reducedMotion={reducedMotion} />
      </div>
      <div className="text-sm text-text-muted font-body mt-1 uppercase tracking-small-caps">
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AwardStats({ stats }: AwardStatsProps) {
  const [sectionRef, inView] = useInView(0.15);
  const reducedMotion = useReducedMotion();

  return (
    <section
      ref={sectionRef}
      aria-label="Award statistics"
      className="space-y-8"
    >
      {/* Total awarded */}
      <div className="text-center">
        <div className="font-display text-4xl font-bold text-gold-400 tabular-nums">
          <AnimatedNumber
            value={stats.totalAwarded}
            inView={inView}
            reducedMotion={reducedMotion}
          />
        </div>
        <p className="text-text-muted font-body mt-1 uppercase tracking-small-caps text-sm">
          Total Awarded
        </p>
      </div>

      {/* By conflict */}
      {stats.byConflict.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-cream mb-4">
            By Conflict
          </h3>
          <ConflictBarChart
            data={stats.byConflict}
            inView={inView}
            reducedMotion={reducedMotion}
          />
        </div>
      )}

      {/* By branch */}
      {stats.byBranch.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-cream mb-4">
            By Branch
          </h3>
          <BranchBreakdown
            data={stats.byBranch}
            inView={inView}
            reducedMotion={reducedMotion}
          />
        </div>
      )}

      {/* Posthumous & with valor */}
      <div className="grid grid-cols-2 gap-4">
        <HighlightStat
          value={stats.posthumousCount}
          label="Posthumous"
          inView={inView}
          reducedMotion={reducedMotion}
        />
        <HighlightStat
          value={stats.withValorCount}
          label="With Valor"
          inView={inView}
          reducedMotion={reducedMotion}
        />
      </div>
    </section>
  );
}
