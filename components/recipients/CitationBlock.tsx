'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { findDramaticSentence, truncate } from '@/lib/utils';
import { AWARD_BY_SLUG } from '@/lib/awards-config';

interface CitationBlockProps {
  citation: string;
  awardSlug?: string;
  expandable?: boolean;
}

export default function CitationBlock({
  citation,
  awardSlug,
  expandable = true,
}: CitationBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const accentColor = awardSlug
    ? AWARD_BY_SLUG[awardSlug]?.colorHex ?? '#c9a84c'
    : '#c9a84c';

  const dramaticSentence = useMemo(
    () => findDramaticSentence(citation),
    [citation]
  );

  const isLong = citation.length > 400;
  const shouldTruncate = expandable && isLong && !expanded;
  const displayText = shouldTruncate ? truncate(citation, 400) : citation;

  /**
   * Render citation text with the most dramatic sentence bolded.
   */
  function renderCitationText(text: string) {
    if (!dramaticSentence) {
      return <span>{text}</span>;
    }

    const idx = text.indexOf(dramaticSentence);
    if (idx === -1) {
      return <span>{text}</span>;
    }

    const before = text.slice(0, idx);
    const after = text.slice(idx + dramaticSentence.length);

    return (
      <>
        {before && <span>{before}</span>}
        <strong className="text-cream font-semibold">{dramaticSentence}</strong>
        {after && <span>{after}</span>}
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(4px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="citation-block"
      style={{
        borderLeftColor: accentColor,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={expanded ? 'expanded' : 'collapsed'}
          initial={false}
          animate={{ height: 'auto' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <p className="text-navy-900/90 font-body text-base leading-relaxed">
            {renderCitationText(displayText)}
          </p>
        </motion.div>
      </AnimatePresence>

      {expandable && isLong && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 text-sm font-body font-semibold transition-colors duration-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream rounded"
          style={{ color: accentColor }}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Read full citation'}
        </button>
      )}
    </motion.div>
  );
}
