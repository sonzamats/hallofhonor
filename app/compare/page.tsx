'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { US_STATES, AWARDS, AWARD_BY_SLUG } from '@/lib/awards-config';
import { stateCodeToName } from '@/lib/utils';

interface StateSummary {
  state: string;
  totalRecipients: number;
  awardBreakdown: Record<string, number>;
  topRecipients: {
    id: string;
    full_name: string;
    rank: string | null;
    branch: string | null;
  }[];
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const statesParam = searchParams.get('states') ?? '';
  const [state1, state2] = statesParam.split(',');

  const [selectedState1, setSelectedState1] = useState(state1 ?? '');
  const [selectedState2, setSelectedState2] = useState(state2 ?? '');
  const [data1, setData1] = useState<StateSummary | null>(null);
  const [data2, setData2] = useState<StateSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const updateUrl = useCallback(
    (s1: string, s2: string) => {
      if (s1 && s2) {
        router.replace(`/compare?states=${s1},${s2}`, { scroll: false });
      }
    },
    [router]
  );

  const handleState1Change = useCallback(
    (value: string) => {
      setSelectedState1(value);
      updateUrl(value, selectedState2);
    },
    [selectedState2, updateUrl]
  );

  const handleState2Change = useCallback(
    (value: string) => {
      setSelectedState2(value);
      updateUrl(selectedState1, value);
    },
    [selectedState1, updateUrl]
  );

  useEffect(() => {
    if (!selectedState1 || !selectedState2) return;

    async function fetchComparison() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/compare?states=${selectedState1},${selectedState2}`
        );
        if (!res.ok) throw new Error('Failed to fetch comparison');
        const data = await res.json();
        setData1(data.state1 ?? null);
        setData2(data.state2 ?? null);
      } catch {
        setData1(null);
        setData2(null);
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();
  }, [selectedState1, selectedState2]);

  const sortedStates = Object.entries(US_STATES).sort(([, a], [, b]) =>
    a.localeCompare(b)
  );

  const allAwardSlugs = AWARDS.map((a) => a.slug);

  return (
    <div className="min-h-screen bg-navy-950">
      <section className="border-b border-navy-800 bg-navy-900/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
            Compare States
          </h1>
          <p className="max-w-2xl text-lg text-text-muted">
            Side-by-side comparison of valor decoration recipients across two
            states. Select your states below to see how they compare.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-text-muted">
              First State
            </label>
            <select
              value={selectedState1}
              onChange={(e) => handleState1Change(e.target.value)}
              className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-3 text-cream focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
            >
              <option value="">Select a state</option>
              {sortedStates.map(([code, name]) => (
                <option key={code} value={code} disabled={code === selectedState2}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-text-muted">
              Second State
            </label>
            <select
              value={selectedState2}
              onChange={(e) => handleState2Change(e.target.value)}
              className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-3 text-cream focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
            >
              <option value="">Select a state</option>
              {sortedStates.map(([code, name]) => (
                <option key={code} value={code} disabled={code === selectedState1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-navy-600 border-t-gold-400" />
            <p className="mt-4 text-text-muted">Loading comparison data...</p>
          </div>
        )}

        {!loading && (!selectedState1 || !selectedState2) && (
          <div className="rounded-lg border border-dashed border-navy-700 bg-navy-900/30 py-20 text-center">
            <svg
              className="mx-auto mb-4 h-16 w-16 text-navy-700"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
            <h3 className="mb-2 font-display text-xl font-semibold text-cream">
              Select Two States
            </h3>
            <p className="text-sm text-text-muted">
              Choose two states above to see a side-by-side breakdown of their
              valor decoration recipients.
            </p>
          </div>
        )}

        {!loading && data1 && data2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-6 text-center">
                <h3 className="mb-1 font-display text-lg font-semibold text-cream">
                  {stateCodeToName(data1.state)}
                </h3>
                <p className="font-display text-4xl font-bold text-gold-400">
                  {data1.totalRecipients.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-text-muted">Total Recipients</p>
              </div>
              <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-6 text-center">
                <h3 className="mb-1 font-display text-lg font-semibold text-cream">
                  {stateCodeToName(data2.state)}
                </h3>
                <p className="font-display text-4xl font-bold text-gold-400">
                  {data2.totalRecipients.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-text-muted">Total Recipients</p>
              </div>
            </div>

            <section className="mb-10">
              <h2 className="mb-6 font-display text-2xl font-bold text-cream">
                Award Breakdown
              </h2>
              <div className="space-y-3">
                {allAwardSlugs
                  .filter(
                    (slug) =>
                      (data1.awardBreakdown[slug] ?? 0) > 0 ||
                      (data2.awardBreakdown[slug] ?? 0) > 0
                  )
                  .map((slug) => {
                    const config = AWARD_BY_SLUG[slug];
                    const count1 = data1.awardBreakdown[slug] ?? 0;
                    const count2 = data2.awardBreakdown[slug] ?? 0;
                    const maxCount = Math.max(count1, count2, 1);

                    return (
                      <div
                        key={slug}
                        className="rounded-lg border border-navy-800 bg-navy-900/50 p-4"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: config?.colorHex ?? '#8a9bb5' }}
                          />
                          <span className="text-sm font-medium text-cream">
                            {config?.name ?? slug}
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                              <span>{stateCodeToName(data1.state)}</span>
                              <span className="font-semibold text-cream">{count1}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-navy-800">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: config?.colorHex ?? '#8a9bb5' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(count1 / maxCount) * 100}%` }}
                                transition={{ duration: 0.6 }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                              <span>{stateCodeToName(data2.state)}</span>
                              <span className="font-semibold text-cream">{count2}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-navy-800">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: config?.colorHex ?? '#8a9bb5' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(count2 / maxCount) * 100}%` }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>

            <section>
              <h2 className="mb-6 font-display text-2xl font-bold text-cream">
                Notable Recipients
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
                    {stateCodeToName(data1.state)}
                  </h3>
                  <div className="space-y-2">
                    {data1.topRecipients.map((r) => (
                      <a
                        key={r.id}
                        href={`/recipient/${r.id}`}
                        className="block rounded-md border border-navy-800 bg-navy-900/50 px-4 py-3 transition-colors hover:border-navy-700"
                      >
                        <p className="font-medium text-cream">{r.full_name}</p>
                        <p className="text-xs text-text-muted">
                          {[r.rank, r.branch].filter(Boolean).join(' — ')}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
                    {stateCodeToName(data2.state)}
                  </h3>
                  <div className="space-y-2">
                    {data2.topRecipients.map((r) => (
                      <a
                        key={r.id}
                        href={`/recipient/${r.id}`}
                        className="block rounded-md border border-navy-800 bg-navy-900/50 px-4 py-3 transition-colors hover:border-navy-700"
                      >
                        <p className="font-medium text-cream">{r.full_name}</p>
                        <p className="text-xs text-text-muted">
                          {[r.rank, r.branch].filter(Boolean).join(' — ')}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-navy-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-600 border-t-gold-400" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
