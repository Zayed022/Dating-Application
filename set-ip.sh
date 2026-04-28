#!/bin/bash
# ─── set-ip.sh ───────────────────────────────────────────────────────────────
# Automatically detects your LAN IP and updates mobile/.env
# Run from the project root: bash set-ip.sh

set -e

detect_ip() {
  # Try multiple methods cross-platform
  if command -v ipconfig &>/dev/null; then
    # Windows (Git Bash)
    ipconfig 2>/dev/null | grep -i "IPv4" | head -1 | awk '{print $NF}' | tr -d '\r'
  elif [[ "$(uname)" == "Darwin" ]]; then
    # macOS
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || \
    ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -1
  else
    # Linux
    hostname -I 2>/dev/null | awk '{print $1}' || \
    ip route get 1 2>/dev/null | awk '{print $7; exit}'
  fi
}

IP=$(detect_ip)

if [ -z "$IP" ] || [ "$IP" = "127.0.0.1" ]; then
  echo "❌ Could not auto-detect LAN IP."
  echo "   Please manually edit mobile/.env and replace YOUR_LAN_IP"
  exit 1
fi

ENV_FILE="mobile/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE not found. Run from project root."
  exit 1
fi

# Replace YOUR_LAN_IP or existing IP pattern
sed -i.bak \
  -e "s|http://[0-9.]*:5000/api|http://${IP}:5000/api|g" \
  -e "s|http://[0-9.]*:5000$|http://${IP}:5000|g" \
  -e "s|EXPO_PUBLIC_LAN_IP=.*|EXPO_PUBLIC_LAN_IP=${IP}|g" \
  -e "s|http://YOUR_LAN_IP:5000/api|http://${IP}:5000/api|g" \
  -e "s|http://YOUR_LAN_IP:5000$|http://${IP}:5000|g" \
  "$ENV_FILE"

rm -f "${ENV_FILE}.bak"

echo "✅ LAN IP set to: $IP"
echo "   API URL: http://${IP}:5000/api"
echo ""
echo "📱 Now restart your Expo server:"
echo "   cd mobile && npx expo start --clear"
