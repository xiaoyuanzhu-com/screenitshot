#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect current version from js/package.json
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' js/package.json | head -1 | sed 's/"version": "\(.*\)"/\1/')

# Get new version from argument or prompt
NEW_VERSION="$1"

if [ -z "$NEW_VERSION" ]; then
  echo -e "${YELLOW}Current version: ${GREEN}$CURRENT_VERSION${NC}"
  echo -e "${YELLOW}Enter new version (e.g., 1.0.0 or v1.0.0):${NC}"
  read -r NEW_VERSION
fi

# Strip 'v' prefix if present
NEW_VERSION="${NEW_VERSION#v}"

# Validate semantic version format (e.g., 1.0.0, 1.0.0-beta.1)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo -e "${RED}Error: Invalid version format '$NEW_VERSION'${NC}"
  echo "Expected format: X.Y.Z or X.Y.Z-prerelease (e.g., 1.0.0 or 1.0.0-beta.1)"
  exit 1
fi

echo -e "${GREEN}Updating version to $NEW_VERSION...${NC}"

# Update JS package.json
echo "  → Updating js/package.json"
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" js/package.json
rm js/package.json.bak

# Update Python pyproject.toml
echo "  → Updating python/pyproject.toml"
sed -i.bak "s/^version = \"[^\"]*\"/version = \"$NEW_VERSION\"/" python/pyproject.toml
rm python/pyproject.toml.bak

# Update render package.json
echo "  → Updating render/package.json"
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" render/package.json
rm render/package.json.bak

# Update root pyproject.toml (if exists)
if [ -f "pyproject.toml" ]; then
  echo "  → Updating pyproject.toml"
  sed -i.bak "s/^version = \"[^\"]*\"/version = \"$NEW_VERSION\"/" pyproject.toml
  rm pyproject.toml.bak
fi

echo -e "${GREEN}✓ Version bumped to $NEW_VERSION${NC}"
echo ""

# Show diff
echo -e "${YELLOW}Changes:${NC}"
git diff

echo ""
echo "  → Staging changes..."
git add -A

echo "  → Creating commit..."
git commit -m "chore: bump version to $NEW_VERSION"

echo "  → Creating tag v$NEW_VERSION..."
git tag "v$NEW_VERSION"

echo "  → Pushing to origin..."
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH" --tags

echo ""
echo -e "${GREEN}✓ Version bumped, committed, tagged, and pushed!${NC}"
echo ""
echo "GitHub Actions will now:"
echo "  • Publish to npm (https://www.npmjs.com/package/screenitshot)"
echo "  • Publish to PyPI (https://pypi.org/project/screenitshot/)"
echo "  • Publish to ghcr.io"
echo "  • Create GitHub Release at https://github.com/$(git config --get remote.origin.url | sed 's/.*://;s/.git$//')/releases"
