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

systemctl --user daemon-reload
systemctl --user enable --now tweet-draft.timer
systemctl --user enable --now tweet-publish.timer
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
```
