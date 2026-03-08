'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AWARDS, BRANCHES, CONFLICTS, US_STATES } from '@/lib/awards-config';
import { useDebounce, useKeyPress, useMediaQuery } from '@/lib/hooks';
import RecipientGrid from '@/components/recipients/RecipientGrid';

type SortOption = 'relevance' | 'name-asc' | 'most-decorated';

interface SearchFilters {
  awards: string[];
  branch: string;
  conflict: string;
  state: string;
  posthumous: boolean | undefined;
  pow: boolean | undefined;
}

interface SearchResult {
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

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    awards: [],
    branch: '',
    conflict: '',
    state: '',
    posthumous: undefined,
    pow: undefined,
  });
  const [sort, setSort] = useState<SortOption>('relevance');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useKeyPress('/', useCallback(() => {
    searchInputRef.current?.focus();
  }, []));

  useEffect(() => {
    if (!isMobile) setFiltersOpen(true);
  }, [isMobile]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filters, sort]);

  useEffect(() => {
    async function fetchResults() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery) params.set('q', debouncedQuery);
        if (filters.branch) params.set('branch', filters.branch);
        if (filters.conflict) params.set('conflict', filters.conflict);
        if (filters.state) params.set('state', filters.state);
        if (filters.posthumous !== undefined) params.set('posthumous', String(filters.posthumous));
        if (filters.pow !== undefined) params.set('pow', String(filters.pow));
        if (filters.awards.length > 0) params.set('awards', filters.awards.join(','));
        params.set('sort', sort);
        params.set('page', String(page));

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
      } catch {
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [debouncedQuery, filters, sort, page]);

  const toggleAwardFilter = useCallback((slug: string) => {
    setFilters((prev) => ({
      ...prev,
      awards: prev.awards.includes(slug)
        ? prev.awards.filter((a) => a !== slug)
        : [...prev.awards, slug],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      awards: [],
      branch: '',
      conflict: '',
      state: '',
      posthumous: undefined,
      pow: undefined,
    });
    setQuery('');
  }, []);

  const activeFilterCount =
    filters.awards.length +
    (filters.branch ? 1 : 0) +
    (filters.conflict ? 1 : 0) +
    (filters.state ? 1 : 0) +
    (filters.posthumous !== undefined ? 1 : 0) +
    (filters.pow !== undefined ? 1 : 0);

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Search Header */}
      <div className="border-b border-navy-800 bg-navy-900/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
            Search Recipients
          </h1>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                className="h-5 w-5 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, rank, unit, or citation text..."
              autoFocus
              className="w-full rounded-lg border border-navy-700 bg-navy-800 py-3 pl-12 pr-4 text-cream placeholder-text-muted transition-colors focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <kbd className="hidden rounded border border-navy-600 bg-navy-700 px-2 py-0.5 font-body text-xs text-text-muted sm:inline">
                /
              </kbd>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-md border border-navy-700 bg-navy-800 px-3 py-1.5 text-sm text-cream transition-colors hover:border-navy-600 md:hidden"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-gold-500 px-1.5 py-0.5 text-xs font-semibold text-navy-950">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <p className="text-sm text-text-muted">
                {loading ? 'Searching...' : `${total.toLocaleString()} results`}
              </p>
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-md border border-navy-700 bg-navy-800 px-3 py-1.5 text-sm text-cream focus:border-gold-400 focus:outline-none"
            >
              <option value="relevance">Relevance</option>
              <option value="name-asc">Name A-Z</option>
              <option value="most-decorated">Most Decorated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Filter Sidebar */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 overflow-y-auto bg-navy-900 p-6 md:static md:z-auto md:w-64 md:shrink-0 md:rounded-lg md:border md:border-navy-800 md:bg-navy-900/50 md:p-0"
              >
                <div className="md:sticky md:top-4 md:p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-cream">
                      Filters
                    </h2>
                    <div className="flex items-center gap-2">
                      {activeFilterCount > 0 && (
                        <button
                          onClick={clearFilters}
                          className="text-xs text-gold-400 hover:text-gold-300"
                        >
                          Clear all
                        </button>
                      )}
                      <button
                        onClick={() => setFiltersOpen(false)}
                        className="text-text-muted hover:text-cream md:hidden"
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Award Type Checkboxes */}
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
                      Award Type
                    </h3>
                    <div className="space-y-2">
                      {AWARDS.map((award) => (
                        <label
                          key={award.slug}
                          className="flex cursor-pointer items-center gap-2 text-sm text-cream"
                        >
                          <input
                            type="checkbox"
                            checked={filters.awards.includes(award.slug)}
                            onChange={() => toggleAwardFilter(award.slug)}
                            className="rounded border-navy-600 bg-navy-800 text-gold-500 focus:ring-gold-400"
                          />
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: award.colorHex }}
                          />
                          {award.shortName}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Branch Select */}
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
                      Branch
                    </h3>
                    <select
                      value={filters.branch}
                      onChange={(e) => setFilters((prev) => ({ ...prev, branch: e.target.value }))}
                      className="w-full rounded-md border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-cream focus:border-gold-400 focus:outline-none"
                    >
                      <option value="">All Branches</option>
                      {BRANCHES.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Conflict Select */}
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
                      Conflict
                    </h3>
                    <select
                      value={filters.conflict}
                      onChange={(e) => setFilters((prev) => ({ ...prev, conflict: e.target.value }))}
                      className="w-full rounded-md border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-cream focus:border-gold-400 focus:outline-none"
                    >
                      <option value="">All Conflicts</option>
                      {CONFLICTS.map((conflict) => (
                        <option key={conflict.slug} value={conflict.slug}>
                          {conflict.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* State Dropdown */}
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
                      State
                    </h3>
                    <select
                      value={filters.state}
                      onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value }))}
                      className="w-full rounded-md border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-cream focus:border-gold-400 focus:outline-none"
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

                  {/* Toggles */}
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center justify-between text-sm text-cream">
                      <span>Posthumous Only</span>
                      <button
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            posthumous: prev.posthumous === true ? undefined : true,
                          }))
                        }
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          filters.posthumous === true ? 'bg-gold-500' : 'bg-navy-700'
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-cream transition-transform ${
                            filters.posthumous === true ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>
                    <label className="flex cursor-pointer items-center justify-between text-sm text-cream">
                      <span>POW Recipients</span>
                      <button
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            pow: prev.pow === true ? undefined : true,
                          }))
                        }
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          filters.pow === true ? 'bg-gold-500' : 'bg-navy-700'
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-cream transition-transform ${
                            filters.pow === true ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Results */}
          <div className="flex-1">
            {results.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <svg
                  className="mb-4 h-16 w-16 text-navy-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <h3 className="mb-2 font-display text-xl font-semibold text-cream">
                  {debouncedQuery || activeFilterCount > 0
                    ? 'No results found'
                    : 'Begin your search'}
                </h3>
                <p className="max-w-md text-sm text-text-muted">
                  {debouncedQuery || activeFilterCount > 0
                    ? 'Try adjusting your search terms or filters to find what you are looking for.'
                    : 'Search by name, rank, unit, or citation text. Use the filters to narrow your results.'}
                </p>
              </div>
            ) : (
              <>
                <RecipientGrid recipients={results} loading={loading} />

                {/* Pagination */}
                {total > 20 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-md border border-navy-700 bg-navy-800 px-4 py-2 text-sm text-cream transition-colors hover:border-navy-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 text-sm text-text-muted">
                      Page {page} of {Math.ceil(total / 20)}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= Math.ceil(total / 20)}
                      className="rounded-md border border-navy-700 bg-navy-800 px-4 py-2 text-sm text-cream transition-colors hover:border-navy-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
