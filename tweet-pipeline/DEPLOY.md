# Tweet Pipeline — Server Deployment

Target server: Hetzner `157.90.154.200`, user `blog`.

The tweet pipeline runs standalone at `/opt/tweet-pipeline/` (no git checkout).
Deploy changes from the repo via `deploy.sh`.

## First-time setup

### 1. Add Twitter credentials

Append to `/opt/blog-pipeline.env`:

```bash
TWITTER_API_KEY=<your-key>
TWITTER_API_SECRET=<your-secret>
TWITTER_ACCESS_TOKEN=<your-token>
TWITTER_ACCESS_SECRET=<your-token-secret>
TWEET_QUEUE_DIR=/home/blog/tweet-queue
POSTHOG_API_KEY=<your-posthog-project-api-key>
```

### 2. Create directories

```bash
mkdir -p /home/blog/tweet-queue
mkdir -p /opt/tweet-pipeline
```

### 3. Deploy from local machine

```bash
bash tweet-pipeline/deploy.sh
```

This rsyncs the pipeline, runs `npm ci`, and installs Playwright chromium.

### 4. Install systemd timers

```bash
mkdir -p ~/.config/systemd/user

cp /opt/tweet-pipeline/*.service ~/.config/systemd/user/
cp /opt/tweet-pipeline/*.timer ~/.config/systemd/user/

systemctl --user daemon-reload
systemctl --user enable --now tweet-draft.timer
systemctl --user enable --now tweet-publish.timer
systemctl --user enable --now tweet-engagement.timer
systemctl --user enable --now scan-newsletter.timer
```

Ensure lingering is enabled:

```bash
sudo loginctl enable-linger blog
```

## Deploying updates

After making changes to tweet pipeline code:

```bash
bash tweet-pipeline/deploy.sh
```

If systemd service/timer files changed, also run on the server:

```bash
cp /opt/tweet-pipeline/*.service /opt/tweet-pipeline/*.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user restart tweet-draft.timer tweet-publish.timer tweet-engagement.timer scan-newsletter.timer
```

## Verify

```bash
systemctl --user list-timers
systemctl --user status tweet-draft.timer
systemctl --user status tweet-publish.timer
systemctl --user status tweet-engagement.timer
systemctl --user status scan-newsletter.timer
```

## Manual testing

```bash
/opt/tweet-pipeline/draft.sh 1
/opt/tweet-pipeline/publish.sh
```

Check logs:

```bash
journalctl --user -u tweet-draft.service -f
journalctl --user -u tweet-publish.service -f
journalctl --user -u tweet-engagement.service -f
journalctl --user -u scan-newsletter.service -f
```
