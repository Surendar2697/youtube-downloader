/* ──────────────────────────────────────────────────────────────────────────
   YT Downloader — Local Web Application Client
   ────────────────────────────────────────────────────────────────────────── */

let videoInfo = null;
let selectedVideoFmt = null;
let selectedAudioFmt = null;
let currentTab = 'video';
let overlayDismissTimer = null;

// ── DOM Helpers ──────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showError(msg) {
  const el = $('errorMsg');
  el.textContent = '⚠️ ' + msg;
  el.classList.remove('hidden');
}

function clearError() {
  $('errorMsg').classList.add('hidden');
}

function formatDuration(s) {
  if (!s) return '';
  const sec = parseInt(s, 10);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  if (h > 0) {
    return `⏱ ${h}:${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `⏱ ${m}:${String(rem).padStart(2, '0')}`;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const b = parseInt(bytes, 10);
  if (b >= 1e9) return `~${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `~${(b / 1e6).toFixed(0)} MB`;
  return `~${Math.round(b / 1e3)} KB`;
}

// ── Loader Overlay ────────────────────────────────────────────────────────────
function showLoader() {
  clearTimeout(overlayDismissTimer);
  $('dlOverlay').classList.remove('hidden');
}

function hideLoader() {
  clearTimeout(overlayDismissTimer);
  $('dlOverlay').classList.add('hidden');
}

function cancelOverlay() {
  hideLoader();
}

function scheduleLoaderDismiss() {
  const dismiss = () => {
    hideLoader();
    window.removeEventListener('focus', dismiss);
  };
  overlayDismissTimer = setTimeout(dismiss, 6000);
  window.addEventListener('focus', dismiss, { once: true });
}

// ── Fetch Video Info via Local API ────────────────────────────────────────────
async function fetchInfo() {
  clearError();
  const rawUrl = $('urlInput').value.trim();
  if (!rawUrl) {
    showError('Please paste a YouTube URL.');
    return;
  }

  // Toggle button spinner
  const btn = $('fetchBtn');
  btn.disabled = true;
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-spinner').classList.remove('hidden');

  // Reset previous results
  $('videoInfo').classList.add('hidden');
  $('formatSection').classList.add('hidden');
  selectedVideoFmt = null;
  selectedAudioFmt = null;

  try {
    const res = await fetch(`/api/info?url=${encodeURIComponent(rawUrl)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch video details.');
    }

    videoInfo = data;
    renderVideoInfo(data);
    renderFormats(data);

    $('videoInfo').classList.remove('hidden');
    $('formatSection').classList.remove('hidden');
  } catch (err) {
    showError(err.message || 'Error communicating with server.');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-spinner').classList.add('hidden');
  }
}

// ── Render Info Card ──────────────────────────────────────────────────────────
function renderVideoInfo(data) {
  $('thumbnail').src = data.thumbnail || '';
  $('videoTitle').textContent = data.title || 'YouTube Video';
  $('videoChannel').textContent = data.channel ? `📺 ${data.channel}` : '';
  $('videoDuration').textContent = data.duration ? formatDuration(data.duration) : '';

  $('thumbWrap').onclick = () => {
    window.open($('urlInput').value.trim(), '_blank');
  };
}

// ── Render Quality Buttons ────────────────────────────────────────────────────
function renderFormats(data) {
  // Video Qualities
  const vGrid = $('qualityGrid');
  vGrid.innerHTML = '';

  const vFormats = data.videoFormats || [];
  if (vFormats.length === 0) {
    vGrid.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No video formats available.</p>';
  } else {
    vFormats.forEach((fmt) => {
      const btn = document.createElement('button');
      btn.className = 'quality-btn';

      const size = fmt.filesize ? `<span class="q-sub">${formatBytes(fmt.filesize)}</span>` : '';
      const fps = fmt.fps && fmt.fps > 30 ? `<span class="q-sub">${fmt.fps}fps</span>` : '';
      const badgeCls = fmt.hasAudio ? 'prog' : 'only';
      const badgeTxt = fmt.hasAudio ? '▶+🎵' : '▶ only';

      btn.innerHTML = `
        <span class="q-badge ${badgeCls}">${badgeTxt}</span>
        <span class="q-label">${fmt.label}</span>
        ${fps}
        <span class="q-sub">${(fmt.ext || 'mp4').toUpperCase()}</span>
        ${size}
      `;
      btn.onclick = () => selectVideoQuality(btn, fmt);
      vGrid.appendChild(btn);
    });
  }

  // Audio Qualities
  const aGrid = $('audioGrid');
  aGrid.innerHTML = '';

  const aFormats = data.audioFormats || [];
  if (aFormats.length === 0) {
    aGrid.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No audio formats available.</p>';
  } else {
    aFormats.forEach((fmt) => {
      const btn = document.createElement('button');
      btn.className = 'quality-btn audio-btn';
      btn.innerHTML = `
        <span class="q-label">🎵</span>
        <span class="q-sub" style="font-size:.92rem;font-weight:700;">${fmt.abr} kbps</span>
        <span class="q-sub">MP3</span>
      `;
      btn.onclick = () => selectAudioQuality(btn, fmt);
      aGrid.appendChild(btn);
    });
  }

  $('downloadVideoBtn').disabled = true;
  $('downloadAudioBtn').disabled = true;
  $('selectedQualityBadge').classList.add('hidden');
  $('selectedAudioBadge').classList.add('hidden');
}

// ── Selection Handlers ────────────────────────────────────────────────────────
function selectVideoQuality(btn, fmt) {
  document.querySelectorAll('#qualityGrid .quality-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedVideoFmt = fmt;
  $('downloadVideoBtn').disabled = false;
  $('selectedQualityBadge').classList.remove('hidden');

  updateVideoBadgeText();
}

function selectAudioQuality(btn, fmt) {
  document.querySelectorAll('#audioGrid .quality-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedAudioFmt = fmt;
  $('downloadAudioBtn').disabled = false;
  $('selectedAudioBadge').classList.remove('hidden');
  $('selectedAudioLabel').textContent = `${fmt.abr} kbps MP3 Audio`;
}

function onToggleAudio() {
  if (selectedVideoFmt) {
    updateVideoBadgeText();
  }
}

function updateVideoBadgeText() {
  if (!selectedVideoFmt) return;
  const isNoAudio = $('noAudioToggle').checked;
  const audioStatus = isNoAudio ? 'Without Audio (Mute)' : (selectedVideoFmt.hasAudio ? 'Video + Audio' : 'Video with Audio Merged');
  const fpsText = selectedVideoFmt.fps > 30 ? ` @ ${selectedVideoFmt.fps}fps` : '';
  $('selectedQualityLabel').textContent = `${selectedVideoFmt.label}${fpsText} — ${audioStatus}`;
}

// ── Tab Switcher ──────────────────────────────────────────────────────────────
function switchTab(name, tabEl) {
  currentTab = name;
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  tabEl.classList.add('active');
  $('videoTab').classList.toggle('hidden', name !== 'video');
  $('audioTab').classList.toggle('hidden', name !== 'audio');
}

// ── Download Execution ────────────────────────────────────────────────────────
function downloadNow(type) {
  if (!videoInfo) return;

  const url = $('urlInput').value.trim();
  const title = videoInfo.title || 'download';
  let downloadUrl = '';

  if (type === 'audio') {
    if (!selectedAudioFmt) return;
    downloadUrl = buildUrl('/api/download', {
      url,
      formatId: selectedAudioFmt.formatId,
      type: 'audio',
      title,
    });
  } else {
    if (!selectedVideoFmt) return;
    const isNoAudio = $('noAudioToggle').checked;
    downloadUrl = buildUrl('/api/download', {
      url,
      formatId: selectedVideoFmt.formatId,
      type: 'video',
      noAudio: isNoAudio ? 'true' : 'false',
      title,
    });
  }

  triggerDownload(downloadUrl);
}

function buildUrl(base, params) {
  const u = new URL(base, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) u.searchParams.set(k, String(v));
  });
  return u.href;
}

// ── Trigger Native Browser Download ───────────────────────────────────────────
// Uses a hidden iframe pointed at the streaming download endpoint.
// The server returns Content-Disposition: attachment, prompting the browser's
// native download manager to download and save the file directly.
// This guarantees:
//   1. The video NEVER plays in a new tab or window.
//   2. The main page stays responsive.
//   3. Native browser download dialog appears.
function triggerDownload(downloadUrl) {
  showLoader();

  // Create an invisible iframe for download triggering
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = downloadUrl;
  document.body.appendChild(iframe);

  // Clean up iframe after download starts
  setTimeout(() => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }, 90000);

  scheduleLoaderDismiss();
}

// ── Event Shortcuts ───────────────────────────────────────────────────────────
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
