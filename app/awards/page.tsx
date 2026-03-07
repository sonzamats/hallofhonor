import { Metadata } from 'next';
import { AWARDS } from '@/lib/awards-config';
import AwardCard from '@/components/awards/AwardCard';

export const metadata: Metadata = {
  title: 'Awards & Decorations | Hall of Valor',
  description:
    'Explore all U.S. military valor decorations in order of precedence, from the Medal of Honor to the Prisoner of War Medal.',
};

export default async function AwardsPage() {
  const sortedAwards = [...AWARDS].sort(
    (a, b) => a.precedenceRank - b.precedenceRank
  );

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Header */}
      <section className="border-b border-navy-800 bg-navy-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
            Awards & Decorations
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-text-muted">
            The United States military awards system recognizes acts of valor,
            heroism, and meritorious service. These decorations are presented in
            their official order of precedence, with the highest honor — the
            Medal of Honor — at the top.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Awards in precedence order — MOH featured largest */}
        <div className="space-y-8">
          {sortedAwards.map((award, index) => {
            const isHighest = index === 0;
            const isSecondTier = award.precedenceRank === 2;

            return (
              <div
                key={award.slug}
                className={
                  isHighest
                    ? 'mx-auto max-w-3xl'
                    : isSecondTier
                      ? 'mx-auto max-w-2xl'
                      : 'mx-auto max-w-xl'
                }
              >
                {/* Precedence Group Labels */}
                {index === 0 && (
                  <div className="mb-4 text-center">
                    <span className="inline-block rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-400">
                      Highest Military Decoration
                    </span>
                  </div>
                )}
                {award.precedenceRank === 2 && sortedAwards[index - 1]?.precedenceRank !== 2 && (
                  <div className="mb-4 mt-4 text-center">
                    <div className="mx-auto mb-4 h-px w-24 bg-gradient-to-r from-transparent via-navy-600 to-transparent" />
                    <span className="inline-block text-xs font-semibold uppercase tracking-widest text-text-muted">
                      Second Highest — Service Crosses
                    </span>
                  </div>
                )}
                {award.precedenceRank === 6 && sortedAwards[index - 1]?.precedenceRank !== 6 && (
                  <div className="mb-4 mt-4 text-center">
                    <div className="mx-auto mb-4 h-px w-24 bg-gradient-to-r from-transparent via-navy-600 to-transparent" />
                    <span className="inline-block text-xs font-semibold uppercase tracking-widest text-text-muted">
                      Valor & Gallantry Decorations
                    </span>
                  </div>
                )}
                {award.precedenceRank >= 11 && sortedAwards[index - 1]?.precedenceRank < 11 && (
                  <div className="mb-4 mt-4 text-center">
                    <div className="mx-auto mb-4 h-px w-24 bg-gradient-to-r from-transparent via-navy-600 to-transparent" />
                    <span className="inline-block text-xs font-semibold uppercase tracking-widest text-text-muted">
                      Meritorious & Service Decorations
                    </span>
                  </div>
                )}

                <AwardCard
                  award={{
                    slug: award.slug,
                    name: award.name,
                    shortName: award.shortName,
                    colorHex: award.colorHex,
                    establishedYear: award.establishedYear,
                    description: award.description,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Compare Two Awards Placeholder */}
        <section className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-navy-600 to-transparent" />
            <h2 className="mb-3 font-display text-2xl font-bold text-cream">
              Compare Two Awards
            </h2>
            <p className="mb-6 text-text-muted">
              Side-by-side comparison of eligibility criteria, total recipients,
              and historical context across any two decorations.
            </p>
            <div className="rounded-lg border border-dashed border-navy-700 bg-navy-900/30 p-8 text-center text-sm text-text-muted">
              Award comparison feature coming soon.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
