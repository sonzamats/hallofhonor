'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface MapTooltipProps {
  x: number;
  y: number;
  stateName: string;
  count: number;
  awardName: string;
  visible: boolean;
}

export default function MapTooltip({
  x,
  y,
  stateName,
  count,
  awardName,
  visible,
}: MapTooltipProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="pointer-events-none absolute z-50 rounded-lg bg-navy-800 px-3 py-2 shadow-lg"
          style={{
            left: x + 12,
            top: y - 8,
          }}
        >
          <p className="font-display text-sm font-bold text-cream">
            {stateName}
          </p>
          <p className="font-body text-xs text-text-muted">
            {count.toLocaleString()} {awardName} {count === 1 ? 'recipient' : 'recipients'}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
