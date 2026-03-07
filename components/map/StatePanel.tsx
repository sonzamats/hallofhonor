'use client';

import { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AWARDS } from '@/lib/awards-config';

interface StatePanelProps {
  stateName: string;
  stateCode: string;
  isOpen: boolean;
  onClose: () => void;
  activeAward: string | null;
}

export default function StatePanel({
  stateName,
  stateCode,
  isOpen,
  onClose,
  activeAward,
}: StatePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Basic focus trap
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
      // Focus the close button when panel opens
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Prevent body scroll when panel is open on mobile
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

  const totalDecorations = 0; // Placeholder until data is loaded

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
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
              stateCode={stateCode}
              totalDecorations={totalDecorations}
              activeAward={activeAward}
              onClose={onClose}
              closeButtonRef={closeButtonRef}
            />
          </motion.div>

          {/* Mobile: Bottom sheet */}
          <motion.div
            ref={!panelRef.current ? panelRef : undefined}
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
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-navy-700/50 bg-navy-900 shadow-2xl md:hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-navy-600" />
            </div>

            <PanelContent
              stateName={stateName}
              stateCode={stateCode}
              totalDecorations={totalDecorations}
              activeAward={activeAward}
              onClose={onClose}
              closeButtonRef={closeButtonRef}
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
  stateCode: string;
  totalDecorations: number;
  activeAward: string | null;
  onClose: () => void;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
}

function PanelContent({
  stateName,
  stateCode,
  totalDecorations,
  activeAward,
  onClose,
  closeButtonRef,
}: PanelContentProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="relative flex-shrink-0 border-b border-navy-700/50 px-6 py-5">
        <h2 className="font-display text-2xl font-bold text-cream pr-10">
          {stateName}
        </h2>
        <p className="mt-1 font-body text-sm text-text-muted">
          {totalDecorations.toLocaleString()} total decorations
        </p>

        {/* Close button */}
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
          />
          {AWARDS.map((award) => (
            <TabPill
              key={award.slug}
              label={award.shortName}
              isActive={activeAward === award.slug}
              colorHex={award.colorHex}
            />
          ))}
        </div>
      </div>

      {/* Recipient list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <p className="font-body text-sm text-text-muted">
          Loading recipients...
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small tab pill used inside the panel                                */
/* ------------------------------------------------------------------ */

function TabPill({
  label,
  isActive,
  colorHex,
}: {
  label: string;
  isActive: boolean;
  colorHex: string;
}) {
  return (
    <button
      className={`
        flex-shrink-0 rounded-full px-3 py-1 font-body text-xs font-medium
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-1 focus-visible:ring-offset-navy-900
      `}
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
