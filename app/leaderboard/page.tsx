'use client';

import { useState, useEffect, useCallback } from 'react';
import { CONFLICTS, BRANCHES, US_STATES } from '@/lib/awards-config';
import AwardBadge from '@/components/awards/AwardBadge';

interface LeaderboardEntry {
  id: string;
  full_name: string;
  rank: string | null;
  branch: string | null;
  conflict: string | null;
  entered_service_state: string | null;
  score: number;
  recipient_awards: {
    id: string;
    with_valor: boolean;
    oak_leaf_clusters: number;
    awards: {
      slug: string;
      name: string;
      short_name: string | null;
      color_hex: string | null;
    };
  }[];
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [conflict, setConflict] = useState('');
  const [branch, setBranch] = useState('');
  const [state, setState] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (conflict) params.set('conflict', conflict);
      if (branch) params.set('branch', branch);
      if (state) params.set('state', state);

      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [conflict, branch, state]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Header */}
      <section className="border-b border-navy-800 bg-navy-900/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
            Most Decorated
          </h1>
          <p className="max-w-2xl text-lg text-text-muted">
            Service members ranked by their cumulative valor decorations. Scores
            are weighted by award precedence, with the Medal of Honor carrying
            the highest weight.
          </p>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-3">
            <select
              value={conflict}
              onChange={(e) => setConflict(e.target.value)}
              className="rounded-md border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-cream focus:border-gold-400 focus:outline-none"
            >
              <option value="">All Conflicts</option>
              {CONFLICTS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="rounded-md border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-cream focus:border-gold-400 focus:outline-none"
            >
              <option value="">All Branches</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-md border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-cream focus:border-gold-400 focus:outline-none"
            >
              <option value="">All States</option>
              {Object.entries(US_STATES || {})
                .sort(([, a], [, b]) => a.localeCompare(b))
                .map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg border border-navy-800 bg-navy-900/50"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-text-muted">
              No results found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table Header */}
            <div className="hidden grid-cols-12 gap-4 px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-text-muted sm:grid">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Name</div>
              <div className="col-span-2">Branch</div>
              <div className="col-span-3">Awards</div>
              <div className="col-span-2 text-right">Score</div>
            </div>

            {entries.map((entry, index) => {
              const isTop3 = index < 3;
              return (
                <a
                  key={entry.id}
                  href={`/recipient/${entry.id}`}
                  className={`group grid grid-cols-12 items-center gap-4 rounded-lg border px-4 py-3 transition-all duration-300 animate-in ${
                    isTop3
                      ? 'border-gold-500/20 bg-gold-500/5 hover:border-gold-500/40 hover:bg-gold-500/10'
                      : 'border-navy-800 bg-navy-900/50 hover:border-navy-700 hover:bg-navy-900/80'
                  }`}
                  style={{ animationDelay: `${index * 20}ms`, animationFillMode: 'both' }}
                >
                  {/* Rank */}
                  <div className="col-span-2 sm:col-span-1">
                    <span
                      className={`font-display text-lg font-bold ${
                        index === 0
                          ? 'text-gold-400'
                          : index === 1
                            ? 'text-gray-300'
                            : index === 2
                              ? 'text-amber-600'
                              : 'text-text-muted'
                      }`}
                    >
                      #{index + 1}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="col-span-10 sm:col-span-4">
                    <p className="font-display text-base font-semibold text-cream group-hover:text-gold-300">
                      {entry.full_name}
                    </p>
                    <p className="text-xs text-text-muted sm:hidden">
                      {[entry.rank, entry.branch].filter(Boolean).join(' — ')}
                    </p>
                  </div>

                  {/* Branch */}
                  <div className="hidden text-sm text-text-muted sm:col-span-2 sm:block">
                    <p>{entry.rank}</p>
                    <p className="text-xs">{entry.branch}</p>
                  </div>

                  {/* Award Badges */}
                  <div className="col-span-8 flex flex-wrap gap-1 sm:col-span-3">
                    {entry.recipient_awards?.map((ra) => (
                      <AwardBadge
                        key={ra.id}
                        award={ra.awards?.slug ?? ''}
                        size="sm"
                      />
                    ))}
                  </div>

                  {/* Score */}
                  <div className="col-span-4 text-right sm:col-span-2">
                    <span
                      className={`font-display text-xl font-bold ${
                        isTop3 ? 'text-gold-400' : 'text-cream'
                      }`}
                    >
                      {entry.score}
                    </span>
                    <p className="text-xs text-text-muted">points</p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
