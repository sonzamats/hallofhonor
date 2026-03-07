'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface Award {
  slug: string;
  name: string;
  shortName: string;
  colorHex: string;
  description: string;
  totalAwarded?: number;
}

interface AwardCategoryGridProps {
  awards: Award[];
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '\u2026';
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
};

export default function AwardCategoryGrid({ awards }: AwardCategoryGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      {awards.map((award) => (
        <motion.div key={award.slug} variants={cardVariants}>
          <Link
            href={`/award/${award.slug}`}
            className="group block rounded-lg bg-navy-800 p-6 transition-colors hover:bg-navy-700"
            style={{ borderLeft: `4px solid ${award.colorHex}` }}
          >
            <h3 className="font-display font-bold text-cream">
              {award.name}
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              {truncate(award.description, 80)}
            </p>
            {award.totalAwarded != null && (
              <p className="mt-3 text-xs font-medium text-gold-400">
                {award.totalAwarded.toLocaleString()} awarded
              </p>
            )}
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
