'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface Recipient {
  id: string;
  full_name: string;
  rank: string;
  branch: string;
  conflict: string;
  citation: string;
  photo_url?: string;
}

interface Award {
  name: string;
  colorHex: string;
  shortName: string;
}

interface FeaturedHeroProps {
  recipient: Recipient;
  award: Award;
}

function GeometricPlaceholder({ colorHex }: { colorHex: string }) {
  return (
    <div
      className="flex h-full min-h-[280px] w-full items-center justify-center"
      style={{
        background: `
          linear-gradient(135deg, #0a1628 0%, #112240 50%, #0a1628 100%)
        `,
      }}
    >
      {/* Decorative geometric pattern */}
      <svg
        viewBox="0 0 200 200"
        className="h-32 w-32 opacity-40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          points="100,20 180,70 180,130 100,180 20,130 20,70"
          stroke={colorHex}
          strokeWidth="1.5"
          fill="none"
        />
        <polygon
          points="100,45 155,75 155,125 100,155 45,125 45,75"
          stroke={colorHex}
          strokeWidth="1"
          fill="none"
          opacity="0.6"
        />
        <polygon
          points="100,70 130,85 130,115 100,130 70,115 70,85"
          stroke={colorHex}
          strokeWidth="0.75"
          fill="none"
          opacity="0.3"
        />
        <circle cx="100" cy="100" r="8" fill={colorHex} opacity="0.5" />
      </svg>
    </div>
  );
}

export default function FeaturedHero({ recipient, award }: FeaturedHeroProps) {
  const citationExcerpt =
    recipient.citation.length > 200
      ? recipient.citation.slice(0, 200).replace(/\s+\S*$/, '') + '\u2026'
      : recipient.citation;

  return (
    <motion.div
      className="group overflow-hidden rounded-xl bg-navy-800 transition-shadow duration-300 hover:shadow-[0_0_30px_-5px_rgba(212,175,55,0.15)]"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="flex flex-col md:flex-row">
        {/* Left side: photo or placeholder */}
        <div className="relative w-full flex-shrink-0 md:w-72">
          {recipient.photo_url ? (
            <div className="relative h-64 w-full md:h-full">
              <Image
                src={recipient.photo_url}
                alt={`Portrait of ${recipient.full_name}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 288px"
              />
            </div>
          ) : (
            <GeometricPlaceholder colorHex={award.colorHex} />
          )}
        </div>

        {/* Right side: details */}
        <div className="flex flex-1 flex-col justify-center p-6 md:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: award.colorHex }}
            >
              {award.shortName}
            </span>
            <span className="rounded-md bg-navy-700 px-2 py-1 text-xs text-text-muted">
              {recipient.conflict}
            </span>
          </div>

          <h3 className="font-display text-2xl font-bold text-cream">
            {recipient.full_name}
          </h3>

          <p className="mt-1 text-sm text-text-muted">
            {recipient.rank} &middot; {recipient.branch}
          </p>

          <blockquote className="mt-4 border-l-2 border-gold-500/30 pl-4 font-body italic text-cream/80">
            &ldquo;{citationExcerpt}&rdquo;
          </blockquote>

          <Link
            href={`/recipient/${recipient.id}`}
            className="mt-6 inline-flex items-center gap-1 font-display text-sm font-semibold text-gold-400 transition-colors hover:text-gold-300"
          >
            View Full Story
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
