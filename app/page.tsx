import HeroSection from '@/components/home/HeroSection';
import AwardCategoryGrid from '@/components/home/AwardCategoryGrid';
import StatsBar from '@/components/home/StatsBar';
import { AWARDS } from '@/lib/awards-config';

const SITE_STATS = [
  { label: 'Total Decorations', value: 3527 },
  { label: 'Recipients', value: 2891 },
  { label: 'Wars Covered', value: 10 },
  { label: 'Years of History', value: 244 },
];

export default async function HomePage() {
  const topAwards = AWARDS.slice(0, 6).map((a) => ({
    slug: a.slug,
    name: a.name,
    shortName: a.shortName,
    colorHex: a.colorHex,
    description: a.description,
  }));

  return (
    <div className="flex flex-col">
      <HeroSection />

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-2 font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
          Decorations of Valor
        </h2>
        <p className="mb-10 max-w-2xl text-lg text-text-muted">
          Explore the awards that represent the highest traditions of American
          military service, ordered by precedence.
        </p>
        <AwardCategoryGrid awards={topAwards} />
      </section>

      <section className="border-t border-navy-800">
        <StatsBar stats={SITE_STATS} />
      </section>
    </div>
  );
}
