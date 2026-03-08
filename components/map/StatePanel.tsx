'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AWARDS } from '@/lib/awards-config';

interface StatePanelProps {
  stateName: string;
  stateCode: string;
  isOpen: boolean;
  onClose: () => void;
  activeAward: string | null;
  onAwardSelect?: (slug: string | null) => void;
}

interface StateSummary {
  totalRecipients: number;
  awardBreakdown: Record<string, number>;
  topRecipients: {
    id: string;
    full_name: string;
    rank: string | null;
    branch: string | null;
  }[];
}

export default function StatePanel({
  stateName,
  stateCode,
  isOpen,
  onClose,
  activeAward,
  onAwardSelect,
}: StatePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [data, setData] = useState<StateSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch state data when panel opens
  useEffect(() => {
    if (!isOpen || !stateCode) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/state/${stateCode}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [isOpen, stateCode]);

  // Focus trap and Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const totalDecorations = data?.totalRecipients ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none md:pointer-events-none"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Desktop: Right drawer */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label={`${stateName} award details`}
            aria-modal="true"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-50 hidden h-full w-[420px] flex-col border-l border-navy-700/50 bg-navy-900 shadow-2xl md:flex"
          >
            <PanelContent
              stateName={stateName}
              totalDecorations={totalDecorations}
              activeAward={activeAward}
              onClose={onClose}
              closeButtonRef={closeButtonRef}
              data={data}
              loading={loading}
              onAwardSelect={onAwardSelect}
            />
          </motion.div>

          {/* Mobile: Bottom sheet */}
          <motion.div
            role="dialog"
            aria-label={`${stateName} award details`}
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-navy-700/50 bg-navy-900 shadow-2xl md:hidden"
          >
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-navy-600" />
            </div>
            <PanelContent
              stateName={stateName}
              totalDecorations={totalDecorations}
              activeAward={activeAward}
              onClose={onClose}
              closeButtonRef={closeButtonRef}
              data={data}
              loading={loading}
              onAwardSelect={onAwardSelect}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Shared inner content                                                */
/* ------------------------------------------------------------------ */

interface PanelContentProps {
  stateName: string;
  totalDecorations: number;
  activeAward: string | null;
  onClose: () => void;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  data: StateSummary | null;
  loading: boolean;
  onAwardSelect?: (slug: string | null) => void;
}

function PanelContent({
  stateName,
  totalDecorations,
  activeAward,
  onClose,
  closeButtonRef,
  data,
  loading,
  onAwardSelect,
}: PanelContentProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="relative flex-shrink-0 border-b border-navy-700/50 px-6 py-5">
        <h2 className="font-display text-2xl font-bold text-cream pr-10">
          {stateName}
        </h2>
        <p className="mt-1 font-body text-sm text-text-muted">
          {totalDecorations.toLocaleString()} total recipients
        </p>

        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close panel"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-navy-800 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        </button>
      </div>

      {/* Award filter tabs */}
      <div
        className="flex-shrink-0 overflow-x-auto border-b border-navy-700/50 px-6 py-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-2">
          <TabPill
            label="All"
            isActive={activeAward === null}
            colorHex="#c9a84c"
            onClick={() => onAwardSelect?.(null)}
          />
          {AWARDS.map((award) => (
            <TabPill
              key={award.slug}
              label={award.shortName}
              isActive={activeAward === award.slug}
              colorHex={award.colorHex}
              onClick={() => onAwardSelect?.(award.slug)}
            />
          ))}
        </div>
      </div>

      {/* Recipient list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-navy-800/50"
              />
            ))}
          </div>
        ) : !data || data.topRecipients.length === 0 ? (
          <p className="font-body text-sm text-text-muted">
            No recipients found for this state.
          </p>
        ) : (
          <div className="space-y-2">
            {data.topRecipients.map((r) => (
              <a
                key={r.id}
                href={`/recipient/${r.id}`}
                className="block rounded-lg border border-navy-800 bg-navy-800/30 px-4 py-3 transition-colors hover:border-navy-700 hover:bg-navy-800/60"
              >
                <p className="font-display text-sm font-semibold text-cream">
                  {r.full_name}
                </p>
                <p className="text-xs text-text-muted">
                  {[r.rank, r.branch].filter(Boolean).join(' — ')}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small tab pill                                                      */
/* ------------------------------------------------------------------ */

function TabPill({
  label,
  isActive,
  colorHex,
  onClick,
}: {
  label: string;
  isActive: boolean;
  colorHex: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 rounded-full px-3 py-1 font-body text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-1 focus-visible:ring-offset-navy-900"
      style={{
        borderWidth: '1.5px',
        borderStyle: 'solid',
        borderColor: colorHex,
        backgroundColor: isActive ? colorHex : 'transparent',
        color: isActive ? '#ffffff' : colorHex,
      }}
    >
      {label}
    </button>
  );
}
