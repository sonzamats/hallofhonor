'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { formatDate } from '@/lib/utils';

type EventType = 'life' | 'award' | 'service';

interface TimelineEvent {
  date: string;
  label: string;
  description?: string;
  type: EventType;
}

interface ServiceTimelineProps {
  events: TimelineEvent[];
}

const nodeColors: Record<EventType, string> = {
  award: '#c9a84c',
  life: '#f5f0e8',
  service: '#243e6a',
};

const nodeBorderColors: Record<EventType, string> = {
  award: '#c9a84c',
  life: '#8a9bb5',
  service: '#243e6a',
};

export default function ServiceTimeline({ events }: ServiceTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-50px' });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleMouseEnter = useCallback((idx: number) => setHoveredIndex(idx), []);
  const handleMouseLeave = useCallback(() => setHoveredIndex(null), []);

  // Sort events chronologically
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (sorted.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto scrollbar-thin scrollbar-track-navy-900 scrollbar-thumb-navy-700"
      role="list"
      aria-label="Service timeline"
    >
      <div className="relative flex items-center min-w-max px-6 py-10">
        {/* Timeline line */}
        <motion.div
          className="absolute top-1/2 left-6 right-6 h-px bg-navy-700"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ transformOrigin: 'left' }}
        />

        {sorted.map((event, i) => {
          const isHovered = hoveredIndex === i;
          const color = nodeColors[event.type];
          const borderColor = nodeBorderColors[event.type];
          const isAbove = i % 2 === 0;

          return (
            <motion.div
              key={`${event.date}-${event.label}-${i}`}
              role="listitem"
              className="relative flex flex-col items-center mx-6 first:ml-0 last:mr-0"
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{
                duration: 0.4,
                delay: i * 0.1,
                ease: 'easeOut',
              }}
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
              onFocus={() => handleMouseEnter(i)}
              onBlur={handleMouseLeave}
              tabIndex={0}
              aria-label={`${event.label}: ${formatDate(event.date)}`}
            >
              {/* Label */}
              <div
                className={`flex flex-col items-center ${
                  isAbove ? 'order-1' : 'order-3'
                }`}
                style={{ minHeight: '3rem' }}
              >
                <span className="text-xs font-body font-semibold text-cream whitespace-nowrap max-w-[120px] text-center leading-tight">
                  {event.label}
                </span>
              </div>

              {/* Node */}
              <div className="order-2 relative z-10 my-1">
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 transition-transform duration-200"
                  style={{
                    backgroundColor: color,
                    borderColor: borderColor,
                    transform: isHovered ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
              </div>

              {/* Date */}
              <div
                className={`flex flex-col items-center ${
                  isAbove ? 'order-3' : 'order-1'
                }`}
                style={{ minHeight: '3rem' }}
              >
                <span className="text-[10px] font-body text-text-muted whitespace-nowrap">
                  {formatDate(event.date)}
                </span>
              </div>

              {/* Tooltip on hover */}
              {isHovered && event.description && (
                <div
                  className={`absolute z-50 ${
                    isAbove ? 'bottom-full mb-2' : 'top-full mt-2'
                  } left-1/2 -translate-x-1/2 px-3 py-2 text-xs font-body text-cream bg-navy-950 border border-navy-700 rounded-lg shadow-lg max-w-[200px] text-center pointer-events-none`}
                  role="tooltip"
                >
                  {event.description}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent ${
                      isAbove
                        ? 'top-full -mt-px border-t-4 border-t-navy-700'
                        : 'bottom-full -mb-px border-b-4 border-b-navy-700'
                    }`}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
