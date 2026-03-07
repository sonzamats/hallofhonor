'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface AwardCardData {
  slug: string;
  name: string;
  shortName: string;
  colorHex: string;
  establishedYear: number;
  description: string;
  totalAwarded?: number;
}

interface AwardCardProps {
  award: AwardCardData;
  onClick?: () => void;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '\u2026';
}

export default function AwardCard({ award, onClick }: AwardCardProps) {
  const content = (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="group relative rounded-lg bg-navy-900 overflow-hidden
        shadow-md hover:shadow-xl transition-shadow duration-300
        cursor-pointer"
      style={{ borderLeft: `4px solid ${award.colorHex}` }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-display font-bold text-cream text-lg leading-tight">
            {award.name}
          </h3>
          <span
            className="shrink-0 inline-flex items-center rounded-full
              px-2 py-0.5 text-xs font-body font-medium"
            style={{
              backgroundColor: award.colorHex + '20',
              color: award.colorHex,
            }}
          >
            {award.shortName}
          </span>
        </div>

        {/* Established year */}
        <p className="text-text-muted text-sm font-body mb-2">
          Established {award.establishedYear}
        </p>

        {/* Description */}
        <p className="text-cream/80 text-sm font-body leading-relaxed mb-3">
          {truncate(award.description, 100)}
        </p>

        {/* Total awarded */}
        {award.totalAwarded != null && (
          <div className="flex items-center gap-1.5 text-sm font-body">
            <span className="text-gold-400 font-semibold tabular-nums">
              {award.totalAwarded.toLocaleString()}
            </span>
            <span className="text-text-muted">awarded</span>
          </div>
        )}
      </div>

      {/* Subtle top-edge glow on hover */}
      <div
        className="absolute inset-x-0 top-0 h-px opacity-0
          group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${award.colorHex}, transparent)`,
        }}
        aria-hidden="true"
      />
    </motion.div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-gold-400 rounded-lg"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/award/${award.slug}`}
      className="block focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-gold-400 rounded-lg"
    >
      {content}
    </Link>
  );
}
