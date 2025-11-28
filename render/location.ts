import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RenderMetadata } from '../js/src/types';

declare global {
  interface Window {
    renderComplete: Promise<RenderMetadata>;
  }
  // eslint-disable-next-line no-var
  var fileBase64: string;
}

interface LocationData {
  lat: number;
  lng: number;
  zoom?: number;
}

function parseLocation(content: string): LocationData {
  const trimmed = content.trim();

  // Try JSON format: {"lat": 40.7128, "lng": -74.0060, "zoom": 12}
  try {
    const json = JSON.parse(trimmed);
    if (typeof json.lat === 'number' && typeof json.lng === 'number') {
      return {
        lat: json.lat,
        lng: json.lng,
        zoom: typeof json.zoom === 'number' ? json.zoom : 12,
      };
    }
  } catch {
    // Not JSON, try other formats
  }

  // Try simple format: lat,lng or lat,lng,zoom
  const parts = trimmed.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    const zoom = parts.length >= 3 ? parseFloat(parts[2]) : 12;

    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, zoom: isNaN(zoom) ? 12 : zoom };
    }
  }

  throw new Error('Invalid location format. Use "lat,lng" or "lat,lng,zoom" or JSON format.');
}

async function render(): Promise<RenderMetadata> {
  // Decode base64 file content
  const content = atob(globalThis.fileBase64);
  const location = parseLocation(content);

  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    throw new Error('Map container not found');
  }

  // Set map dimensions
  const width = 800;
  const height = 600;

  // Initialize map with OpenStreetMap tiles (free, no API key required)
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
    center: [location.lng, location.lat],
    zoom: location.zoom || 12,
  });

  // Add a marker at the location
  new maplibregl.Marker({ color: '#FF0000' })
    .setLngLat([location.lng, location.lat])
    .addTo(map);

  // Wait for map to fully load
  await new Promise<void>((resolve) => {
    if (map.loaded()) {
      resolve();
    } else {
      map.on('load', () => resolve());
    }
  });

  // Additional wait for tiles to render
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    width,
    height,
    pageCount: 1,
    pageNumber: 1,
    scale: 1,
  };
}

window.renderComplete = render();
