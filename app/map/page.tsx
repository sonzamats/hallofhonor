'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { AWARDS, US_STATES, getAwardColor } from '@/lib/awards-config';
import USMap from '@/components/map/USMap';
import AwardSelector from '@/components/map/AwardSelector';
import StatePanel from '@/components/map/StatePanel';
import MapTooltip from '@/components/map/MapTooltip';

interface TooltipState {
  x: number;
  y: number;
  stateCode: string;
  stateName: string;
}

export default function MapPage() {
  const [activeAward, setActiveAward] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [stateData, setStateData] = useState<Record<string, number>>({});

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeAward) params.set('award', activeAward);
    fetch(`/api/map-data?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => setStateData(data))
      .catch(() => setStateData({}));
  }, [activeAward]);

  const awardColor = activeAward ? getAwardColor(activeAward) : '#c9a84c';

  const awardOptions = useMemo(
    () =>
      AWARDS.map((a) => ({
        slug: a.slug,
        name: a.name,
        shortName: a.shortName,
        colorHex: a.colorHex,
      })),
    []
  );

  const handleStateClick = useCallback(
    (stateCode: string, stateName: string) => {
      setSelectedState({ code: stateCode, name: stateName });
    },
    []
  );

  const handleStateHover = useCallback(
    (stateCode: string, stateName: string, event: React.MouseEvent) => {
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        stateCode,
        stateName,
      });
    },
    []
  );

  const handleAwardSelect = useCallback((slug: string | null) => {
    setActiveAward(slug);
  }, []);

  const handlePanelClose = useCallback(() => {
    setSelectedState(null);
  }, []);

  const activeAwardName = activeAward
    ? AWARDS.find((a) => a.slug === activeAward)?.name ?? 'All Awards'
    : 'All Awards';

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col overflow-auto bg-navy-950">
      <div className="shrink-0 border-b border-navy-800 bg-navy-900/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <h1 className="mb-2 font-display text-xl font-bold text-cream sm:text-2xl">
            Geographic Distribution
          </h1>
          <AwardSelector
            awards={awardOptions}
            activeAward={activeAward}
            onSelect={handleAwardSelect}
          />
        </div>
      </div>

      <div
        className="relative flex-1"
        onMouseLeave={() => setTooltip(null)}
      >
        <USMap
          stateData={stateData}
          awardColor={awardColor}
          onStateClick={handleStateClick}
          onStateHover={handleStateHover}
        />

        <MapTooltip
          x={tooltip?.x ?? 0}
          y={tooltip?.y ?? 0}
          stateName={tooltip?.stateName ?? ''}
          count={tooltip ? stateData[tooltip.stateCode] ?? 0 : 0}
          awardName={activeAwardName}
          visible={tooltip !== null}
        />
      </div>

      <StatePanel
        stateName={selectedState?.name ?? ''}
        stateCode={selectedState?.code ?? ''}
        isOpen={selectedState !== null}
        onClose={handlePanelClose}
        activeAward={activeAward}
      />
    </div>
  );
}
