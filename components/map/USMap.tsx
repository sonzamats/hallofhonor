'use client';

import { memo, useCallback, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

interface USMapProps {
  stateData: Record<string, number>;
  awardColor: string;
  onStateClick: (stateCode: string, stateName: string) => void;
  onStateHover:
    | ((stateCode: string, stateName: string, event: React.MouseEvent) => void)
    | null;
}

/* ------------------------------------------------------------------ */
/* Color interpolation helpers                                         */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function interpolateColor(colorA: string, colorB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t
  );
}

/* FIPS code to state abbreviation mapping */
const FIPS_TO_STATE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR',
  '78': 'VI',
};

const BASE_COLOR = '#112240'; // navy-800

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function USMapInner({
  stateData,
  awardColor,
  onStateClick,
  onStateHover,
}: USMapProps) {
  // Compute the max value and tier thresholds
  const { maxCount, getColor } = useMemo(() => {
    const values = Object.values(stateData);
    const max = values.length > 0 ? Math.max(...values) : 0;

    // 5-tier heat scale: 0%, 25%, 50%, 75%, 100%
    const tierThresholds = [0, 0.25, 0.5, 0.75, 1];

    function getColorForCount(count: number): string {
      if (max === 0 || count === 0) return BASE_COLOR;
      const ratio = count / max;

      // Find which tier band the ratio falls into
      for (let i = tierThresholds.length - 1; i >= 0; i--) {
        if (ratio >= tierThresholds[i]) {
          const t = tierThresholds[i];
          return interpolateColor(BASE_COLOR, awardColor, t);
        }
      }
      return BASE_COLOR;
    }

    return { maxCount: max, getColor: getColorForCount };
  }, [stateData, awardColor]);

  const resolveState = useCallback(
    (geo: any): { code: string; name: string; count: number } => {
      const fips = String(geo.id).padStart(2, '0');
      const code = FIPS_TO_STATE[fips] ?? '';
      const name: string = geo.properties?.name ?? '';
      // Try lookup by code, name, or FIPS
      const count = stateData[code] ?? stateData[name] ?? stateData[fips] ?? 0;
      return { code, name, count };
    },
    [stateData]
  );

  return (
    <div className="w-full" style={{ aspectRatio: '975 / 610' }}>
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        width={975}
        height={610}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const { code, name, count } = resolveState(geo);
                const fillColor = getColor(count);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    tabIndex={0}
                    role="button"
                    aria-label={`${name}: ${count.toLocaleString()} recipients`}
                    onClick={() => onStateClick(code, name)}
                    onMouseEnter={(e: React.MouseEvent) => {
                      onStateHover?.(code, name, e);
                    }}
                    onMouseLeave={(e: React.MouseEvent) => {
                      onStateHover?.('', '', e);
                    }}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onStateClick(code, name);
                      }
                    }}
                    style={{
                      default: {
                        fill: fillColor,
                        stroke: '#1a3560',
                        strokeWidth: 0.75,
                        outline: 'none',
                        transition: 'fill 400ms ease',
                        cursor: 'pointer',
                      },
                      hover: {
                        fill: fillColor,
                        stroke: '#e8c97a',
                        strokeWidth: 1.25,
                        outline: 'none',
                        filter: 'brightness(1.25)',
                        cursor: 'pointer',
                        transition: 'fill 400ms ease',
                      },
                      pressed: {
                        fill: fillColor,
                        stroke: '#e8c97a',
                        strokeWidth: 1.5,
                        outline: 'none',
                        cursor: 'pointer',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}

const USMap = memo(USMapInner);
export default USMap;
