# Implementation Callouts

## URL Support
The URL format is fundamentally different from other formats:
- Other formats: Read file as base64 → inject into template → render → screenshot
- URL format: Navigate directly to URL with Playwright → screenshot

This requires special handling in the renderer since there's no file to read or template to use. The implementation navigates directly to the URL and takes a screenshot at a fixed viewport size.

**Limitations:**
- No template system used
- Cannot handle authentication-protected pages without additional configuration
- External resources (fonts, images) depend on network availability
- Some sites may block headless browsers

## GeoJSON Support
Standard GeoJSON format (RFC 7946) for geographic data.

**Supported geometry types:**
- Point - rendered as red circles
- LineString - rendered as blue lines
- Polygon - rendered with blue fill and outline
- MultiPoint, MultiLineString, MultiPolygon - all supported
- Feature and FeatureCollection wrappers

**Features:**
- Uses MapLibre GL JS with OpenStreetMap tiles (free, no API key)
- Auto-fits bounds to show all features with padding
- Fixed 800x600 output dimensions

**Limitations:**
- OpenStreetMap tiles may have rate limits for heavy usage
- No custom styling from GeoJSON properties (yet)
- Map tiles require network connectivity

## GPX Support
GPS Exchange Format - standard format for GPS tracks exported from Garmin, Strava, Apple Health, etc.

**Supported elements:**
- Tracks (trk) - rendered as orange lines
- Routes (rte) - rendered as lines
- Waypoints (wpt) - rendered as red circles

**Features:**
- Uses @tmcw/togeojson to convert GPX → GeoJSON
- Then rendered with MapLibre GL JS
- Auto-fits bounds to show entire track
- Fixed 800x600 output dimensions

**Limitations:**
- Elevation data is preserved but not visualized
- Time/speed data not visualized
- No elevation profile or statistics display
