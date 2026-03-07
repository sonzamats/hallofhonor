import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | Hall of Valor',
  description:
    'Learn about the history of U.S. military valor decorations, order of precedence, citation writing, and the data sources behind Hall of Valor.',
};

function SectionDivider() {
  return (
    <div className="my-16 flex items-center justify-center">
      <div className="h-px w-12 bg-gradient-to-r from-transparent to-navy-700" />
      <div className="mx-3 h-1.5 w-1.5 rotate-45 bg-gold-500" />
      <div className="h-px w-12 bg-gradient-to-l from-transparent to-navy-700" />
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-navy-950">
      {/* Header */}
      <section className="border-b border-navy-800 bg-navy-900/40">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="mb-4 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
            About Hall of Valor
          </h1>
          <p className="text-lg leading-relaxed text-text-muted">
            Hall of Valor is a comprehensive, interactive record of American
            military valor decorations and the service members who earned them.
            Our mission is to honor their sacrifice by making this history
            accessible, searchable, and enduring.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* History of Decorations */}
        <section>
          <h2 className="mb-4 font-display text-3xl font-bold text-cream">
            A History of Military Decorations
          </h2>
          <div className="prose-navy space-y-4 text-text-muted">
            <p className="text-lg leading-relaxed">
              The tradition of recognizing military valor in the United States
              dates to the Revolutionary War, when General George Washington
              established the Badge of Military Merit in 1782 — what would later
              become the Purple Heart.
            </p>
            <p className="leading-relaxed">
              The Medal of Honor, the nation&apos;s highest award for military
              valor, was created during the Civil War in 1861 for the Navy and
              1862 for the Army. It remains the only decoration that requires an
              act of Congress or personal approval from the President for award.
            </p>
            <p className="leading-relaxed">
              Over the following century, the decorations system expanded to
              recognize varying degrees of heroism and meritorious service. The
              Distinguished Service Cross, Navy Cross, and other branch-specific
              crosses were established during World War I. The Silver Star,
              Bronze Star, and Distinguished Flying Cross followed, each filling
              a specific role in the hierarchy of recognition.
            </p>
            <p className="leading-relaxed">
              Today, the U.S. military awards system represents a carefully
              ordered hierarchy of decorations, each carrying precise criteria
              and profound significance. Every award tells a story of courage,
              sacrifice, and duty beyond what was asked.
            </p>
          </div>
        </section>

        <SectionDivider />

        {/* Order of Precedence */}
        <section>
          <h2 className="mb-4 font-display text-3xl font-bold text-cream">
            Order of Precedence
          </h2>
          <div className="space-y-4 text-text-muted">
            <p className="text-lg leading-relaxed">
              Military decorations are worn and displayed according to a strict
              order of precedence. This ranking reflects the relative
              significance and criteria of each award.
            </p>
            <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-6">
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-xs font-bold text-gold-400">
                    1
                  </span>
                  <div>
                    <span className="font-semibold text-cream">Medal of Honor</span>
                    <span className="text-text-muted">
                      {' '}— Conspicuous gallantry and intrepidity at the risk of
                      life above and beyond the call of duty.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-cream">
                    2
                  </span>
                  <div>
                    <span className="font-semibold text-cream">Service Crosses</span>
                    <span className="text-text-muted">
                      {' '}— Distinguished Service Cross, Navy Cross, Air Force
                      Cross, Coast Guard Cross. Extraordinary heroism in combat.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-cream">
                    3
                  </span>
                  <div>
                    <span className="font-semibold text-cream">Silver Star</span>
                    <span className="text-text-muted">
                      {' '}— Gallantry in action against an enemy.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-cream">
                    4
                  </span>
                  <div>
                    <span className="font-semibold text-cream">
                      Distinguished Flying Cross
                    </span>
                    <span className="text-text-muted">
                      {' '}— Heroism or extraordinary achievement in aerial flight.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-cream">
                    5
                  </span>
                  <div>
                    <span className="font-semibold text-cream">Bronze Star Medal</span>
                    <span className="text-text-muted">
                      {' '}— Heroic or meritorious achievement in a combat zone.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-cream">
                    6
                  </span>
                  <div>
                    <span className="font-semibold text-cream">Purple Heart</span>
                    <span className="text-text-muted">
                      {' '}— Wounded or killed in action against an enemy.
                    </span>
                  </div>
                </li>
              </ol>
            </div>
            <p className="leading-relaxed">
              When multiple decorations are worn, they are arranged from the
              wearer&apos;s right to left in order of precedence. Within the same
              decoration, subsequent awards are indicated by Oak Leaf Clusters
              (Army, Air Force) or award stars (Navy, Marine Corps, Coast Guard).
            </p>
          </div>
        </section>

        <SectionDivider />

        {/* Citation Writing */}
        <section>
          <h2 className="mb-4 font-display text-3xl font-bold text-cream">
            Understanding Citations
          </h2>
          <div className="space-y-4 text-text-muted">
            <p className="text-lg leading-relaxed">
              Every valor decoration is accompanied by an official citation — a
              narrative account of the actions that earned the award. Citations
              follow a specific format and tradition of military writing that has
              evolved over more than a century.
            </p>
            <p className="leading-relaxed">
              A citation typically begins with the recipient&apos;s name, rank,
              and unit, followed by the date and location of the action. The body
              describes the specific acts of valor in formal but vivid language,
              often employing phrases that have become hallmarks of military
              citation prose.
            </p>
            <div className="rounded-lg border-l-4 border-gold-500 bg-navy-900/50 p-6">
              <p className="font-body text-lg italic leading-relaxed text-cream">
                &ldquo;...with complete disregard for his own safety and despite
                intense enemy fire, he charged the fortified position
                single-handedly, neutralizing the threat and enabling his platoon
                to advance...&rdquo;
              </p>
              <p className="mt-3 text-sm text-text-muted">
                Characteristic citation language emphasizing selfless action,
                initiative, and impact on the broader mission.
              </p>
            </div>
            <p className="leading-relaxed">
              The language of citations serves a dual purpose: it provides a
              formal military record of the event and creates a permanent
              testament to extraordinary courage. The best citations read almost
              as literature — compact narratives of human beings pushed beyond
              ordinary limits.
            </p>
          </div>
        </section>

        <SectionDivider />

        {/* With Valor Device */}
        <section>
          <h2 className="mb-4 font-display text-3xl font-bold text-cream">
            The &ldquo;With Valor&rdquo; Device
          </h2>
          <div className="space-y-4 text-text-muted">
            <p className="text-lg leading-relaxed">
              Certain decorations, most notably the Bronze Star Medal, may be
              awarded with the &ldquo;V&rdquo; device — a small bronze letter
              &ldquo;V&rdquo; affixed to the ribbon, denoting that the award was
              for valor in combat rather than meritorious service.
            </p>
            <p className="leading-relaxed">
              A Bronze Star &ldquo;with Valor&rdquo; carries significantly
              greater distinction than one awarded for meritorious service. The
              &ldquo;V&rdquo; device transforms what might be an administrative
              recognition into a combat valor decoration, placing it in an
              entirely different category of honor.
            </p>
            <p className="leading-relaxed">
              In the Hall of Valor database, awards with the &ldquo;V&rdquo;
              device are specifically noted and carry additional weight in our
              scoring system, reflecting their elevated significance in the
              military awards hierarchy.
            </p>
          </div>
        </section>

        <SectionDivider />

        {/* Oak Leaf Clusters */}
        <section>
          <h2 className="mb-4 font-display text-3xl font-bold text-cream">
            Oak Leaf Clusters
          </h2>
          <div className="space-y-4 text-text-muted">
            <p className="text-lg leading-relaxed">
              When a service member earns the same decoration more than once, the
              subsequent awards are represented by Oak Leaf Clusters (OLC) —
              small bronze or silver oak leaf devices worn on the ribbon of the
              original medal.
            </p>
            <p className="leading-relaxed">
              A bronze Oak Leaf Cluster represents one additional award, while a
              silver Oak Leaf Cluster represents five. This compact system allows
              a single ribbon to convey multiple recognitions. The Navy and Marine
              Corps use a similar system with gold and silver award stars.
            </p>
            <p className="leading-relaxed">
              Some of the most decorated service members in American history have
              accumulated multiple clusters on their valor awards. Audie Murphy,
              the most decorated American soldier of World War II, earned the
              Medal of Honor along with numerous other decorations, many with
              additional Oak Leaf Clusters.
            </p>
          </div>
        </section>

        <SectionDivider />

        {/* Data Sources */}
        <section>
          <h2 className="mb-4 font-display text-3xl font-bold text-cream">
            Data Sources
          </h2>
          <div className="space-y-4 text-text-muted">
            <p className="text-lg leading-relaxed">
              The data presented in Hall of Valor is compiled from official U.S.
              government records, military archives, and established historical
              databases.
            </p>
            <ul className="space-y-3 pl-4">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                <span>
                  <span className="font-semibold text-cream">
                    Congressional Medal of Honor Society
                  </span>{' '}
                  — The official registry of Medal of Honor recipients, maintained
                  since 1958.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                <span>
                  <span className="font-semibold text-cream">
                    National Archives and Records Administration (NARA)
                  </span>{' '}
                  — Military personnel records, general orders, and award
                  citations.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                <span>
                  <span className="font-semibold text-cream">
                    Military Times Hall of Valor
                  </span>{' '}
                  — A publicly accessible database of valor award recipients across
                  all branches.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                <span>
                  <span className="font-semibold text-cream">
                    Branch-Specific Historical Centers
                  </span>{' '}
                  — Including the U.S. Army Center of Military History, Naval
                  History and Heritage Command, and Air Force Historical Research
                  Agency.
                </span>
              </li>
            </ul>
          </div>
        </section>

        <SectionDivider />

        {/* How to Submit Corrections */}
        <section className="mb-8">
          <h2 className="mb-4 font-display text-3xl font-bold text-cream">
            Submit Corrections
          </h2>
          <div className="space-y-4 text-text-muted">
            <p className="text-lg leading-relaxed">
              We strive for accuracy in every record, but military records
              spanning more than two centuries inevitably contain gaps and
              discrepancies. If you identify an error or have additional
              information about a recipient, we encourage you to reach out.
            </p>
            <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-6">
              <h3 className="mb-3 font-display text-lg font-semibold text-cream">
                How to submit a correction:
              </h3>
              <ol className="space-y-2 text-text-muted">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-cream">
                    1
                  </span>
                  <span>
                    Navigate to the recipient or award page containing the error.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-cream">
                    2
                  </span>
                  <span>
                    Note the specific field or information that needs correction.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-cream">
                    3
                  </span>
                  <span>
                    Email us with the recipient&apos;s name, the incorrect
                    information, the correct information, and your source or
                    documentation.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-cream">
                    4
                  </span>
                  <span>
                    Our team will review and verify the correction against
                    official records before updating the database.
                  </span>
                </li>
              </ol>
            </div>
            <p className="leading-relaxed">
              Every correction helps us build a more complete and accurate record
              of American military valor. We are grateful to the veterans,
              historians, family members, and researchers who help maintain the
              integrity of this archive.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
