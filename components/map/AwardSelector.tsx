'use client';

import { useRef, useCallback, KeyboardEvent } from 'react';

interface AwardOption {
  slug: string;
  name: string;
  shortName: string;
  colorHex: string;
}

interface AwardSelectorProps {
  awards: AwardOption[];
  activeAward: string | null;
  onSelect: (slug: string | null) => void;
}

export default function AwardSelector({
  awards,
  activeAward,
  onSelect,
}: AwardSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const container = scrollRef.current;
      if (!container) return;

      const buttons = container.querySelectorAll<HTMLButtonElement>(
        'button[data-award-pill]'
      );
      let nextIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = index < buttons.length - 1 ? index + 1 : 0;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nextIndex = index > 0 ? index - 1 : buttons.length - 1;
      }

      if (nextIndex !== null) {
        const nextButton = buttons[nextIndex];
        nextButton?.focus();
        nextButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    },
    []
  );

  const isAllActive = activeAward === null;

  return (
    <div
      ref={scrollRef}
      role="tablist"
      aria-label="Filter by award"
      className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-hide"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* "All Awards" pill */}
      <button
        data-award-pill
        role="tab"
        aria-selected={isAllActive}
        onClick={() => onSelect(null)}
        onKeyDown={(e) => handleKeyDown(e, 0)}
        className={`
          flex-shrink-0 min-w-[44px] min-h-[44px] px-4 py-2
          rounded-full font-body text-sm font-medium
          transition-all duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900
          ${
            isAllActive
              ? 'bg-gold-400 text-navy-950 border-2 border-gold-400 shadow-md'
              : 'bg-transparent border-2 border-cream/30 text-cream hover:border-gold-400/60 hover:text-gold-300'
          }
        `}
      >
        All Awards
      </button>

      {/* Award pills */}
      {awards.map((award, i) => {
        const isActive = activeAward === award.slug;

        return (
          <button
            key={award.slug}
            data-award-pill
            role="tab"
            aria-selected={isActive}
            aria-label={award.name}
            title={award.name}
            onClick={() => onSelect(award.slug)}
            onKeyDown={(e) => handleKeyDown(e, i + 1)}
            className={`
              flex-shrink-0 min-w-[44px] min-h-[44px] px-4 py-2
              rounded-full font-body text-sm font-medium
              transition-all duration-200 ease-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900
            `}
            style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: award.colorHex,
              backgroundColor: isActive ? award.colorHex : 'transparent',
              color: isActive ? '#ffffff' : award.colorHex,
              // Focus ring color matches award
              // @ts-expect-error CSS custom property
              '--tw-ring-color': award.colorHex,
            }}
          >
            {award.shortName}
          </button>
        );
      })}
    </div>
  );
}
