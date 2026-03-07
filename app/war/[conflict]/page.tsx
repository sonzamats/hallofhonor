import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CONFLICTS, AWARDS } from '@/lib/awards-config';
import { getRecipients } from '@/lib/queries';
import RecipientGrid from '@/components/recipients/RecipientGrid';

interface PageProps {
  params: Promise<{ conflict: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { conflict: slug } = await params;
  const conflict = CONFLICTS.find((c) => c.slug === slug);

  if (!conflict) {
    return { title: 'Conflict Not Found | Hall of Valor' };
  }

  return {
    title: `${conflict.name} (${conflict.dateRange}) | Hall of Valor`,
    description: `Valor decoration recipients from the ${conflict.name} (${conflict.dateRange}). Explore the heroes who served and their awards.`,
    openGraph: {
      title: `${conflict.name} | Hall of Valor`,
      description: `Decorated service members of the ${conflict.name} (${conflict.dateRange}).`,
      type: 'website',
    },
  };
}

export default async function ConflictPage({ params }: PageProps) {
  const { conflict: slug } = await params;
  const conflict = CONFLICTS.find((c) => c.slug === slug);

  if (!conflict) notFound();

  let recipientData;
  try {
    recipientData = await getRecipients({ conflict: slug, limit: 24 });
  } catch {
    recipientData = { recipients: [], total: 0, page: 1, totalPages: 0 };
  }

  // Fetch award breakdown counts
  const awardBreakdown: { name: string; shortName: string; colorHex: string; count: number }[] = [];
  try {
    for (const award of AWARDS) {
      const result = await getRecipients({ conflict: slug, award: award.slug, limit: 1 });
      if (result.total > 0) {
        awardBreakdown.push({
          name: award.name,
          shortName: award.shortName,
          colorHex: award.colorHex,
          count: result.total,
        });
      }
    }
  } catch {
    // Award breakdown is supplementary; continue without it
  }

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Header */}
      <section className="border-b border-navy-800 bg-navy-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <span className="mb-3 block text-sm font-semibold uppercase tracking-wider text-gold-400">
            Conflict
          </span>
          <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
            {conflict.name}
          </h1>
          <p className="text-xl text-text-muted">{conflict.dateRange}</p>

          <div className="mt-6 flex items-center gap-4 text-sm text-text-muted">
            <span>
              <span className="font-semibold text-cream">
                {recipientData.total.toLocaleString()}
              </span>{' '}
              decorated recipients
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Award Breakdown */}
        {awardBreakdown.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-6 font-display text-2xl font-bold text-cream">
              Award Breakdown
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {awardBreakdown
                .sort((a, b) => b.count - a.count)
                .map((award) => (
                  <div
                    key={award.shortName}
                    className="flex items-center gap-3 rounded-lg border border-navy-800 bg-navy-900/50 p-4"
                  >
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: award.colorHex }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-cream">
                        {award.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {award.count.toLocaleString()} awarded
                      </p>
                    </div>
                    <span className="font-display text-lg font-bold text-cream">
                      {award.count.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Recipients */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-cream">
              Recipients
            </h2>
            {recipientData.total > 24 && (
              <a
                href={`/search?conflict=${slug}`}
                className="text-sm text-gold-400 transition-colors hover:text-gold-300"
              >
                View all {recipientData.total.toLocaleString()} recipients
              </a>
            )}
          </div>
          {recipientData.recipients.length > 0 ? (
            <RecipientGrid recipients={recipientData.recipients} />
          ) : (
            <div className="rounded-lg border border-dashed border-navy-700 bg-navy-900/30 p-12 text-center">
              <p className="text-text-muted">
                No recipients found for {conflict.name}. Data may still be loading.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
