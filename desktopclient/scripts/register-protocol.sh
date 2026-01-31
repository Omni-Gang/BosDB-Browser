#!/bin/bash
# Linux Protocol Registration for BosDB Development
# This script registers the bosdb:// protocol to point to your development Electron instance.

APP_ROOT=$(pwd)
ELECTRON_BIN="$APP_ROOT/node_modules/.bin/electron"
DESKTOP_FILE="$HOME/.local/share/applications/bosdb-dev.desktop"

echo "🔧 Registering bosdb:// protocol for development..."
echo "📂 Project Root: $APP_ROOT"

mkdir -p "$HOME/.local/share/applications"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=BosDB Dev
Exec=$ELECTRON_BIN $APP_ROOT %u
Type=Application
Terminal=false
MimeType=x-scheme-handler/bosdb;
EOF

chmod +x "$DESKTOP_FILE"

# Update systems
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
xdg-mime default bosdb-dev.desktop x-scheme-handler/bosdb 2>/dev/null || true

echo "✅ Protocol 'bosdb://' registered to this development folder."
echo "💡 You can now use 'Login' in the Native Client and the redirect will work."
