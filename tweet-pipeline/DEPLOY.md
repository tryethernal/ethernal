# Tweet Pipeline — Server Deployment

Target server: Hetzner `157.90.154.200`, user `blog`.

## 1. Add Twitter credentials

Append to `/opt/blog-pipeline.env`:

```bash
TWITTER_API_KEY=<your-key>
TWITTER_API_SECRET=<your-secret>
TWITTER_ACCESS_TOKEN=<your-token>
TWITTER_ACCESS_SECRET=<your-token-secret>
TWEET_QUEUE_DIR=/home/blog/tweet-queue
POSTHOG_API_KEY=<your-posthog-project-api-key>
```

## 2. Create queue directory

```bash
mkdir -p /home/blog/tweet-queue
```

## 3. Install dependencies

```bash
cd /opt/ethernal-blog-stack/tweet-pipeline
npm ci
npx playwright install chromium --with-deps
```

## 4. Install systemd timers

Copy units to user-level systemd directory:

```bash
mkdir -p ~/.config/systemd/user

cp /opt/ethernal-blog-stack/tweet-pipeline/tweet-draft.service ~/.config/systemd/user/
cp /opt/ethernal-blog-stack/tweet-pipeline/tweet-draft.timer ~/.config/systemd/user/
cp /opt/ethernal-blog-stack/tweet-pipeline/tweet-publish.service ~/.config/systemd/user/
cp /opt/ethernal-blog-stack/tweet-pipeline/tweet-publish.timer ~/.config/systemd/user/
cp /opt/ethernal-blog-stack/tweet-pipeline/tweet-engagement.service ~/.config/systemd/user/
cp /opt/ethernal-blog-stack/tweet-pipeline/tweet-engagement.timer ~/.config/systemd/user/

systemctl --user daemon-reload
systemctl --user enable --now tweet-draft.timer
systemctl --user enable --now tweet-publish.timer
systemctl --user enable --now tweet-engagement.timer
```

Ensure lingering is enabled so user timers run without an active login session:

```bash
sudo loginctl enable-linger blog
```

## 5. Verify

```bash
systemctl --user list-timers

# Check next fire times
systemctl --user status tweet-draft.timer
systemctl --user status tweet-publish.timer
systemctl --user status tweet-engagement.timer
```

## 6. Manual testing

Run the draft pipeline once:

```bash
/opt/ethernal-blog-stack/tweet-pipeline/draft.sh
```

Run the publisher once:

```bash
/opt/ethernal-blog-stack/tweet-pipeline/publish.sh
```

Check logs:

```bash
journalctl --user -u tweet-draft.service -f
journalctl --user -u tweet-publish.service -f
journalctl --user -u tweet-engagement.service -f
```

## 7. Engagement bridge

The engagement bridge (`engagement-bridge.sh`) runs daily at 22:00 UTC via its systemd timer. It collects tweet IDs from the last 30 days and fetches their engagement metrics (likes, retweets, replies, impressions) from the Twitter API, then sends each as a `twitter:tweet_engagement` PostHog event.

The publisher also sends a `twitter:tweet_posted` PostHog event on each successful post.

## 8. Blog-to-Twitter flywheel

No extra configuration needed. The tweet pipeline's source selector (slot 4, "Blog repurposing") automatically reads published blog articles sorted by date, newest first. When a new article is published via `blog-publish.yml`, the next daily draft run will pick it up and generate tweets from it.
