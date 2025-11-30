import maplibregl, { LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { gpx } from '@tmcw/togeojson';
import type { RenderMetadata } from '../js/src/types';

declare global {
  interface Window {
    renderComplete: Promise<RenderMetadata>;
  }
  // eslint-disable-next-line no-var
  var fileBase64: string;
}

function getBounds(geojson: GeoJSON.FeatureCollection): LngLatBounds {
  const bounds = new LngLatBounds();

  function processCoordinates(coords: GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][], depth: number): void {
    if (depth === 0) {
      // Single coordinate [lng, lat]
      bounds.extend(coords as [number, number]);
    } else if (depth === 1) {
      // Array of coordinates
      for (const coord of coords as GeoJSON.Position[]) {
        bounds.extend(coord as [number, number]);
      }
    } else {
      // Nested arrays (polygons, multipolygons)
      for (const nested of coords as GeoJSON.Position[][]) {
        processCoordinates(nested, depth - 1);
      }
    }
  }

  function processGeometry(geometry: GeoJSON.Geometry): void {
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
        processCoordinates(geometry.coordinates, 2);
        break;
      case 'MultiPolygon':
        for (const polygon of geometry.coordinates) {
          processCoordinates(polygon, 2);
        }
        break;
    }
  }

  for (const feature of geojson.features) {
    if (feature.geometry) {
      processGeometry(feature.geometry);
    }
  }

  return bounds;
}

async function render(): Promise<RenderMetadata> {
  // Decode base64 file content
  const content = atob(globalThis.fileBase64);

  // Parse GPX XML
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(content, 'text/xml');

  // Convert GPX to GeoJSON
  const geojson = gpx(gpxDoc);

  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    throw new Error('Map container not found');
  }

  // Set map dimensions
  const width = 1920;
  const height = 1080;

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
  map.addSource('gpx-data', {
    type: 'geojson',
    data: geojson,
  });

  // Add layers for GPX data
  // Tracks/routes as lines
  map.addLayer({
    id: 'tracks',
    type: 'line',
    source: 'gpx-data',
    filter: ['==', '$type', 'LineString'],
    paint: {
      'line-color': '#FF4500',
      'line-width': 4,
    },
  });

  // Waypoints as circles
  map.addLayer({
    id: 'waypoints',
    type: 'circle',
    source: 'gpx-data',
    filter: ['==', '$type', 'Point'],
    paint: {
      'circle-radius': 8,
      'circle-color': '#FF0000',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
    },
  });

  // Fit bounds to the data
  const bounds = getBounds(geojson);
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
    });
  }

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
