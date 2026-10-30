# YTDown 🎬 — YouTube Video & Audio Downloader

> 🚀 **Live Web App:** [https://surendar2697.github.io/youtube-downloader/](https://surendar2697.github.io/youtube-downloader/)

A fast, mobile-friendly, client-side web application to download YouTube videos in any resolution (144p to 4K) or as MP3/Audio. Designed to run natively on GitHub Pages with zero server backend.

---

## ✨ Features

- 🔗 **Instant Paste & Fetch**: Paste any YouTube link (Videos or Shorts) and fetch formats instantly.
- 🎬 **Full Resolution Options**: 2160p (4K), 1440p (2K), 1080p (FHD), 720p (HD), 480p, 360p, 240p, 144p.
- 🎵 **MP3 & Audio Downloads**: Download direct audio streams in multiple bitrates.
- 🔇 **Mute / Without Audio Toggle**: Customize your download to get pure video tracks with audio stripped.
- 📱 **Fully Mobile Responsive**: Clean dark glassmorphism design optimized for phones, tablets, and desktop.
- 📥 **Native Browser Downloads**: Downloads are triggered straight to your browser’s download manager with a sleek loading overlay.
- ⚡ **Unlimited Time & Zero Server Cost**: Operates entirely client-side on GitHub Pages.

---

## 🌐 Live Deployment on GitHub Pages

1. Go to your repository: [https://github.com/Surendar2697/youtube-downloader](https://github.com/Surendar2697/youtube-downloader)
2. Click **Settings** ➔ **Pages** (in the left sidebar).
3. Under **Build and deployment**:
   - **Source**: `Deploy from a branch` (or `GitHub Actions`)
   - **Branch**: `main` ➔ `/ (root)` or `/docs`
   - Click **Save**.
4. Your site will be live at:
   👉 **[https://surendar2697.github.io/youtube-downloader/](https://surendar2697.github.io/youtube-downloader/)**

---

## 🛠️ Project Structure

```
youtube-downloader/
├── index.html                  # Main web application entry point
├── style.css                   # Responsive dark-theme styling
├── app.js                      # Client-side stream extractor & downloader
├── docs/                       # Mirrored build for GitHub Pages docs support
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .github/workflows/deploy.yml # GitHub Actions auto-deployment workflow
└── README.md
```

---

## ⚖️ Legal Notice

This application is strictly for personal and educational use. Please respect YouTube's [Terms of Service](https://www.youtube.com/t/terms) and content creators' rights.
