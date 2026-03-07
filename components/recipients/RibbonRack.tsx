'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AWARD_BY_SLUG } from '@/lib/awards-config';

interface RibbonAward {
  slug: string;
  name: string;
  colorHex: string;
  withValor?: boolean;
  oakLeafClusters?: number;
}

interface RibbonRackProps {
  awards: RibbonAward[];
  maxVisible?: number;
}

export default function RibbonRack({ awards, maxVisible = 9 }: RibbonRackProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleMouseEnter = useCallback((idx: number) => setHoveredIndex(idx), []);
  const handleMouseLeave = useCallback(() => setHoveredIndex(null), []);

  // Sort by precedence rank before rendering
  const sorted = [...awards].sort((a, b) => {
    const rankA = AWARD_BY_SLUG[a.slug]?.precedenceRank ?? 999;
    const rankB = AWARD_BY_SLUG[b.slug]?.precedenceRank ?? 999;
    return rankA - rankB;
  });

  const visible = sorted.slice(0, maxVisible);
  const overflow = sorted.length - maxVisible;

  // Group into rows of 3 (US military standard)
  const rows: RibbonAward[][] = [];
  for (let i = 0; i < visible.length; i += 3) {
    rows.push(visible.slice(i, i + 3));
  }

  function buildTooltip(award: RibbonAward): string {
    const parts = [award.name];
    if (award.withValor) parts.push('with Valor');
    if (award.oakLeafClusters && award.oakLeafClusters > 0) {
      parts.push(
        `${award.oakLeafClusters} Oak Leaf Cluster${award.oakLeafClusters > 1 ? 's' : ''}`
      );
    }
    return parts.join(' \u2014 ');
  }

  return (
    <div
      className="inline-flex flex-col items-center gap-0.5"
      role="list"
      aria-label="Ribbon rack"
    >
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-0.5 justify-center">
          {row.map((award, colIndex) => {
            const globalIndex = rowIndex * 3 + colIndex;
            const isHovered = hoveredIndex === globalIndex;
            const tooltipText = buildTooltip(award);

            return (
              <motion.div
                key={`${award.slug}-${globalIndex}`}
                role="listitem"
                className="relative cursor-default"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.3,
                  delay: globalIndex * 0.06,
                  ease: 'easeOut',
                }}
                onMouseEnter={() => handleMouseEnter(globalIndex)}
                onMouseLeave={handleMouseLeave}
                onFocus={() => handleMouseEnter(globalIndex)}
                onBlur={handleMouseLeave}
                tabIndex={0}
                aria-label={tooltipText}
              >
                {/* Ribbon bar: 32x12px */}
                <div
                  className="w-8 h-3 rounded-sm relative flex items-center justify-center"
                  style={{ backgroundColor: award.colorHex }}
                >
                  {/* Valor device */}
                  {award.withValor && (
                    <span
                      className="absolute text-[7px] font-bold leading-none select-none"
                      style={{ color: '#c9a84c' }}
                      aria-hidden="true"
                    >
                      V
                    </span>
                  )}

                  {/* Oak leaf cluster indicator */}
                  {award.oakLeafClusters != null && award.oakLeafClusters > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 text-[6px] leading-none select-none"
                      style={{ color: '#c9a84c' }}
                      aria-hidden="true"
                    >
                      {Array.from({ length: Math.min(award.oakLeafClusters, 4) })
                        .map(() => '\u2726')
                        .join('')}
                    </span>
                  )}
                </div>

                {/* Tooltip */}
                {isHovered && (
                  <div
                    className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[11px] font-body text-cream bg-navy-950 border border-navy-700 rounded shadow-lg whitespace-nowrap pointer-events-none"
                    role="tooltip"
                  >
                    {tooltipText}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-navy-700" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ))}

      {/* Overflow indicator */}
      {overflow > 0 && (
        <span className="mt-1 px-2 py-0.5 text-[10px] font-body text-text-muted bg-navy-800/60 rounded-full">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
