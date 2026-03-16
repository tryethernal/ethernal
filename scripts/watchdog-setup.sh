#!/usr/bin/env bash
# Sets up the ethernal-watchdog systemd timer on Hetzner.
# Run once: ssh root@157.90.154.200 < scripts/watchdog-setup.sh
set -euo pipefail

echo "=== Ethernal Watchdog Setup ==="

# Install Fly CLI if missing
if ! command -v flyctl &>/dev/null; then
    echo "Installing Fly CLI..."
    curl -L https://fly.io/install.sh | sh
    ln -sf /root/.fly/bin/flyctl /usr/local/bin/flyctl
    ln -sf /root/.fly/bin/flyctl /usr/local/bin/fly
    echo "Fly CLI installed. Run 'flyctl auth login' to authenticate."
fi

# Install redis-cli if missing
if ! command -v redis-cli &>/dev/null; then
    echo "Installing redis-tools..."
    apt-get update -qq && apt-get install -y -qq redis-tools
fi

# Create log directory
mkdir -p /var/log/ethernal-watchdog
chown blog:blog /var/log/ethernal-watchdog

# Create env file template (fill in manually)
if [ ! -f /home/blog/.watchdog.env ]; then
    cat > /home/blog/.watchdog.env << 'ENVEOF'
# Fill these in:
REDIS_URL=
OPSGENIE_API_KEY=
FLY_API_TOKEN=
GH_TOKEN=
ENVEOF
    chown blog:blog /home/blog/.watchdog.env
    chmod 600 /home/blog/.watchdog.env
    echo "Created /home/blog/.watchdog.env — fill in credentials!"
fi

# Create systemd service
cat > /etc/systemd/system/ethernal-watchdog.service << 'EOF'
[Unit]
Description=Ethernal Worker Watchdog
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=blog
EnvironmentFile=/home/blog/.watchdog.env
ExecStart=/opt/ethernal/scripts/watchdog.sh
TimeoutStartSec=300
StandardOutput=journal
StandardError=journal
EOF

# Create systemd timer
cat > /etc/systemd/system/ethernal-watchdog.timer << 'EOF'
[Unit]
Description=Run Ethernal Worker Watchdog every 90s

[Timer]
OnBootSec=120
OnUnitActiveSec=90
AccuracySec=5

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable ethernal-watchdog.timer
systemctl start ethernal-watchdog.timer

echo ""
echo "=== Setup complete ==="
echo "Timer status: $(systemctl is-active ethernal-watchdog.timer)"
echo ""
echo "Next steps:"
echo "  1. Fill in /home/blog/.watchdog.env with credentials"
echo "  2. Copy scripts to /opt/ethernal/scripts/"
echo "  3. Authenticate Fly CLI: flyctl auth login"
echo "  4. Test: systemctl start ethernal-watchdog.service && journalctl -u ethernal-watchdog -f"
