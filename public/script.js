/* ──────────────────────────────────────────────────────────────────────────
   YT Downloader — script.js
   ────────────────────────────────────────────────────────────────────────── */

let videoInfo        = null;
let selectedVideoFmt = null;   // { formatId, label, hasAudio, ext }
let selectedAudioFmt = null;   // { formatId, abr }

// ── Helpers ──────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function showError(msg) {
  const el = $('errorMsg');
  el.textContent = '⚠️  ' + msg;
  el.classList.remove('hidden');
}
function clearError() { $('errorMsg').classList.add('hidden'); }

function formatDuration(s) {
  if (!s) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${m}:${String(sec).padStart(2,'0')}`;
}

function formatBytes(b) {
  if (!b) return '';
  if (b >= 1e9) return `~${(b/1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `~${(b/1e6).toFixed(0)} MB`;
  return `~${Math.round(b/1e3)} KB`;
}

// ── Download overlay ──────────────────────────────────────────────────────────

function showLoader() {
  $('dlOverlay').classList.remove('hidden');
}

function hideLoader() {
  $('dlOverlay').classList.add('hidden');
}

// ── Fetch Video Info ──────────────────────────────────────────────────────────

async function fetchInfo() {
  clearError();
  const url = $('urlInput').value.trim();
  if (!url) { showError('Please paste a YouTube URL.'); return; }

  // Show fetch spinner inside button
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
    const res  = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    videoInfo = data;
    renderInfo(data);
    renderFormats(data);
    $('videoInfo').classList.remove('hidden');
    $('formatSection').classList.remove('hidden');
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-spinner').classList.add('hidden');
  }
}

// ── Render Video Info ─────────────────────────────────────────────────────────

function renderInfo(data) {
  $('thumbnail').src             = data.thumbnail || '';
  $('videoTitle').textContent    = data.title     || '';
  $('videoChannel').textContent  = '📺 ' + (data.channel || 'Unknown');
  $('videoDuration').textContent = data.duration ? '⏱ ' + formatDuration(data.duration) : '';
  $('thumbWrap').onclick = () => window.open($('urlInput').value, '_blank');
}

// ── Render Quality Buttons ────────────────────────────────────────────────────

function renderFormats(data) {
  // Video
  const vGrid = $('qualityGrid');
  vGrid.innerHTML = '';

  (data.videoFormats || []).forEach((fmt) => {
    const btn = document.createElement('button');
    btn.className = 'quality-btn';

    const size      = fmt.filesize ? `<span class="q-sub">${formatBytes(fmt.filesize)}</span>` : '';
    const fps       = fmt.fps && fmt.fps > 30 ? `<span class="q-sub">${fmt.fps}fps</span>` : '';
    const badgeCls  = fmt.hasAudio ? 'prog' : 'only';
    const badgeTxt  = fmt.hasAudio ? '▶+🎵' : '▶ only';

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

  if (!data.videoFormats?.length)
    vGrid.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No video formats found.</p>';

  // Audio
  const aGrid = $('audioGrid');
  aGrid.innerHTML = '';

  (data.audioFormats || []).forEach((fmt) => {
    const btn = document.createElement('button');
    btn.className = 'quality-btn audio-btn';
    btn.innerHTML = `
      <span class="q-label">🎵</span>
      <span class="q-sub" style="font-size:.9rem;font-weight:700;">${fmt.abr}kbps</span>
      <span class="q-sub">MP3</span>
    `;
    btn.onclick = () => selectAudioQuality(btn, fmt);
    aGrid.appendChild(btn);
  });

  if (!data.audioFormats?.length)
    aGrid.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No audio formats found.</p>';

  $('downloadVideoBtn').disabled = true;
  $('downloadAudioBtn').disabled = true;
  $('selectedQualityBadge').classList.add('hidden');
  $('selectedAudioBadge').classList.add('hidden');
}

// ── Selection ─────────────────────────────────────────────────────────────────

function selectVideoQuality(btn, fmt) {
  document.querySelectorAll('#qualityGrid .quality-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedVideoFmt = fmt;
  $('downloadVideoBtn').disabled = false;
  $('selectedQualityBadge').classList.remove('hidden');
  $('selectedQualityLabel').textContent =
    `${fmt.label}${fmt.fps > 30 ? ' @ ' + fmt.fps + 'fps' : ''} — ${fmt.hasAudio ? 'Video + Audio' : 'Video only (audio merged)'}`;
}

function selectAudioQuality(btn, fmt) {
  document.querySelectorAll('#audioGrid .quality-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedAudioFmt = fmt;
  $('downloadAudioBtn').disabled = false;
  $('selectedAudioBadge').classList.remove('hidden');
  $('selectedAudioLabel').textContent = `${fmt.abr}kbps MP3`;
}

// ── Tab Switcher ──────────────────────────────────────────────────────────────

function switchTab(name, tabEl) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  $('videoTab').classList.toggle('hidden', name !== 'video');
  $('audioTab').classList.toggle('hidden', name !== 'audio');
}

// ── Download ──────────────────────────────────────────────────────────────────

function downloadNow(type) {
  if (!videoInfo) return;

  const url     = $('urlInput').value.trim();
  const noAudio = $('noAudioToggle').checked;
  const title   = videoInfo.title || 'download';

  let downloadUrl;

  if (type === 'audio') {
    if (!selectedAudioFmt) return;
    downloadUrl = buildUrl('/api/download', {
      url, formatId: selectedAudioFmt.formatId, type: 'audio', title,
    });
  } else {
    if (!selectedVideoFmt) return;
    downloadUrl = buildUrl('/api/download', {
      url,
      formatId: selectedVideoFmt.formatId,
      type: 'video',
      noAudio: noAudio ? 'true' : 'false',
      title,
    });
  }

  triggerDownload(downloadUrl);
}

function buildUrl(base, params) {
  const u = new URL(base, window.location.href);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) u.searchParams.set(k, String(v));
  });
  return u.href;
}

// ── Trigger native browser download with loader ───────────────────────────────
//
// Flow:
//  1. Show full-screen spinner overlay
//  2. Navigate hidden <a> to /api/download  (Content-Disposition: attachment)
//  3. Browser's own download bar takes over when headers arrive (~1-3s)
//  4. Hide the overlay after a short delay (the browser has taken control)
//
function triggerDownload(downloadUrl) {
  showLoader();

  // Create a hidden anchor and navigate it to the download URL
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // The browser download bar appears once the server starts sending headers.
  // yt-dlp typically takes 2-5 s to start the stream, so we wait a bit,
  // then hide the overlay so the user can interact with the page again.
  //
  // We also listen for the page re-gaining focus (user clicks browser download
  // bar / "Save" dialog) as an earlier signal to dismiss.
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    hideLoader();
    window.removeEventListener('focus', dismiss);
  };

  // Hide automatically after 6 s at the latest
  setTimeout(dismiss, 6000);
  // Hide earlier if user interacts with the download prompt
  window.addEventListener('focus', dismiss);
}

// ── Keyboard / paste shortcuts ────────────────────────────────────────────────

$('urlInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fetchInfo();
});

$('urlInput').addEventListener('paste', () => {
  setTimeout(() => {
    const val = $('urlInput').value.trim();
    if (val.includes('youtube.com/') || val.includes('youtu.be/')) fetchInfo();
  }, 80);
});
