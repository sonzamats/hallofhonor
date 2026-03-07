import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRecipientById } from '@/lib/queries';
import { AWARD_BY_SLUG } from '@/lib/awards-config';
import { formatDate, stateCodeToName } from '@/lib/utils';
import { calculateRecipientScore } from '@/lib/scoring';
import RibbonRack from '@/components/recipients/RibbonRack';
import CitationBlock from '@/components/recipients/CitationBlock';
import ServiceTimeline from '@/components/recipients/ServiceTimeline';
import StatCounter from '@/components/ui/StatCounter';
import AwardBadge from '@/components/awards/AwardBadge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const recipient = await getRecipientById(id);
    if (!recipient) {
      return { title: 'Recipient Not Found | Hall of Valor' };
    }

    const awardNames = recipient.recipient_awards
      .map((ra) => ra.awards?.name)
      .filter(Boolean)
      .join(', ');

    return {
      title: `${recipient.full_name} | Hall of Valor`,
      description: `${recipient.rank ?? ''} ${recipient.full_name}, ${recipient.branch ?? 'U.S. Military'}. Decorated with ${awardNames || 'valor awards'} for service during ${recipient.conflict ?? 'military operations'}.`,
      openGraph: {
        title: `${recipient.full_name} | Hall of Valor`,
        description: `${recipient.rank ?? ''} ${recipient.full_name} — ${awardNames || 'decorated service member'}`,
        type: 'profile',
      },
    };
  } catch {
    return { title: 'Recipient | Hall of Valor' };
  }
}

export default async function RecipientPage({ params }: PageProps) {
  const { id } = await params;

  let recipient;
  try {
    recipient = await getRecipientById(id);
  } catch {
    notFound();
  }

  if (!recipient) notFound();

  const sortedAwards = [...recipient.recipient_awards].sort((a, b) => {
    const rankA = AWARD_BY_SLUG[a.awards?.slug ?? '']?.precedenceRank ?? 999;
    const rankB = AWARD_BY_SLUG[b.awards?.slug ?? '']?.precedenceRank ?? 999;
    return rankA - rankB;
  });

  const ribbonAwards = sortedAwards.map((ra) => ({
    slug: ra.awards?.slug ?? '',
    name: ra.awards?.name ?? '',
    colorHex: ra.awards?.color_hex ?? '#8a9bb5',
    withValor: ra.with_valor,
    oakLeafClusters: ra.oak_leaf_clusters,
  }));

  const score = calculateRecipientScore(
    sortedAwards.map((ra) => ({
      award_slug: ra.awards?.slug ?? '',
      oak_leaf_clusters: ra.oak_leaf_clusters,
    }))
  );

  const highestAward = sortedAwards[0]?.awards;
  const accentColor = highestAward?.color_hex ?? '#c9a84c';

  const timelineEvents = [];

  if (recipient.date_of_birth) {
    timelineEvents.push({
      date: recipient.date_of_birth,
      label: 'Born',
      description: [recipient.birth_city, recipient.birth_state]
        .filter(Boolean)
        .join(', ') || undefined,
      type: 'life' as const,
    });
  }

  for (const ra of sortedAwards) {
    if (ra.date_awarded) {
      timelineEvents.push({
        date: ra.date_awarded,
        label: `Awarded ${ra.awards?.name ?? 'Decoration'}`,
        description: ra.citation_override
          ? ra.citation_override.slice(0, 100) + '...'
          : undefined,
        type: 'award' as const,
      });
    }
  }

  if (recipient.date_of_death) {
    timelineEvents.push({
      date: recipient.date_of_death,
      label: 'Died',
      type: 'life' as const,
    });
  }

  timelineEvents.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const totalAwards = sortedAwards.reduce(
    (sum, ra) => sum + 1 + (ra.oak_leaf_clusters ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Hero Header */}
      <section
        className="relative overflow-hidden border-b border-navy-800"
        style={{
          background: `linear-gradient(135deg, ${accentColor}15 0%, transparent 50%, ${accentColor}08 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 to-navy-950" />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
          {/* Indicators */}
          <div className="mb-4 flex flex-wrap gap-2">
            {recipient.posthumous && (
              <span className="rounded-full border border-red-400/30 bg-red-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">
                Posthumous
              </span>
            )}
            {recipient.pow && (
              <span className="rounded-full border border-amber-400/30 bg-amber-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                Prisoner of War
              </span>
            )}
          </div>

          <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
            {recipient.full_name}
          </h1>

          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg text-text-muted">
            {recipient.rank && <span>{recipient.rank}</span>}
            {recipient.branch && (
              <>
                <span className="text-navy-600">&bull;</span>
                <span>{recipient.branch}</span>
              </>
            )}
            {recipient.conflict && (
              <>
                <span className="text-navy-600">&bull;</span>
                <span>{recipient.conflict}</span>
              </>
            )}
            {recipient.entered_service_state && (
              <>
                <span className="text-navy-600">&bull;</span>
                <span>{stateCodeToName(recipient.entered_service_state)}</span>
              </>
            )}
          </div>

          <RibbonRack awards={ribbonAwards} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Decorations */}
            <section className="mb-12">
              <h2 className="mb-6 font-display text-2xl font-bold text-cream">
                Decorations
              </h2>
              <div className="space-y-6">
                {sortedAwards.map((ra) => {
                  const citation =
                    ra.citation_override ?? recipient.citation ?? null;
                  return (
                    <div
                      key={ra.id}
                      className="rounded-lg border border-navy-800 bg-navy-900/50 p-6"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <AwardBadge award={ra.awards?.slug ?? ''} size="md" />
                        <div>
                          <h3 className="font-display text-lg font-semibold text-cream">
                            {ra.awards?.name ?? 'Unknown Award'}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-sm text-text-muted">
                            {ra.date_awarded && (
                              <span>Awarded {formatDate(ra.date_awarded)}</span>
                            )}
                            {ra.with_valor && (
                              <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-xs font-semibold text-gold-400">
                                V — With Valor
                              </span>
                            )}
                            {ra.oak_leaf_clusters > 0 && (
                              <span className="text-xs text-text-muted">
                                {ra.oak_leaf_clusters} Oak Leaf{' '}
                                {ra.oak_leaf_clusters === 1 ? 'Cluster' : 'Clusters'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {citation && (
                        <CitationBlock
                          citation={citation}
                          awardSlug={ra.awards?.slug}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Timeline */}
            {timelineEvents.length > 0 && (
              <section className="mb-12">
                <h2 className="mb-6 font-display text-2xl font-bold text-cream">
                  Timeline
                </h2>
                <ServiceTimeline events={timelineEvents} />
              </section>
            )}

            {/* Service Record */}
            <section className="mb-12">
              <h2 className="mb-6 font-display text-2xl font-bold text-cream">
                Service Record
              </h2>
              <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-6">
                <dl className="grid gap-4 sm:grid-cols-2">
                  {recipient.rank && (
                    <div>
                      <dt className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Rank
                      </dt>
                      <dd className="mt-1 text-cream">{recipient.rank}</dd>
                    </div>
                  )}
                  {recipient.branch && (
                    <div>
                      <dt className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Branch
                      </dt>
                      <dd className="mt-1 text-cream">{recipient.branch}</dd>
                    </div>
                  )}
                  {recipient.conflict && (
                    <div>
                      <dt className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Conflict
                      </dt>
                      <dd className="mt-1 text-cream">{recipient.conflict}</dd>
                    </div>
                  )}
                  {recipient.entered_service_state && (
                    <div>
                      <dt className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Entered Service
                      </dt>
                      <dd className="mt-1 text-cream">
                        {stateCodeToName(recipient.entered_service_state)}
                      </dd>
                    </div>
                  )}
                  {recipient.birth_city && (
                    <div>
                      <dt className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Birthplace
                      </dt>
                      <dd className="mt-1 text-cream">
                        {[recipient.birth_city, recipient.birth_state, recipient.birth_country]
                          .filter(Boolean)
                          .join(', ')}
                      </dd>
                    </div>
                  )}
                  {recipient.action_location_name && (
                    <div>
                      <dt className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Location of Action
                      </dt>
                      <dd className="mt-1 text-cream">
                        {recipient.action_location_name}
                      </dd>
                    </div>
                  )}
                  {recipient.date_of_action && (
                    <div>
                      <dt className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Date of Action
                      </dt>
                      <dd className="mt-1 text-cream">
                        {formatDate(recipient.date_of_action)}
                      </dd>
                    </div>
                  )}
                  {recipient.date_of_birth && (
                    <div>
                      <dt className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Date of Birth
                      </dt>
                      <dd className="mt-1 text-cream">
                        {formatDate(recipient.date_of_birth)}
                      </dd>
                    </div>
                  )}
                  {recipient.date_of_death && (
                    <div>
                      <dt className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                        Date of Death
                      </dt>
                      <dd className="mt-1 text-cream">
                        {formatDate(recipient.date_of_death)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* By the Numbers */}
            <section>
              <h2 className="mb-4 font-display text-xl font-bold text-cream">
                By the Numbers
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-4 text-center">
                  <StatCounter value={totalAwards} label="Total Awards" />
                </div>
                <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-4 text-center">
                  <StatCounter value={score} label="Valor Score" />
                </div>
                <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-4 text-center">
                  <StatCounter
                    value={sortedAwards.reduce(
                      (sum, ra) => sum + (ra.oak_leaf_clusters ?? 0),
                      0
                    )}
                    label="Oak Leaf Clusters"
                  />
                </div>
                <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-4 text-center">
                  <StatCounter
                    value={sortedAwards.filter((ra) => ra.with_valor).length}
                    label="With Valor"
                  />
                </div>
              </div>
            </section>

            {/* External Links */}
            {recipient.wikipedia_url && (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold text-cream">
                  External Links
                </h2>
                <a
                  href={recipient.wikipedia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-navy-800 bg-navy-900/50 px-4 py-3 text-sm text-gold-400 transition-colors hover:border-navy-700 hover:text-gold-300"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Wikipedia Article
                </a>
              </section>
            )}

            {/* Fellow Heroes Placeholder */}
            <section>
              <h2 className="mb-4 font-display text-xl font-bold text-cream">
                Fellow Heroes
              </h2>
              <p className="text-sm text-text-muted">
                Other decorated service members from{' '}
                {recipient.entered_service_state
                  ? stateCodeToName(recipient.entered_service_state)
                  : 'the same region'}{' '}
                who served during {recipient.conflict ?? 'the same era'}.
              </p>
              <div className="mt-3 rounded-lg border border-dashed border-navy-700 bg-navy-900/30 p-6 text-center text-sm text-text-muted">
                Related recipients will appear here.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
