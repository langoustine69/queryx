# Queryx Landing Page

Static landing page for Queryx - the agent-native search API.

## Deploy on Railway

1. Create a new Railway project
2. Connect this repo
3. Set the root directory to `landing/`
4. Railway will auto-detect it as a static site

Or serve locally:

```bash
cd landing
python3 -m http.server 8080
# open http://localhost:8080
```

## Stack

- Pure HTML/CSS/JS
- No frameworks, no build step
- Inter + JetBrains Mono from Google Fonts
- Mobile responsive
- Dark mode only
