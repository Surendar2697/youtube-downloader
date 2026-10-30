# YT Downloader 🎬

A clean, self-hosted web application to download YouTube videos in any resolution or as MP3.

## Features

- 🎬 **Multiple video qualities** — 144p up to 4K (2160p)
- 🎵 **Audio-only MP3** — multiple bitrates
- 🔇 **Video without audio** — toggle to strip audio track
- ⚡ **Unlimited download time** — no timeouts
- 📊 **Live progress bar** — real-time download feedback
- 🌙 **Dark UI** — modern glass-morphism design

---

## Running Locally

### Prerequisites

- **Node.js 18+**
- **npm**

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

Open `http://localhost:3000` in your browser.

---

## Deployment (Free Hosting Options)

### 🚀 Railway (Recommended — Free tier)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select your repo — Railway auto-detects Node.js
4. It will be live at `https://<your-project>.up.railway.app`

### 🎨 Render (Free tier)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your repo
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`

### ☁️ Google Cloud Run / Fly.io / Cyclic

All support Node.js apps — just connect your GitHub repo.

> ⚠️ **GitHub Pages won't work** for this app because it needs a Node.js server to proxy YouTube streams. Use any of the free hosting options above instead.

---

## Project Structure

```
YT-mp3/
├── server.js          # Express API backend
├── package.json
├── .gitignore
├── Procfile           # For Heroku / Railway
└── public/
    ├── index.html     # Single-page frontend
    ├── style.css      # Dark theme styles
    └── script.js      # Client-side logic
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/info?url=...` | Fetch video metadata + available formats |
| `GET`  | `/api/download?url=...&itag=...&type=...` | Stream the download |
| `GET`  | `/api/health` | Health check |

### `/api/download` parameters

| Param | Values | Description |
|-------|--------|-------------|
| `url` | YouTube URL | Required |
| `itag` | format itag | Required — from `/api/info` |
| `type` | `video` \| `audio` | Download type |
| `noAudio` | `true` \| `false` | Strip audio from video |
| `audioItag` | audio itag | Audio stream for merging (adaptive video) |
| `filename` | string | Suggested download filename |

---

## Legal Notice

This tool is for **personal, non-commercial use only**.  
Respect YouTube's [Terms of Service](https://www.youtube.com/t/terms) and applicable copyright laws.
