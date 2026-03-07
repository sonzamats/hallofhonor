declare module 'react-simple-maps' {
  import { ComponentType, SVGProps } from 'react';

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
      rotate?: [number, number, number];
    };
    width?: number;
    height?: number;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    translateExtent?: [[number, number], [number, number]];
    onMoveStart?: (event: any, position: any) => void;
    onMove?: (event: any, position: any) => void;
    onMoveEnd?: (event: any, position: any) => void;
    className?: string;
    children?: React.ReactNode;
  }

  export interface GeographiesProps {
    geography: string | Record<string, any>;
    children: (data: { geographies: GeographyType[] }) => React.ReactNode;
    parseGeographies?: (geographies: any[]) => any[];
  }

  export interface GeographyType {
    rsmKey: string;
    properties: Record<string, any>;
    id?: string;
    type: string;
    geometry: any;
  }

  export interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: GeographyType;
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void;
    onClick?: (event: React.MouseEvent<SVGPathElement>) => void;
    onFocus?: (event: React.FocusEvent<SVGPathElement>) => void;
    onBlur?: (event: React.FocusEvent<SVGPathElement>) => void;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
}
