'use client';

import { useState, useRef, useEffect } from 'react';
import { AWARD_BY_SLUG } from '@/lib/awards-config';

interface AwardBadgeProps {
  award: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showRibbon?: boolean;
}

/**
 * Returns white or dark text depending on background luminance.
 * Uses the W3C relative luminance formula.
 */
function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.4 ? '#0a1628' : '#ffffff';
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
} as const;

export default function AwardBadge({
  award,
  size = 'md',
  showLabel = true,
  showRibbon = false,
}: AwardBadgeProps) {
  const config = AWARD_BY_SLUG[award];
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  // Dismiss tooltip on outside click / scroll
  useEffect(() => {
    if (!tooltipVisible) return;

    const dismiss = () => setTooltipVisible(false);
    window.addEventListener('scroll', dismiss, { passive: true });
    document.addEventListener('pointerdown', (e) => {
      if (
        badgeRef.current &&
        !badgeRef.current.contains(e.target as Node)
      ) {
        dismiss();
      }
    });
    return () => {
      window.removeEventListener('scroll', dismiss);
    };
  }, [tooltipVisible]);

  if (!config) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-body bg-navy-800 text-text-muted ${sizeClasses[size]}`}
        aria-label="Unknown award"
      >
        {award}
      </span>
    );
  }

  const bgColor = config.colorHex;
  const textColor = getContrastText(bgColor);
  const label = size === 'sm' ? config.shortName : config.name;
  const tooltipText = `${config.name} (Rank #${config.precedenceRank})`;

  return (
    <span className="relative inline-flex" ref={badgeRef}>
      <span
        role="img"
        aria-label={tooltipText}
        className={`inline-flex items-center gap-1.5 rounded-full font-body font-medium cursor-default
          transition-shadow duration-200 hover:shadow-md
          ${sizeClasses[size]}`}
        style={{ backgroundColor: bgColor, color: textColor }}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        onFocus={() => setTooltipVisible(true)}
        onBlur={() => setTooltipVisible(false)}
        tabIndex={0}
      >
        {showRibbon && (
          <span
            className="inline-block w-2 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: textColor, opacity: 0.35 }}
            aria-hidden="true"
          />
        )}
        {showLabel ? label : config.shortName}
      </span>

      {/* Tooltip */}
      {tooltipVisible && (
        <span
          ref={tooltipRef}
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            whitespace-nowrap rounded-md bg-navy-900 text-cream text-xs
            font-body px-3 py-1.5 shadow-lg pointer-events-none
            animate-in"
        >
          {tooltipText}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
              border-4 border-transparent border-t-navy-900"
            aria-hidden="true"
          />
        </span>
      )}
    </span>
  );
}
