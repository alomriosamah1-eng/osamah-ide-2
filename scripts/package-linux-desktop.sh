#!/usr/bin/env bash
set -eo pipefail

VERSION=$(node -p "require('./package.json').version || '1.0.0'")
ARCH="amd64"
DIST_DIR="release"
BUILD_ROOT="${DIST_DIR}/osamah-ide_${VERSION}_${ARCH}"
PORTABLE_DIR="${DIST_DIR}/osamah-ide-linux-x64"

echo "=== Packaging Desktop Bundle for Ubuntu Linux (${ARCH}) ==="
rm -rf "${DIST_DIR}"
mkdir -p "${BUILD_ROOT}/opt/osamah-ide"
mkdir -p "${BUILD_ROOT}/usr/bin"
mkdir -p "${BUILD_ROOT}/usr/share/applications"
mkdir -p "${BUILD_ROOT}/usr/share/icons/hicolor/scalable/apps"
mkdir -p "${BUILD_ROOT}/DEBIAN"

# Copy essential Application files
cp -r dist "${BUILD_ROOT}/opt/osamah-ide/"
cp -r desktop "${BUILD_ROOT}/opt/osamah-ide/"
cp package.json "${BUILD_ROOT}/opt/osamah-ide/"
if [ -f "mini_presenton.py" ]; then
  cp mini_presenton.py "${BUILD_ROOT}/opt/osamah-ide/"
fi

# Copy node_modules
if [ -d "node_modules" ]; then
  cp -a node_modules "${BUILD_ROOT}/opt/osamah-ide/"
fi

# Make launcher executable
chmod +x "${BUILD_ROOT}/opt/osamah-ide/desktop/launcher.sh"

# Create /usr/bin launcher link script
cat << 'EOF' > "${BUILD_ROOT}/usr/bin/osamah-ide"
#!/usr/bin/env bash
exec /opt/osamah-ide/desktop/launcher.sh "$@"
EOF
chmod +x "${BUILD_ROOT}/usr/bin/osamah-ide"

# Install desktop entry and icon
cp desktop/osamah-ide.desktop "${BUILD_ROOT}/usr/share/applications/"
cp desktop/osamah-ide.svg "${BUILD_ROOT}/usr/share/icons/hicolor/scalable/apps/"

# Create DEBIAN/control file
cat << EOF > "${BUILD_ROOT}/DEBIAN/control"
Package: osamah-ide
Version: ${VERSION}
Section: devel
Priority: optional
Architecture: ${ARCH}
Depends: nodejs (>= 18.0.0), curl
Recommends: python3, python3-pip
Maintainer: Osamah IDE Team <support@osamah-ide.org>
Description: AI-Powered IDE & Knowledge Observatory
 Osamah IDE is a next-generation desktop development environment
 integrating programming, presentations, and second-brain knowledge management.
EOF

# Build .deb package if dpkg-deb is available
if command -v dpkg-deb >/dev/null 2>&1; then
  echo "Building .deb package..."
  dpkg-deb -Zgzip --build --root-owner-group "${BUILD_ROOT}" "${DIST_DIR}/osamah-ide_${VERSION}_${ARCH}.deb"
  echo "Created: ${DIST_DIR}/osamah-ide_${VERSION}_${ARCH}.deb"
fi

# Build portable tar.gz package directly from BUILD_ROOT
echo "Building portable .tar.gz bundle..."
mkdir -p "${PORTABLE_DIR}"
cat << 'EOF' > "${BUILD_ROOT}/opt/osamah-ide/install-desktop-shortcut.sh"
#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p ~/.local/share/applications ~/.local/share/icons/hicolor/scalable/apps ~/.local/bin
sed "s|Exec=osamah-ide|Exec=${DIR}/desktop/launcher.sh|g" "${DIR}/desktop/osamah-ide.desktop" > ~/.local/share/applications/osamah-ide.desktop
cp "${DIR}/desktop/osamah-ide.svg" ~/.local/share/icons/hicolor/scalable/apps/
ln -sf "${DIR}/desktop/launcher.sh" ~/.local/bin/osamah-ide
echo "Osamah IDE desktop shortcut installed in ~/.local/share/applications/"
EOF
chmod +x "${BUILD_ROOT}/opt/osamah-ide/install-desktop-shortcut.sh"

tar -czf "${DIST_DIR}/osamah-ide-linux-x64.tar.gz" -C "${BUILD_ROOT}/opt" osamah-ide
echo "Created: ${DIST_DIR}/osamah-ide-linux-x64.tar.gz"

# Clean up raw build root to save space
rm -rf "${BUILD_ROOT}"

echo "=== Linux Desktop Packaging Complete ==="
ls -lh "${DIST_DIR}"/*.deb "${DIST_DIR}"/*.tar.gz 2>/dev/null || true
