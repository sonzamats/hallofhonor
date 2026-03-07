'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { truncate } from '@/lib/utils';

interface RecipientCardAward {
  slug: string;
  shortName: string;
  colorHex: string;
}

interface RecipientCardProps {
  recipient: {
    id: string;
    full_name: string;
    rank?: string | null;
    branch?: string | null;
    conflict?: string | null;
    entered_service_state?: string | null;
    posthumous: boolean;
    pow: boolean;
    citation?: string | null;
    date_awarded?: string | null;
  };
  awards?: RecipientCardAward[];
  size?: 'sm' | 'md' | 'lg';
  showCitation?: boolean;
  index?: number;
}

const sizeClasses: Record<string, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const nameClasses: Record<string, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
};

const fadeSlideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function RecipientCard({
  recipient,
  awards,
  size = 'md',
  showCitation = false,
  index = 0,
}: RecipientCardProps) {
  const year = recipient.date_awarded
    ? new Date(recipient.date_awarded).getFullYear().toString()
    : null;

  return (
    <motion.div
      variants={fadeSlideUp}
      initial="initial"
      animate="animate"
      transition={{
        duration: 0.4,
        delay: index * 0.04,
        ease: 'easeOut',
      }}
    >
      <Link
        href={`/recipient/${recipient.id}`}
        className="block min-h-[44px] min-w-[44px] group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 rounded-lg"
      >
        <div
          className={`
            ${sizeClasses[size]}
            bg-navy-900/80 rounded-lg
            border-l-[3px] border-gold-500
            group-hover:border-gold-300
            transition-colors duration-200
            group-hover:bg-navy-800/90
          `}
        >
          {/* Name */}
          <h3
            className={`font-display font-bold text-cream ${nameClasses[size]} leading-tight`}
          >
            {recipient.full_name}
            {recipient.posthumous && (
              <span
                className="text-gold-400 ml-1"
                title="Awarded Posthumously"
                aria-label="Awarded Posthumously"
              >
                &dagger;
              </span>
            )}
          </h3>

          {/* Rank & Branch */}
          {(recipient.rank || recipient.branch) && (
            <p className="text-text-muted text-sm font-body mt-1">
              {[recipient.rank, recipient.branch].filter(Boolean).join(' \u2022 ')}
            </p>
          )}

          {/* Conflict badge */}
          {recipient.conflict && (
            <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-body rounded-full bg-amber-900/30 text-amber-200 border border-amber-800/20">
              {recipient.conflict}
            </span>
          )}

          {/* State & Year */}
          {(recipient.entered_service_state || year) && (
            <p className="text-text-muted text-xs font-body mt-1.5">
              {[recipient.entered_service_state, year].filter(Boolean).join(' \u2022 ')}
            </p>
          )}

          {/* Award badges */}
          {awards && awards.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Awards">
              {awards.map((award) => (
                <span
                  key={award.slug}
                  className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-body font-semibold rounded-full text-white/90"
                  style={{ backgroundColor: `${award.colorHex}cc` }}
                >
                  {award.shortName}
                </span>
              ))}
            </div>
          )}

          {/* POW badge */}
          {recipient.pow && (
            <span
              className="inline-block mt-2 px-2 py-0.5 text-[10px] font-body font-semibold rounded-full text-white/90"
              style={{ backgroundColor: '#8B6914' }}
            >
              POW
            </span>
          )}

          {/* Citation preview */}
          {showCitation && recipient.citation && (
            <p className="text-text-muted text-sm font-body mt-2 italic leading-relaxed">
              &ldquo;{truncate(recipient.citation, 120)}&rdquo;
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
