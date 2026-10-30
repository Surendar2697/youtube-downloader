const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { spawn } = require('child_process');
const { getBinPath, ensureBinary } = require('./ytdlp');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Remove socket timeout so huge downloads never get cut off ────────────────
app.use((req, res, next) => {
  req.socket.setTimeout(0);
  res.setTimeout(0);
  next();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Run yt-dlp with the given args; return combined stdout as a string. */
function ytdlp(args) {
  return new Promise((resolve, reject) => {
    const bin  = getBinPath();
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let out = '';
    let err = '';

    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err.trim() || `yt-dlp exited with code ${code}`));
    });

    proc.on('error', reject);
  });
}

/** Spawn yt-dlp and pipe its stdout directly into an HTTP response. */
function ytdlpStream(args, res) {
  const bin  = getBinPath();
  const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stdout.pipe(res);

  proc.stderr.on('data', (d) => {
    // log progress lines but don't crash
    const line = d.toString().trim();
    if (line) process.stdout.write('\r  [yt-dlp] ' + line.slice(0, 120));
  });

  proc.on('error', (err) => {
    console.error('\n[yt-dlp spawn error]', err.message);
    if (!res.headersSent) res.status(500).end('Spawn error: ' + err.message);
    else res.end();
  });

  proc.on('close', (code) => {
    console.log(`\n[yt-dlp] exited with code ${code}`);
  });

  // If client disconnects, kill the subprocess
  res.on('close', () => proc.kill());
}

// ── GET /api/info ─────────────────────────────────────────────────────────────
// Returns video title, thumbnail, duration, and list of available formats.
app.get('/api/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    // -J = dump full JSON, --no-playlist = single video only
    const raw  = await ytdlp(['-J', '--no-playlist', '--no-warnings', url]);
    const data = JSON.parse(raw);

    // ── Build format list ─────────────────────────────────────────────────────
    const formats = data.formats || [];

    // Video qualities (include both progressive and video-only)
    const seenV = new Set();
    const videoFormats = [];

    formats
      .filter((f) => f.vcodec && f.vcodec !== 'none' && f.height)
      .sort((a, b) => b.height - a.height || (b.fps || 0) - (a.fps || 0))
      .forEach((f) => {
        const key = `${f.height}p${f.fps && f.fps > 30 ? f.fps : ''}`;
        if (seenV.has(key)) return;
        seenV.add(key);

        const hasAudio = f.acodec && f.acodec !== 'none';
        videoFormats.push({
          formatId:  f.format_id,
          label:     `${f.height}p${f.fps && f.fps > 30 ? f.fps : ''}`,
          height:    f.height,
          fps:       f.fps || 30,
          ext:       f.ext || 'mp4',
          hasAudio,
          filesize:  f.filesize || f.filesize_approx || null,
          vcodec:    f.vcodec,
        });
      });

    // Audio-only qualities (for MP3)
    const seenA = new Set();
    const audioFormats = [];

    formats
      .filter((f) => (!f.vcodec || f.vcodec === 'none') && f.acodec && f.acodec !== 'none' && f.abr)
      .sort((a, b) => (b.abr || 0) - (a.abr || 0))
      .forEach((f) => {
        const key = String(Math.round(f.abr || 0));
        if (seenA.has(key)) return;
        seenA.add(key);
        audioFormats.push({
          formatId: f.format_id,
          abr:      Math.round(f.abr),
          label:    `${Math.round(f.abr)}kbps`,
          ext:      f.ext || 'm4a',
          filesize: f.filesize || f.filesize_approx || null,
        });
      });

    return res.json({
      title:     data.title,
      thumbnail: data.thumbnail,
      duration:  data.duration,
      channel:   data.uploader || data.channel || '',
      videoFormats,
      audioFormats,
    });

  } catch (err) {
    console.error('[/api/info]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/download ─────────────────────────────────────────────────────────
// Streams the selected format directly to the browser.
//
// Query params:
//   url       – YouTube URL
//   formatId  – yt-dlp format ID for video (or audio-only)
//   type      – "video" | "audio"
//   noAudio   – "true" → strip audio from video stream
//   title     – suggested filename (without extension)
//
app.get('/api/download', async (req, res) => {
  const { url, formatId, type = 'video', noAudio, title = 'download' } = req.query;

  if (!url || !formatId) return res.status(400).json({ error: 'Missing url or formatId' });

  req.socket.setTimeout(0);
  req.socket.setKeepAlive(true);
  res.setTimeout(0);

  // Sanitise filename (remove chars that break Content-Disposition)
  const safeTitle = title.replace(/[^\w\s\-().]/g, '').trim().substring(0, 180) || 'download';

  try {
    if (type === 'audio') {
      // ── MP3 audio: transcode to mp3 via yt-dlp's built-in ffmpeg ─────────
      // Output to stdout as mp3
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Transfer-Encoding', 'chunked');

      ytdlpStream([
        '-f', formatId,
        '--no-playlist',
        '-x',                      // extract audio
        '--audio-format', 'mp3',
        '--audio-quality', '0',    // best quality
        '-o', '-',                 // output to stdout
        '--no-warnings',
        url,
      ], res);

    } else if (noAudio === 'true') {
      // ── Video without audio ───────────────────────────────────────────────
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-noaudio.mp4"`);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Transfer-Encoding', 'chunked');

      ytdlpStream([
        '-f', formatId,
        '--no-playlist',
        '-o', '-',
        '--no-warnings',
        url,
      ], res);

    } else {
      // ── Video (with audio merged by yt-dlp if needed) ─────────────────────
      // For video-only formats (like 1080p), yt-dlp auto-merges best audio.
      // Format selector: "chosen_video+bestaudio/chosen_video"
      const fmtSelector = `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/${formatId}`;

      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Transfer-Encoding', 'chunked');

      ytdlpStream([
        '-f', fmtSelector,
        '--no-playlist',
        '--merge-output-format', 'mp4',
        '-o', '-',
        '--no-warnings',
        url,
      ], res);
    }

  } catch (err) {
    console.error('[/api/download]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ── Catch-all → serve frontend ────────────────────────────────────────────────
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await ensureBinary();      // download yt-dlp if not present
    app.listen(PORT, () => {
      console.log(`\n✅  YT Downloader running → http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('❌  Failed to start:', err.message);
    process.exit(1);
  }
})();
