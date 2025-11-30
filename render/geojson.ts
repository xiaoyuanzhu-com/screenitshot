import maplibregl, { LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RenderMetadata } from '../js/src/types';

declare global {
  interface Window {
    renderComplete: Promise<RenderMetadata>;
  }
  // eslint-disable-next-line no-var
  var fileBase64: string;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties?: Record<string, unknown>;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][];
}

type GeoJSONData = GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection;

function getBounds(geojson: GeoJSONData): LngLatBounds {
  const bounds = new LngLatBounds();

  function processCoordinates(coords: number[] | number[][] | number[][][], depth: number): void {
    if (depth === 0) {
      // Single coordinate [lng, lat]
      bounds.extend(coords as [number, number]);
    } else if (depth === 1) {
      // Array of coordinates
      for (const coord of coords as number[][]) {
        bounds.extend(coord as [number, number]);
      }
    } else {
      // Nested arrays (polygons, multipolygons)
      for (const nested of coords as number[][][]) {
        processCoordinates(nested, depth - 1);
      }
    }
  }

  function processGeometry(geometry: GeoJSONGeometry): void {
    switch (geometry.type) {
      case 'Point':
        processCoordinates(geometry.coordinates, 0);
        break;
      case 'LineString':
      case 'MultiPoint':
        processCoordinates(geometry.coordinates, 1);
        break;
      case 'Polygon':
      case 'MultiLineString':
        processCoordinates(geometry.coordinates as number[][][], 2);
        break;
      case 'MultiPolygon':
        for (const polygon of geometry.coordinates as number[][][][]) {
          processCoordinates(polygon, 2);
        }
        break;
    }
  }

  if (geojson.type === 'FeatureCollection') {
    for (const feature of geojson.features) {
      processGeometry(feature.geometry);
    }
  } else if (geojson.type === 'Feature') {
    processGeometry(geojson.geometry);
  } else {
    // Raw geometry
    processGeometry(geojson as GeoJSONGeometry);
  }

  return bounds;
}

async function render(): Promise<RenderMetadata> {
  // Decode base64 file content
  const content = atob(globalThis.fileBase64);
  const geojson: GeoJSONData = JSON.parse(content);

  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    throw new Error('Map container not found');
  }

  // Set map dimensions
  const width = 1280;
  const height = 960;

  // Initialize map with OpenStreetMap tiles
  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
        },
      ],
    },
    center: [0, 0],
    zoom: 1,
  });

  // Wait for map to load
  await new Promise<void>((resolve) => {
    if (map.loaded()) {
      resolve();
    } else {
      map.on('load', () => resolve());
    }
  });

  // Add GeoJSON source
  map.addSource('geojson-data', {
    type: 'geojson',
    data: geojson as GeoJSON.GeoJSON,
  });

  // Add layers for different geometry types
  // Points layer
  map.addLayer({
    id: 'points',
    type: 'circle',
    source: 'geojson-data',
    filter: ['==', '$type', 'Point'],
    paint: {
      'circle-radius': 8,
      'circle-color': '#FF0000',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
    },
  });

  // Lines layer
  map.addLayer({
    id: 'lines',
    type: 'line',
    source: 'geojson-data',
    filter: ['==', '$type', 'LineString'],
    paint: {
      'line-color': '#0066FF',
      'line-width': 3,
    },
  });

  // Polygons fill layer
  map.addLayer({
    id: 'polygons-fill',
    type: 'fill',
    source: 'geojson-data',
    filter: ['==', '$type', 'Polygon'],
    paint: {
      'fill-color': '#0066FF',
      'fill-opacity': 0.3,
    },
  });

  // Polygons outline layer
  map.addLayer({
    id: 'polygons-outline',
    type: 'line',
    source: 'geojson-data',
    filter: ['==', '$type', 'Polygon'],
    paint: {
      'line-color': '#0066FF',
      'line-width': 2,
    },
  });

  // Fit bounds to the data
  const bounds = getBounds(geojson);
  map.fitBounds(bounds, {
    padding: 50,
    maxZoom: 15,
  });

  // Wait for tiles to render
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    width,
    height,
    pageCount: 1,
    pageNumber: 1,
    scale: 1,
  };
}

window.renderComplete = render();
