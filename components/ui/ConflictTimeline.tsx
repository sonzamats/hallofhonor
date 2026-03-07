'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Conflict {
  slug: string;
  name: string;
  dateRange: string;
  count: number;
}

interface ConflictTimelineProps {
  conflicts: Conflict[];
  activeConflict?: string;
  onSelect: (slug: string) => void;
}

export default function ConflictTimeline({
  conflicts,
  activeConflict,
  onSelect,
}: ConflictTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    slug: string;
    x: number;
    y: number;
  } | null>(null);

  if (!conflicts.length) return null;

  const maxCount = Math.max(...conflicts.map((c) => c.count));
  const minNodeSize = 32;
  const maxNodeSize = 64;

  function getNodeSize(count: number): number {
    if (maxCount === 0) return minNodeSize;
    const ratio = count / maxCount;
    return minNodeSize + ratio * (maxNodeSize - minNodeSize);
  }

  function handleMouseEnter(
    e: React.MouseEvent<HTMLButtonElement>,
    slug: string
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      slug,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  const tooltipConflict = tooltip
    ? conflicts.find((c) => c.slug === tooltip.slug)
    : null;

  return (
    <div className="relative w-full" role="group" aria-label="Conflict timeline">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-thin pb-4"
        style={{
          scrollbarColor: 'var(--navy-700) transparent',
        }}
      >
        <div className="flex items-center gap-3 min-w-max px-4 py-6">
          {/* Timeline line */}
          <div className="absolute left-0 right-0 h-px bg-navy-700 pointer-events-none" />

          {conflicts.map((conflict) => {
            const size = getNodeSize(conflict.count);
            const isActive = activeConflict === conflict.slug;

            return (
              <div
                key={conflict.slug}
                className="relative flex flex-col items-center"
              >
                <motion.button
                  type="button"
                  onClick={() => onSelect(conflict.slug)}
                  onMouseEnter={(e) => handleMouseEnter(e, conflict.slug)}
                  onMouseLeave={handleMouseLeave}
                  onFocus={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      slug: conflict.slug,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onBlur={handleMouseLeave}
                  className={`relative z-10 rounded-full border-2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 ${
                    isActive
                      ? 'bg-gold-400/20 border-gold-400'
                      : 'bg-navy-800 border-navy-600 hover:border-gold-500/60'
                  }`}
                  style={{
                    width: Math.max(size, 44),
                    height: Math.max(size, 44),
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={`${conflict.name} (${conflict.dateRange}) — ${conflict.count.toLocaleString()} awards`}
                  aria-pressed={isActive}
                >
                  <span
                    className={`text-xs font-display font-bold leading-none ${
                      isActive ? 'text-gold-400' : 'text-cream/70'
                    }`}
                  >
                    {conflict.count.toLocaleString()}
                  </span>
                </motion.button>

                {/* Label below node */}
                <span
                  className={`mt-2 text-[10px] font-body text-center max-w-[80px] leading-tight ${
                    isActive ? 'text-gold-400' : 'text-text-muted'
                  }`}
                >
                  {conflict.dateRange}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && tooltipConflict && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
          role="tooltip"
        >
          <div className="bg-navy-800 border border-navy-600 rounded-md px-3 py-2 shadow-lg">
            <p className="font-display text-sm font-bold text-cream whitespace-nowrap">
              {tooltipConflict.name}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {tooltipConflict.dateRange} &middot;{' '}
              {tooltipConflict.count.toLocaleString()} awards
            </p>
          </div>
          {/* Tooltip arrow */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-navy-800 border-b border-r border-navy-600 rotate-45 -mt-1" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
