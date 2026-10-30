# YTDown 🎬 — YouTube Video & Audio Downloader

A full-featured, mobile-responsive web application to download YouTube videos in any resolution (144p up to 4K) or as MP3 audio. Features native browser downloads with custom options (video only / without audio) and live stream extraction powered by `yt-dlp`.

---

## ✨ Features

- 🔗 **Instant Paste & Fetch**: Paste any YouTube link (Videos or Shorts) and fetch available formats immediately.
- 🎬 **All Video Qualities**: 2160p (4K), 1440p (2K), 1080p (FHD), 720p (HD), 480p, 360p, 240p, 144p.
- 🎵 **MP3 & Audio Downloads**: Select bitrates (e.g., 130 kbps) and download audio files.
- 🔇 **Without Audio Toggle**: Download pure video without audio (mute option).
- 📥 **Direct Browser Downloads**: Triggers native browser download prompts via `Content-Disposition: attachment`. Never opens or plays videos in YouTube tabs.
- ⏳ **Download Loader Overlay**: Smooth fullscreen animated loader while the stream is fetched and prepared.
- 📱 **Mobile Responsive**: Fully responsive dark glassmorphism UI for mobile devices, tablets, and desktops.
- ⚡ **Zero Timeout**: Configured for unlimited download time even on large 4K files.

---

## 🚀 Running Locally

### Prerequisites
- **Node.js 18+**
- **npm**

### Quick Start
```bash
# 1. Clone repository
git clone https://github.com/Surendar2697/youtube-downloader.git
cd youtube-downloader

# 2. Install dependencies
npm install

# 3. Start web server
npm start
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> 💡 *On first run, the server automatically downloads the latest `yt-dlp` binary into `bin/` (~9MB).*

---

## ☁️ Free 1-Click Cloud Deployment

To host this web application online with unlimited runtime and working downloads:

### Option 1: Railway (Recommended — Free)
1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** ➔ **Deploy from GitHub repo**.
3. Select `Surendar2697/youtube-downloader`.
4. Railway will auto-detect Node.js, run `npm install` and `npm start`.
5. Under **Settings** ➔ **Networking**, click **Generate Domain** to get your public live URL.

### Option 2: Render (Free)
1. Go to [render.com](https://render.com) and create a free account.
2. Click **New +** ➔ **Web Service**.
3. Connect your GitHub repository: `Surendar2697/youtube-downloader`.
4. Configure:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Deploy Web Service**.

---

## 📂 Project Structure

```
youtube-downloader/
├── server.js                  # Express API server (streaming download engine)
├── ytdlp.js                   # yt-dlp binary downloader & bootstrapper
├── package.json               # Node.js dependencies & scripts
├── Procfile                   # Cloud process file (for Railway/Render/Heroku)
├── public/                    # Web application frontend assets
│   ├── index.html             # Clean responsive UI
│   ├── style.css              # Dark glassmorphism styles
│   └── script.js              # Client logic & download handlers
├── docs/                      # Static mirror
└── README.md                  # Project documentation
```

---

## ⚖️ Legal Notice

This application is strictly for personal, non-commercial use. Please respect YouTube's [Terms of Service](https://www.youtube.com/t/terms) and creators' copyright.
