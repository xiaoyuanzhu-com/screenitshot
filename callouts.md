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
The location format requires coordinates in a specific format. The current implementation expects input as a text file containing coordinates in the format:
```
lat,lng
```
For example: `40.7128,-74.0060`

**Limitations:**
- Requires MapLibre GL JS which needs a map tile provider
- Using OpenStreetMap tiles which may have rate limits
- No custom map styles supported
- Single marker only
