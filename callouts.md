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

## Location (lat/lng) Support
The location format requires coordinates in a specific format. Supported formats:

1. Simple CSV format: `lat,lng` or `lat,lng,zoom`
   - Example: `40.7128,-74.0060`
   - Example with zoom: `40.7128,-74.0060,15`

2. JSON format:
   ```json
   {"lat": 40.7128, "lng": -74.0060, "zoom": 12}
   ```

Supported file extensions: `.location`, `.loc`, `.geo`

**Features:**
- Uses OpenStreetMap tiles (free, no API key required)
- Red marker placed at the specified location
- Default zoom level of 12 if not specified
- Fixed 800x600 output dimensions

**Limitations:**
- OpenStreetMap tiles may have rate limits for heavy usage
- No custom map styles supported
- Single marker only
- Map tiles require network connectivity
