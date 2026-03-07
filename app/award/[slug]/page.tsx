import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAwardBySlug, getAwardStats, getRecipients } from '@/lib/queries';
import { AWARD_BY_SLUG } from '@/lib/awards-config';
import AwardStats from '@/components/awards/AwardStats';
import RecipientGrid from '@/components/recipients/RecipientGrid';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const config = AWARD_BY_SLUG[slug];
  if (!config) {
    return { title: 'Award Not Found | Hall of Valor' };
  }

  return {
    title: `${config.name} | Hall of Valor`,
    description: config.description,
    openGraph: {
      title: `${config.name} | Hall of Valor`,
      description: config.description,
      type: 'website',
    },
  };
}

export default async function AwardDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const config = AWARD_BY_SLUG[slug];
  if (!config) notFound();

  let award;
  let stats;
  let recipientData;

  try {
    [award, stats, recipientData] = await Promise.all([
      getAwardBySlug(slug),
      getAwardStats(slug),
      getRecipients({ award: slug, limit: 12 }),
    ]);
  } catch {
    notFound();
  }

  if (!award) notFound();

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Header */}
      <section
        className="relative overflow-hidden border-b border-navy-800"
        style={{
          background: `linear-gradient(135deg, ${config.colorHex}18 0%, transparent 60%, ${config.colorHex}0a 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/30 to-navy-950" />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="h-4 w-4 rounded-full shadow-lg"
              style={{
                backgroundColor: config.colorHex,
                boxShadow: `0 0 12px ${config.colorHex}60`,
              }}
            />
            <span className="text-sm font-semibold uppercase tracking-wider text-text-muted">
              Precedence #{config.precedenceRank}
            </span>
          </div>
          <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
            {config.name}
          </h1>
          <p className="mb-4 max-w-3xl text-lg leading-relaxed text-text-muted">
            {config.description}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-muted">
            <span>
              Established{' '}
              <span className="font-semibold text-cream">
                {config.establishedYear}
              </span>
            </span>
            <span className="text-navy-600">&bull;</span>
            <span>
              Branch Variants:{' '}
              <span className="text-cream">
                {config.branchVariants.join(', ')}
              </span>
            </span>
            {stats && (
              <>
                <span className="text-navy-600">&bull;</span>
                <span>
                  Total Awarded:{' '}
                  <span className="font-semibold text-cream">
                    {stats.totalAwarded.toLocaleString()}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Statistics */}
        {stats && (
          <section className="mb-16">
            <h2 className="mb-6 font-display text-2xl font-bold text-cream">
              Award Statistics
            </h2>
            <AwardStats stats={stats} />
          </section>
        )}

        {/* Notable Recipients Placeholder */}
        <section className="mb-16">
          <h2 className="mb-6 font-display text-2xl font-bold text-cream">
            Notable Recipients
          </h2>
          <div className="rounded-lg border border-dashed border-navy-700 bg-navy-900/30 p-8 text-center">
            <p className="text-text-muted">
              Featured recipients of the {config.name} will be highlighted here.
            </p>
          </div>
        </section>

        {/* Recipient Grid */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-cream">
              Recipients
            </h2>
            {recipientData && recipientData.total > 12 && (
              <a
                href={`/search?awards=${slug}`}
                className="text-sm text-gold-400 transition-colors hover:text-gold-300"
              >
                View all {recipientData.total.toLocaleString()} recipients
              </a>
            )}
          </div>
          {recipientData && recipientData.recipients.length > 0 ? (
            <RecipientGrid recipients={recipientData.recipients} />
          ) : (
            <p className="text-text-muted">
              No recipients found for this award.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
