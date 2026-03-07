'use client';

import { motion } from 'framer-motion';
import RecipientCard from './RecipientCard';

interface GridRecipient {
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
}

interface GridAward {
  slug: string;
  shortName: string;
  colorHex: string;
}

interface RecipientGridProps {
  recipients: GridRecipient[];
  awards?: Record<string, GridAward[]>;
  loading?: boolean;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

function SkeletonCard() {
  return (
    <div
      className="bg-navy-900/80 rounded-lg border-l-[3px] border-navy-700 p-4 animate-pulse"
      aria-hidden="true"
    >
      <div className="h-5 w-3/4 bg-navy-700/60 rounded mb-2" />
      <div className="h-3.5 w-1/2 bg-navy-700/40 rounded mb-3" />
      <div className="h-3 w-1/3 bg-navy-700/30 rounded mb-2" />
      <div className="flex gap-1.5 mt-2">
        <div className="h-4 w-8 bg-navy-700/30 rounded-full" />
        <div className="h-4 w-8 bg-navy-700/30 rounded-full" />
      </div>
    </div>
  );
}

export default function RecipientGrid({
  recipients,
  awards,
  loading = false,
}: RecipientGridProps) {
  if (loading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        role="status"
        aria-label="Loading recipients"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
        <span className="sr-only">Loading recipients...</span>
      </div>
    );
  }

  if (recipients.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-body text-text-muted text-lg">No recipients found.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {recipients.map((recipient, i) => (
        <RecipientCard
          key={recipient.id}
          recipient={recipient}
          awards={awards?.[recipient.id]}
          index={i}
        />
      ))}
    </motion.div>
  );
}
