/* ──────────────────────────────────────────────────────────────────────────
   YTDown — Client-side YouTube Video & Audio Downloader
   Runs completely in the browser for GitHub Pages static hosting
   ────────────────────────────────────────────────────────────────────────── */

// Known active Invidious instances with CORS and API enabled
const INVIDIOUS_INSTANCES = [
  'https://yt.chocolatemoo53.com',
  'https://invidious.jing.rocks',
  'https://iv.melmac.space',
  'https://invidious.privacydev.net'
];

let videoData = null;
let selectedVideoFormat = null;
let selectedAudioFormat = null;
let currentVideoId = '';
let overlayTimer = null;

// ── DOM Helpers ──────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showErr(msg) {
  const b = $('errBox');
  b.textContent = '⚠️ ' + msg;
  b.classList.remove('hidden');
}

function clearErr() {
  $('errBox').classList.add('hidden');
}

function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function formatDuration(sec) {
  if (!sec) return '';
  const s = parseInt(sec, 10);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) {
    return `⏱ ${h}:${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `⏱ ${m}:${String(rem).padStart(2, '0')}`;
}

// ── Loader Overlay ────────────────────────────────────────────────────────────
function showOverlay() {
  clearTimeout(overlayTimer);
  $('dlOverlay').classList.remove('hidden');
}

function hideOverlay() {
  clearTimeout(overlayTimer);
  $('dlOverlay').classList.add('hidden');
}

function cancelOverlay() {
  hideOverlay();
}

function scheduleOverlayDismiss() {
  const dismiss = () => {
    hideOverlay();
    window.removeEventListener('focus', dismiss);
  };
  overlayTimer = setTimeout(dismiss, 5000);
  window.addEventListener('focus', dismiss, { once: true });
}

// ── Fetch Video Info via Invidious API ────────────────────────────────────────
async function fetchVideoData(videoId) {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${base}/api/v1/videos/${videoId}`, {
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        if (json && (json.adaptiveFormats || json.formatStreams)) {
          return json;
        }
      }
    } catch {
      // Try next instance
    }
  }

  // Fallback: oEmbed for basic details
  const oembedRes = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  );
  if (oembedRes.ok) {
    const oembed = await oembedRes.json();
    return {
      title: oembed.title,
      author: oembed.author_name,
      videoId,
      adaptiveFormats: []
    };
  }

  throw new Error('Could not fetch video info. Please verify the URL and try again.');
}

async function fetchInfo() {
  clearErr();
  const rawUrl = $('urlInput').value.trim();
  if (!rawUrl) {
    showErr('Please paste a YouTube URL.');
    return;
  }

  const videoId = extractVideoId(rawUrl);
  if (!videoId) {
    showErr('Invalid YouTube URL. Please check the link.');
    return;
  }

  currentVideoId = videoId;

  // Toggle fetch spinner
  const btn = $('fetchBtn');
  btn.disabled = true;
  $('fetchText').classList.add('hidden');
  $('fetchSpinner').classList.remove('hidden');

  // Hide previous cards
  $('infoCard').classList.add('hidden');
  $('pickerCard').classList.add('hidden');
  selectedVideoFormat = null;
  selectedAudioFormat = null;

  try {
    const data = await fetchVideoData(videoId);
    videoData = data;
    renderVideoInfo(data);
    renderFormats(data);

    $('infoCard').classList.remove('hidden');
    $('pickerCard').classList.remove('hidden');
  } catch (err) {
    showErr(err.message || 'Error loading video.');
  } finally {
    btn.disabled = false;
    $('fetchText').classList.remove('hidden');
    $('fetchSpinner').classList.add('hidden');
  }
}

// ── Render Info Card ──────────────────────────────────────────────────────────
function renderVideoInfo(data) {
  const thumbUrl = `https://i.ytimg.com/vi/${currentVideoId}/hqdefault.jpg`;
  $('thumb').src = thumbUrl;
  $('vTitle').textContent = data.title || 'YouTube Video';
  $('vAuthor').textContent = data.author ? `📺 ${data.author}` : '';
  $('vDuration').textContent = data.lengthSeconds ? formatDuration(data.lengthSeconds) : '';

  $('thumbWrap').onclick = () => {
    window.open(`https://www.youtube.com/watch?v=${currentVideoId}`, '_blank');
  };
}

// ── Render Format Buttons ─────────────────────────────────────────────────────
function renderFormats(data) {
  const formats = data.adaptiveFormats || [];
  const progStreams = data.formatStreams || [];

  // Group and sort video formats
  const seenResolutions = new Set();
  const videoList = [];

  // Progressive streams (with audio)
  progStreams.forEach((f) => {
    const label = f.qualityLabel || f.resolution;
    if (label && !seenResolutions.has(`prog-${label}`)) {
      seenResolutions.add(`prog-${label}`);
      videoList.push({
        url: f.url,
        label,
        container: f.container || 'mp4',
        hasAudio: true,
        height: parseInt(label, 10) || 0
      });
    }
  });

  // Adaptive video-only streams
  formats
    .filter((f) => f.resolution && f.type && f.type.startsWith('video/'))
    .forEach((f) => {
      const label = f.qualityLabel || f.resolution;
      const key = `${label}-${f.container || 'mp4'}`;
      if (!seenResolutions.has(key)) {
        seenResolutions.add(key);
        videoList.push({
          url: f.url,
          label,
          container: f.container || 'mp4',
          hasAudio: false,
          height: parseInt(label, 10) || 0
        });
      }
    });

  // Sort descending by resolution (4K down to 144p)
  videoList.sort((a, b) => b.height - a.height);

  // If no streams found via Invidious, supply standard resolution presets
  if (videoList.length === 0) {
    ['1080p', '720p', '480p', '360p', '240p', '144p'].forEach((res) => {
      videoList.push({
        url: `https://www.youtube.com/watch?v=${currentVideoId}`,
        label: res,
        container: 'mp4',
        hasAudio: true,
        height: parseInt(res, 10)
      });
    });
  }

  // Render Video Grid
  const vg = $('videoGrid');
  vg.innerHTML = '';
  videoList.forEach((fmt) => {
    const btn = document.createElement('button');
    btn.className = 'q-btn';

    let tag = 'SD';
    let tagCls = 'sd';
    if (fmt.height >= 2160) { tag = '4K'; tagCls = 'hd'; }
    else if (fmt.height >= 1440) { tag = '2K'; tagCls = 'hd'; }
    else if (fmt.height >= 1080) { tag = 'FHD'; tagCls = 'hd'; }
    else if (fmt.height >= 720) { tag = 'HD'; tagCls = 'hd'; }
    else if (fmt.height <= 240) { tag = 'LQ'; tagCls = 'lo'; }

    const audioIndicator = fmt.hasAudio ? '🔊' : '🔇';

    btn.innerHTML = `
      <span class="q-tag ${tagCls}">${tag}</span>
      <span class="q-main">${fmt.label}</span>
      <span class="q-sub">${(fmt.container || 'MP4').toUpperCase()} · ${audioIndicator}</span>
    `;
    btn.onclick = () => selectVideo(btn, fmt);
    vg.appendChild(btn);
  });

  // Render Audio Tracks
  const ag = $('audioGrid');
  ag.innerHTML = '';
  const audioStreams = formats.filter(
    (f) => f.type && (f.type.startsWith('audio/') || f.container === 'm4a' || f.container === 'webm')
  );

  const audioList = [];
  const seenBitrates = new Set();

  audioStreams.forEach((f) => {
    const bitrate = f.bitrate ? Math.round(parseInt(f.bitrate, 10) / 1000) : null;
    const label = bitrate ? `${bitrate} kbps` : 'Audio Track';
    if (!seenBitrates.has(label)) {
      seenBitrates.add(label);
      audioList.push({
        url: f.url,
        label,
        container: f.container || 'mp3'
      });
    }
  });

  if (audioList.length === 0) {
    audioList.push(
      { label: 'High Quality MP3', container: 'mp3', url: '' },
      { label: 'Standard 128 kbps', container: 'mp3', url: '' }
    );
  }

  audioList.forEach((fmt) => {
    const btn = document.createElement('button');
    btn.className = 'q-btn';
    btn.innerHTML = `
      <span class="q-tag audio">MP3</span>
      <span class="q-main">🎵</span>
      <span class="q-sub" style="font-weight:700; color:var(--text);">${fmt.label}</span>
    `;
    btn.onclick = () => selectAudio(btn, fmt);
    ag.appendChild(btn);
  });

  $('dlVideoBtn').disabled = true;
  $('dlAudioBtn').disabled = true;
  $('vBadge').classList.add('hidden');
  $('aBadge').classList.add('hidden');
}

// ── Selection Handlers ────────────────────────────────────────────────────────
function selectVideo(btn, fmt) {
  $('videoGrid').querySelectorAll('.q-btn').forEach((b) => b.classList.remove('sel'));
  btn.classList.add('sel');
  selectedVideoFormat = fmt;
  $('dlVideoBtn').disabled = false;
  $('vBadge').classList.remove('hidden');

  const muteState = $('noAudio').checked ? 'Without Audio (Mute)' : (fmt.hasAudio ? 'With Audio' : 'Video Only');
  $('vBadgeTxt').textContent = `${fmt.label} ${(fmt.container || 'mp4').toUpperCase()} — ${muteState}`;
}

function selectAudio(btn, fmt) {
  $('audioGrid').querySelectorAll('.q-btn').forEach((b) => b.classList.remove('a-sel'));
  btn.classList.add('a-sel');
  selectedAudioFormat = fmt;
  $('dlAudioBtn').disabled = false;
  $('aBadge').classList.remove('hidden');
  $('aBadgeTxt').textContent = `${fmt.label} ${(fmt.container || 'mp3').toUpperCase()}`;
}

function onToggleAudio() {
  if (selectedVideoFormat) {
    const muteState = $('noAudio').checked ? 'Without Audio (Mute)' : (selectedVideoFormat.hasAudio ? 'With Audio' : 'Video Only');
    $('vBadgeTxt').textContent = `${selectedVideoFormat.label} ${(selectedVideoFormat.container || 'mp4').toUpperCase()} — ${muteState}`;
  }
}

// ── Tab Switcher ──────────────────────────────────────────────────────────────
function switchTab(tab) {
  $('tabVideo').classList.toggle('active', tab === 'video');
  $('tabAudio').classList.toggle('active', tab === 'audio');
  $('paneVideo').classList.toggle('hidden', tab !== 'video');
  $('paneAudio').classList.toggle('hidden', tab !== 'audio');
}

// ── Trigger Download in Browser ───────────────────────────────────────────────
function downloadNow(type) {
  showOverlay();

  let targetUrl = '';
  let filename = (videoData?.title || 'download').replace(/[^\w\s\-().]/g, '').trim().substring(0, 100);

  if (type === 'audio') {
    if (!selectedAudioFormat) return;
    targetUrl = selectedAudioFormat.url;
    filename += `.${selectedAudioFormat.container || 'mp3'}`;
  } else {
    if (!selectedVideoFormat) return;
    targetUrl = selectedVideoFormat.url;
    const isMute = $('noAudio').checked;
    filename += isMute ? '-noaudio.mp4' : `.${selectedVideoFormat.container || 'mp4'}`;
  }

  if (!targetUrl) {
    // If direct stream URL was not returned, open video source
    targetUrl = `https://www.youtube.com/watch?v=${currentVideoId}`;
  }

  // Create native download anchor
  const a = document.createElement('a');
  a.href = targetUrl;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  scheduleOverlayDismiss();
}

// ── Event Listeners ───────────────────────────────────────────────────────────
$('urlInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fetchInfo();
});

$('urlInput').addEventListener('paste', () => {
  setTimeout(() => {
    const val = $('urlInput').value.trim();
    if (val.includes('youtube.com/') || val.includes('youtu.be/')) {
      fetchInfo();
    }
  }, 80);
});
