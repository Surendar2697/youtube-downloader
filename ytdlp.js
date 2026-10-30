/**
 * yt-dlp bootstrap — downloads the yt-dlp binary on first run.
 * Supports Windows (.exe), macOS, and Linux.
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const BIN_DIR = path.join(__dirname, 'bin');
const IS_WIN  = process.platform === 'win32';
const BIN_NAME = IS_WIN ? 'yt-dlp.exe' : 'yt-dlp';
const BIN_PATH = path.join(BIN_DIR, BIN_NAME);

const DOWNLOAD_URL = IS_WIN
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : process.platform === 'darwin'
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

function getBinPath() {
  return BIN_PATH;
}

/**
 * Ensure yt-dlp binary exists; download if missing.
 * Follows redirects automatically.
 */
function ensureBinary() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(BIN_PATH)) {
      return resolve(BIN_PATH);
    }

    console.log('⬇  yt-dlp binary not found — downloading…');
    fs.mkdirSync(BIN_DIR, { recursive: true });

    const file = fs.createWriteStream(BIN_PATH);

    function download(url, redirectCount = 0) {
      if (redirectCount > 10) return reject(new Error('Too many redirects'));

      https.get(url, { headers: { 'User-Agent': 'yt-downloader/2.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(BIN_PATH);
          return reject(new Error(`HTTP ${res.statusCode} when downloading yt-dlp`));
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        let loaded  = 0;
        let lastPct = 0;

        res.on('data', (chunk) => {
          loaded += chunk.length;
          if (total) {
            const pct = Math.floor((loaded / total) * 100);
            if (pct !== lastPct && pct % 10 === 0) {
              process.stdout.write(`\r   Downloading yt-dlp… ${pct}%`);
              lastPct = pct;
            }
          }
        });

        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            if (!IS_WIN) fs.chmodSync(BIN_PATH, 0o755);
            console.log('\n✅  yt-dlp downloaded to', BIN_PATH);
            resolve(BIN_PATH);
          });
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(BIN_PATH)) fs.unlinkSync(BIN_PATH);
        reject(err);
      });
    }

    download(DOWNLOAD_URL);
  });
}

module.exports = { getBinPath, ensureBinary };
