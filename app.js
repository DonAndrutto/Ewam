
// ══════════════════════════════════════════════════════
// LANGUAGES
//
// Everything the app says in a language other than Tibetan
// lives in one of two places:
//
//   UI_STRINGS[lang]   — the interface chrome (this block)
//   CONTENT_<LANG>     — the liturgy itself, keyed by block id
//                        (right after TABS_DATA below)
//
// English is the base: any key missing from another language
// falls back to it, so a partial translation still renders.
// To add a language, register it in LANGS, add a UI_STRINGS
// entry and a CONTENT_* bundle, then list it in CONTENT_L10N.
// ══════════════════════════════════════════════════════

// Register additional interface languages when their content is available.
const LANGS = { en: { code: "EN", name: "English", htmlLang: "en" } };

const UI_STRINGS = {
  en: {
    docTitle: 'Ewam Collection',
    loaderEnter: 'Enter — Ewam Collection',
    loaderHint: 'Tap or press Enter',
    appTitle: 'Ewam Collection',

    langMenu: 'Language',
    langTib: 'TIB',
    langPho: 'PHO',
    langTrans: 'ENG',
    donate: 'Donate',

    introduction: 'Introduction',
    introAbout: 'About the Text',
    introHowTo: 'How to Use',
    introExpand: 'Read more',
    introCollapse: 'Show less',
    introDismiss: 'Tap outside to close',
    introCloseBtn: 'Close introduction',
    welcomeReadFull: 'Read the full introduction',
    welcomeProceed: 'Proceed to the Text',

    tabE: 'E',
    tabIndex: 'Index',
    tabWam: 'Wam',

    indexHeading: 'Sections',

    repeated: 'Repeated',
    repeatedHint: 'This passage is recited repeatedly',

    barSlower: 'Slower',
    barPlayPause: 'Play/Pause',
    barFaster: 'Faster',
    barFullscreen: 'Fullscreen',
    barTilt: 'Tilt scroll',
    barTheme: 'Toggle theme',
    barSmaller: 'Smaller text',
    barLarger: 'Larger text',
    barPages: 'Page turning mode',
    scrollTop: 'Beginning of this title; tap again for the previous title',

    dlgDone: 'Done',

    settings: 'Settings',
    close: 'Close',

    /* Help overlay. Every other control it names borrows the string
       already used for that control above, so nothing on screen ever
       carries two different names. Only the three script toggles need
       their own: their faces read TIB / PHO / ENG, which is the thing
       the overlay exists to spell out. */
    helpTitle: 'Help',
    helpDismiss: 'Tap anywhere to close',
    helpTib: 'Tibetan',
    helpPho: 'Phonetics',
    helpEng: 'Translation'
  }
};

// Interface string for the active language, falling back to English.
function t(key) {
  const cur = UI_STRINGS[state.lang];
  if (cur && cur[key] !== undefined) return cur[key];
  const en = UI_STRINGS.en;
  return (en && en[key] !== undefined) ? en[key] : key;
}

// ══════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════

const STORAGE_KEY = 'ewam-collection-settings';

let state = loadState();

function defaultState() {
  return {
    // Master language. Drives the interface chrome, the section titles and
    // which translation / phonetic transcription the recitations are shown in.
    lang: 'en',
    fontSize: 16,
    isDark: false,
    showTibetan: true,
    showPhonetics: false,
    showTranslation: false,
    activeTab: 'E',
    collection: 'EWAM',
    positions: {},
    hasEntered: false,
    scrollSpeed: 2,
    readingMode: 'scroll',

  };
}

function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    const d = defaultState();
    if (!s) return d;
    const parsed = JSON.parse(s);
    const merged = { ...d, ...parsed };
    if (!['E', 'WAM', 'PRAYERS'].includes(merged.activeTab)) merged.activeTab = 'E';
    merged.collection = collectionForTab(merged.activeTab);
    if (!merged.positions || typeof merged.positions !== 'object' || Array.isArray(merged.positions)) merged.positions = {};
    if (!Number.isFinite(merged.fontSize)) merged.fontSize = d.fontSize;
    merged.fontSize = Math.max(12, Math.min(40, merged.fontSize));
    if (!['scroll', 'pages'].includes(merged.readingMode)) merged.readingMode = 'scroll';
    if (!LANGS[merged.lang]) merged.lang = 'en';
    return merged;
  } catch { return defaultState(); }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// ══════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════

// Imported source paragraphs, original run colors and inline image positions.
// IDs remain stable for future translations and language-specific phonetics.
const SOURCE_IMAGES = window.SOURCE_IMAGES;
const KARCHAK_LINKS = window.KARCHAK_LINKS;
const TABS_DATA = window.TABS_DATA;

Object.values(TABS_DATA).forEach(sections => sections.forEach(sec => sec.blocks.forEach(b => { b.tibetan = b.runs.map(r => r.text || "").join(""); })));
// Future bundle: {blocks: {"e-p0067": {translation, phonetics}}, sectionTitles: {}}.
const CONTENT_L10N = {};

function localizedBlock(id) {
  const bundle = CONTENT_L10N[state.lang];
  return (bundle && bundle.blocks && bundle.blocks[id]) || null;
}

// One field of a content block ('translation', 'phonetics', 'caption', …).
function blockText(b, field) {
  const loc = localizedBlock(b.id);
  if (loc && loc[field]) return loc[field];
  return b[field];
}

function sectionTitle(sec) {
  const bundle = CONTENT_L10N[state.lang];
  const titles = bundle && bundle.sectionTitles;
  if (titles && titles[sec.id]) return titles[sec.id];
  return sec.title;
}

// A section's blocks, minus any the active language's edition leaves out.
function sectionBlocks(sec) {
  const bundle = CONTENT_L10N[state.lang];
  const omit = bundle && bundle.omit;
  if (!omit || !omit.length) return sec.blocks;
  return sec.blocks.filter(b => omit.indexOf(b.id) === -1);
}

// ══════════════════════════════════════════════════════
// MASTER LANGUAGE
// ══════════════════════════════════════════════════════

function renderLangMenu() {
  const menu = document.getElementById('langMenu');
  if (!menu) return;
  menu.setAttribute('aria-label', t('langMenu'));
  menu.innerHTML = Object.keys(LANGS).map(code => {
    const l = LANGS[code];
    const on = code === state.lang;
    return '<button type="button" role="menuitemradio" aria-checked="' + on + '"' +
      ' onclick="setLanguage(\'' + code + '\')">' +
      '<span>' + esc(l.name) + '</span>' +
      '<span class="lang-code">' + esc(l.code) + '</span>' +
      '</button>';
  }).join('');
}

function toggleLangMenu() {
  const sel = document.getElementById('langSelect');
  const open = !sel.classList.contains('open');
  sel.classList.toggle('open', open);
  document.getElementById('langSelectBtn').setAttribute('aria-expanded', String(open));
}

function closeLangMenu() {
  const sel = document.getElementById('langSelect');
  if (!sel) return;
  sel.classList.remove('open');
  document.getElementById('langSelectBtn').setAttribute('aria-expanded', 'false');
}

function setLanguage(code) {
  if (!LANGS[code]) return;
  closeLangMenu();
  if (code === state.lang) return;
  state.lang = code;
  saveState();
  applyLanguage();
}

// Push the active language through every piece of static chrome, then
// re-render everything that is built from the data.
function applyLanguage() {
  const lang = LANGS[state.lang] || LANGS.en;

  document.documentElement.setAttribute('lang', lang.htmlLang);
  document.title = t('docTitle');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });

  // The three visibility toggles are labelled with the script they show, so
  // the translation one carries the active language's own code.
  document.getElementById('btnTib').textContent = t('langTib');
  document.getElementById('btnPho').textContent = t('langPho');
  document.getElementById('btnEng').textContent = t('langTrans');

  document.getElementById('langSelectCode').textContent = lang.code;
  document.getElementById('langSelectBtn').setAttribute('title', t('langMenu'));
  document.getElementById('langSelectBtn').setAttribute('aria-label', t('langMenu'));
  renderLangMenu();

  syncCollectionChrome();
  buildIntro();
  renderContentPreservingPlace();
  renderIndex();
  updateTabIndicator();
  measureStackHeight();
}

// ══════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.isDark ? 'dark' : 'light');
  document.getElementById('iconSun').style.display = state.isDark ? 'none' : 'block';
  document.getElementById('iconMoon').style.display = state.isDark ? 'block' : 'none';
}

function toggleTheme() {
  state.isDark = !state.isDark;
  applyTheme();
  saveState();
}

// ══════════════════════════════════════════════════════
// LANGUAGE TOGGLES
// ══════════════════════════════════════════════════════

function syncScriptToggles() {
  document.getElementById('btnTib').classList.toggle('active', state.showTibetan);
  document.getElementById('btnPho').classList.toggle('active', state.showPhonetics);
  document.getElementById('btnEng').classList.toggle('active', state.showTranslation);

  // Every run is already in the DOM; these three classes decide what is
  // shown. This is the whole of a script toggle.
  const area = document.getElementById('contentArea');
  if (!area) return;
  area.classList.toggle('hide-tib', !state.showTibetan);
  area.classList.toggle('hide-pho', !state.showPhonetics);
  area.classList.toggle('hide-eng', !state.showTranslation);
}

function applyLangs() {
  const anchor = captureReadingAnchor();
  syncScriptToggles();
  // Which runs are visible changes every block's height.
  invalidateGeometry();
  if (state.readingMode === 'pages') layoutReadingPage(anchor);
}

function toggleLang(which) {
  if (which === 'tibetan') state.showTibetan = !state.showTibetan;
  if (which === 'phonetics') state.showPhonetics = !state.showPhonetics;
  if (which === 'translation') state.showTranslation = !state.showTranslation;
  applyLangs();
  saveState();
}

// ══════════════════════════════════════════════════════
// FONT SIZE
// ══════════════════════════════════════════════════════

/* Keep the visible character, not a pixel offset in the entire volume. */
function changeFontSize(delta) {
  const next = Math.max(12, Math.min(40, state.fontSize + delta * 2));
  if (next === state.fontSize) return;
  const anchor = captureReadingAnchor();
  stopAutoScroll();
  stopTiltScroll();
  cancelPark();
  state.fontSize = next;
  applyFontSize();
  holdReadingPosition(anchor);
  saveState();
}

function applyFontSize() {
  // Set on the content area, not on :root. A custom property is inherited,
  // so writing it at the root would invalidate the computed style of every
  // element in the document — header, bottom bar, both overlays, the
  // garland — when only the liturgy needs resizing.
  const area = document.getElementById('contentArea');
  (area || document.documentElement).style.setProperty('--reader-fs', state.fontSize + 'px');
  invalidateGeometry();
}

// ══════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════

function switchTab(tab, opts = {}) {
  if (!TABS_DATA[tab]) return;
  if (!opts.skipRemember) rememberPosition();
  restoringPosition = false;
  closeCollectionMenu();
  cancelPark();
  stopAutoScroll();
  stopTiltScroll();
  closeSearch();
  closeHelp(false);
  closeIndex();
  const changed = state.activeTab !== tab;
  state.activeTab = tab;
  state.collection = collectionForTab(tab);
  saveState();
  syncCollectionChrome();
  buildIntro();
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  updateTabIndicator();
  if (changed) renderContent({animate:false});
  renderIndex();
  measureStackHeight();
  if (opts.restore) { restoreCollectionPosition(); return; }
  if (state.readingMode === 'pages' && !opts.keepScroll) {
    readingPage.section = 0;
    readingPage.index = 0;
    layoutReadingPage();
    return;
  }
  if (!opts.keepScroll) window.scrollTo({top:0, behavior:'instant'});
}

// ══════════════════════════════════════════════════════
// INDEX
// ══════════════════════════════════════════════════════

function toggleIndex() {
  closeSearch();
  closeHelp(false);
  const panel = document.getElementById('indexPanel');
  const open = !panel.classList.contains('open');
  if (open) {
    indexExpanded[state.activeTab] = true;
    renderIndex();
  }
  panel.classList.toggle('open', open);
  panel.inert = !open;
  document.getElementById('indexBackdrop').classList.toggle('open', open);
  const btn = document.querySelector('.tab-btn[data-tab="INDEX"]');
  btn.classList.toggle('active', open);
  btn.setAttribute('aria-expanded', String(open));
  if (open) queueIndexLocationUpdate(true);
  updateTabIndicator();
}

function closeIndex() {
  const panel = document.getElementById('indexPanel');
  panel.classList.remove('open');
  panel.inert = true;
  document.getElementById('indexBackdrop').classList.remove('open');
  const btn = document.querySelector('.tab-btn[data-tab="INDEX"]');
  btn.classList.remove('active');
  btn.setAttribute('aria-expanded', 'false');
  updateTabIndicator();
}

const INDEX_LINKS = ['E', 'WAM', 'PRAYERS'].flatMap(tab =>
  TABS_DATA[tab].flatMap((sec, sectionIdx) => sec.inIndex ? [{tab, sectionIdx, title:sec.title}] : []));
const indexExpanded = { E:true, WAM:false, PRAYERS:true };
let trackedSectionNodes = [];
let currentIndexKey = '';
let indexLocationFrame = 0;
let indexLocationForce = false;

function indexTitle(sec) {
  // Abbreviate the navigation label only. Source paragraphs keep the full title.
  return sectionTitle(sec).replace(/ཞེས་\s*བྱ་བ་\s*བཞུགས་སོ[།༔]*/gu, '').trim();
}

function renderIndex() {
  const container = document.getElementById('indexList');
  const tabs = COLLECTIONS[state.collection].tabs;
  let html = '<div class="index-collections" aria-label="Collections">' + Object.entries(COLLECTIONS).map(([key, collection]) =>
    '<button type="button" data-collection="' + key + '" aria-pressed="' + (state.collection === key) +
    '" onclick="switchCollection(\'' + key + '\',{showIndex:true})">' + esc(collection.label) + '</button>').join('') + '</div>';
  html += '<div class="index-heading">Texts</div>' + tabs.map(tab => {
    let group = '';
    const rows = INDEX_LINKS.map((link, i) => {
      if (link.tab !== tab) return '';
      const section = TABS_DATA[tab][link.sectionIdx];
      let heading = '';
      if (section.group && section.group !== group) {
        group = section.group;
        heading = '<div class="index-chapter" lang="bo">' + esc(group) + '</div>';
      }
      return heading + '<button type="button" class="index-item" lang="bo" data-index-tab="' + tab +
        '" data-section-idx="' + link.sectionIdx + '" onclick="jumpToIndex(' + i + ')">' +
        esc(indexTitle(section)) + '</button>';
    }).join('');
    return '<details class="index-volume" data-volume="' + tab + '"' + (indexExpanded[tab] ? ' open' : '') + '>' +
      '<summary>' + tabLabel(tab) + '</summary>' + rows + '</details>';
  }).join('');
  container.innerHTML = html;
  container.querySelectorAll('details').forEach(el => {
    el.addEventListener('toggle', () => { indexExpanded[el.dataset.volume] = el.open; });
  });
  syncCollectionChrome();
  queueIndexLocationUpdate(true);
}

function queueIndexLocationUpdate(force = false) {
  indexLocationForce = indexLocationForce || force;
  if (indexLocationFrame) return;
  indexLocationFrame = requestAnimationFrame(() => {
    indexLocationFrame = 0;
    const refresh = indexLocationForce;
    indexLocationForce = false;
    updateIndexLocation(refresh);
  });
}

function updateIndexLocation(force = false) {
  const sections = TABS_DATA[state.activeTab] || [];
  const stack = document.getElementById('stickyStack');
  // The text intersecting the reading line below the fixed header is current.
  // Read live positions: font sizing and deferred paragraph layout can move them.
  const readingLine = readerLine();
  let lo = 0, hi = trackedSectionNodes.length - 1, sectionIdx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (trackedSectionNodes[mid].getBoundingClientRect().top <= readingLine + 1) {
      sectionIdx = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (state.readingMode === 'pages') sectionIdx = readingPage.section;
  if (sectionIdx < 0 && trackedSectionNodes.length) sectionIdx = 0;
  if (!sections[sectionIdx]?.inIndex) sectionIdx = -1;
  const key = state.activeTab + ':' + sectionIdx;
  if (!force && key === currentIndexKey) return;
  currentIndexKey = key;

  let currentRow = null;
  document.querySelectorAll('#indexList .index-item').forEach(row => {
    const current = row.dataset.indexTab === state.activeTab && Number(row.dataset.sectionIdx) === sectionIdx;
    row.classList.toggle('is-current', current);
    if (current) {
      row.setAttribute('aria-current', 'location');
      currentRow = row;
    } else row.removeAttribute('aria-current');
  });
  document.querySelectorAll('#indexList .index-volume').forEach(group => {
    group.classList.toggle('has-current', group.dataset.volume === state.activeTab && sectionIdx >= 0);
  });
  const panel = document.getElementById('indexPanel');
  if (currentRow && panel.classList.contains('open') && currentRow.closest('details').open) {
    // Move only the index's own scroll position; never move the reading page.
    const row = currentRow.getBoundingClientRect(), bounds = panel.getBoundingClientRect();
    if (row.top < bounds.top + 8) panel.scrollTop += row.top - bounds.top - 8;
    else if (row.bottom > bounds.bottom - 8) panel.scrollTop += row.bottom - bounds.bottom + 8;
  }
}

window.addEventListener('scroll', () => queueIndexLocationUpdate(), {passive:true});
window.addEventListener('resize', () => queueIndexLocationUpdate(true), {passive:true});
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => { scrollHeightCache = 0; queueIndexLocationUpdate(); }).observe(document.getElementById('contentArea'));
}

function jumpToIndex(i) {
  const link = INDEX_LINKS[i];
  if (!link) return;
  jumpToSource(link.tab, TABS_DATA[link.tab][link.sectionIdx].blocks[0].id);
}

function jumpToSource(tab, bid, query = '') {
  if (!TABS_DATA[tab]?.some(section => section.blocks.some(block => block.id === bid))) return false;
  cancelPark();
  closeSearch();
  closeIndex();
  if (state.activeTab !== tab) switchTab(tab, {keepScroll:true});
  stopAutoScroll();
  stopTiltScroll();
  const requested = navigationToken;
  requestAnimationFrame(() => {
    if (requested !== navigationToken) return;
    const block = document.getElementById(bid);
    if (!block) return;
    // Materialize just the destination, then go straight there.
    block.classList.add('position-target');
    const range = query ? findSearchRange(block, query) : null;
    holdReadingPosition({block, range, top:readerLine()}, () => queueIndexLocationUpdate(true));
  });
  return false;
}

// Short, cancellable positioning work. Long jumps never animate through a volume.
let parkToken = 0;
let navigationToken = 0;
let parkFrame = 0;
let parkedBlock = null;

function cancelPark() {
  parkToken++;
  navigationToken++;
  if (parkFrame) cancelAnimationFrame(parkFrame);
  parkFrame = 0;
  if (parkedBlock) parkedBlock.classList.remove('position-target');
  parkedBlock = null;
  document.documentElement.classList.remove('reader-positioning');
}
window.addEventListener('wheel', cancelPark, {passive:true});
window.addEventListener('touchstart', cancelPark, {passive:true});
window.addEventListener('pointerdown', cancelPark, {passive:true});
window.addEventListener('keydown', e => {
  if (!e.target.closest('input, textarea') &&
      ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)) cancelPark();
});

function readerLine() {
  const stack = document.getElementById('stickyStack');
  return (stack && !document.body.classList.contains('fullscreen') ? stack.getBoundingClientRect().bottom : 0) + 20;
}

function characterRange(node, offset) {
  if (!node || node.nodeType !== Node.TEXT_NODE || !node.length) return null;
  const range = document.createRange();
  const start = Math.min(offset, node.length - 1);
  range.setStart(node, start);
  range.setEnd(node, Math.min(node.length, start + 1));
  return range;
}

function captureReadingAnchor() {
  if (state.readingMode === 'pages') return capturePageAnchor();
  const area = document.getElementById('contentArea');
  if (!area || !trackedBlockNodes.length) return null;
  const line = readerLine();
  // Binary search the block boxes. Never force layout of every off-screen run.
  let lo = 0, hi = trackedBlockNodes.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (trackedBlockNodes[mid].getBoundingClientRect().bottom <= line) lo = mid + 1;
    else hi = mid;
  }
  const block = trackedBlockNodes[lo];
  const bounds = block.getBoundingClientRect();
  const y = Math.max(line + 3, bounds.top + 3);
  if (y < innerHeight - 70) {
    for (const x of [bounds.left + bounds.width * 0.5, bounds.left + bounds.width * 0.25, bounds.left + 12]) {
      let range = null;
      if (document.caretPositionFromPoint) {
        const caret = document.caretPositionFromPoint(x, y);
        if (caret) range = characterRange(caret.offsetNode, caret.offset);
      } else if (document.caretRangeFromPoint) {
        const caret = document.caretRangeFromPoint(x, y);
        if (caret) range = characterRange(caret.startContainer, caret.startOffset);
      }
      if (range && block.contains(range.startContainer)) {
        const rect = range.getBoundingClientRect();
        if (rect.height && rect.bottom > line) return {block, range, top:rect.top};
      }
    }
  }
  return {block, range:null, top:bounds.top};
}

function holdReadingPosition(anchor, done) {
  if (!anchor || !anchor.block.isConnected) return;
  if (state.readingMode === 'pages') {
    cancelPark();
    layoutReadingPage(anchor);
    if (done) done();
    return;
  }
  cancelPark();
  const token = parkToken;
  const block = anchor.block;
  parkedBlock = block;
  block.classList.add('position-target');
  document.documentElement.classList.add('reader-positioning');
  const started = performance.now();
  let stable = 0;
  const correct = () => {
    if (token !== parkToken || !block.isConnected) return;
    const rect = anchor.range ? anchor.range.getBoundingClientRect() : block.getBoundingClientRect();
    const delta = rect.top - anchor.top;
    if (Math.abs(delta) > 0.75) {
      const before = window.scrollY;
      window.scrollTo({top:Math.max(0, before + delta), behavior:'instant'});
      stable = Math.abs(window.scrollY - before) < 0.5 ? stable + 1 : 0;
    } else stable++;
    // Only nearby blocks can settle now: no delayed whole-volume height table.
    if ((stable >= 8 && performance.now() - started >= 250 && document.fonts?.status !== 'loading') ||
        performance.now() - started > 2500) {
      block.classList.remove('position-target');
      parkedBlock = null;
      parkFrame = 0;
      document.documentElement.classList.remove('reader-positioning');
      queueIndexLocationUpdate(true);
      if (done) done();
      return;
    }
    parkFrame = requestAnimationFrame(correct);
  };
  correct();
}

function parkElementAt(el, offset, smooth, done) {
  if (el) holdReadingPosition({block:el, range:null, top:offset}, done);
}

function scrollToSectionEl(idx, smooth) {
  parkElementAt(document.getElementById('section-' + idx), readerLine(), false);
}

function jumpToSection(idx) {
  closeIndex();
  scrollToSectionEl(idx, false);
}


// ══════════════════════════════════════════════════════
// RENDER CONTENT
// ══════════════════════════════════════════════════════

function refrainMarker() {
  return '<div class="refrain-marker"><span class="refrain-label">' +
    '<svg class="refrain-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>' +
    '<polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>' +
    esc(t('repeated')) + '</span></div>';
}

/* Rebuild the body. Only called when the text itself changes — a tab
   switch or a language switch. Zoom and the script toggles no longer
   come through here; they are a custom property and a class. */
function renderContent(opts) {
  const sections = TABS_DATA[state.activeTab] || [];
  const area = document.getElementById('contentArea');
  const animate = !(opts && opts.animate === false);

  let html = '';

  sections.forEach((sec, si) => {
    html += '<div class="section-block" id="section-' + si + '">';
    // Heading paragraphs are retained in place, never duplicated as section labels.

    const blocks = sectionBlocks(sec);
    let bi = 0, refrainN = 0;
    while (bi < blocks.length) {
      const b = blocks[bi];
      if (b.variant === 'repeated') {
        // Wrap a contiguous run of repeated lines in one refrain panel
        let inner = '', bj = bi;
        while (bj < blocks.length && blocks[bj].variant === 'repeated') {
          inner += renderBlock(blocks[bj]);
          bj++;
        }
        html += '<div class="refrain-group" id="refrain-' + si + '-' + (refrainN++) +
          '" title="' + esc(t('repeatedHint')) + '">' + refrainMarker() + inner + '</div>';
        bi = bj;
      } else {
        html += renderBlock(b);
        bi++;
      }
    }

    html += '</div>';
  });

  area.classList.toggle('is-first-paint', animate);
  area.innerHTML = html;
  area.querySelectorAll('img').forEach(img => img.addEventListener('load', () => {
    scrollHeightCache = 0;
    if (state.readingMode === 'pages') queuePageLayout();
  }));
  trackedSectionNodes = Array.from(area.querySelectorAll('.section-block'));
  trackedBlockNodes = Array.from(area.querySelectorAll('.block[data-bid]'));
  queueIndexLocationUpdate(true);
  syncScriptToggles();

  // Let the entrance play for the frame it was staged in, then take the
  // class off so the next rebuild is silent.
  if (animate) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      area.classList.remove('is-first-paint');
    }));
  }

  updateHeightEstimates();
  if (state.readingMode === 'pages') {
    readingPage.section = 0;
    readingPage.index = 0;
    layoutReadingPage();
  }
}

/* Future translations retain the same source paragraph identifiers. */
function renderContentPreservingPlace() {
  const anchor = captureReadingAnchor();
  const bid = anchor?.block.dataset.bid;
  const top = anchor?.block.getBoundingClientRect().top;
  renderContent({animate:false});
  const block = bid && document.getElementById(bid);
  if (block) holdReadingPosition({block, range:null, top});
}

function renderSourceRuns(b) {
  const standalone = !b.tibetan.trim();
  const links = KARCHAK_LINKS[b.id] || [];
  let offset = 0, html = '';
  b.runs.forEach(run => {
    if (run.image) {
      const art = SOURCE_IMAGES[run.image];
      const style = standalone ? '' : ' style="width:' + run.emWidth + 'em"';
      html += '<img class="source-art ' + (standalone ? 'standalone-art' : 'inline-art') + '"' + style +
        ' src="' + art.src + '" width="' + art.width + '" height="' + art.height +
        '" alt="Tibetan lettering from the source text" decoding="async" />';
      return;
    }
    const cls = [run.blue ? 'source-blue' : 'source-black', run.bold ? 'source-bold' : '',
      run.italic ? 'source-italic' : '', run.underline ? 'source-underline' : ''].filter(Boolean).join(' ');
    const text = run.text || '';
    const end = offset + text.length;
    const cuts = [...new Set([offset, end, ...links.flatMap(link => [link.start, link.end])
      .filter(pos => pos > offset && pos < end)])].sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      const start = cuts[i], finish = cuts[i + 1];
      const link = links.find(item => item.start <= start && start < item.end);
      if (link && start === link.start) {
        const tab = link.target.startsWith('wam-') ? 'WAM' : 'E';
        html += '<a class="karchak-link" href="#' + link.target + '" data-target-bid="' + link.target +
          '" onclick="return jumpToSource(\'' + tab + '\',\'' + link.target + '\')">';
      }
      const scale = Number.isFinite(run.scale) ? ' style="font-size:' + run.scale + 'em"' : '';
      html += '<span class="' + cls + '"' + scale + '>' + esc(text.slice(start - offset, finish - offset)) + '</span>';
      if (link && finish === link.end) html += '</a>';
    }
    offset = end;
  });
  return html;
}

function renderBlock(b) {
  const pho = blockText(b, 'phonetics');
  const tr = blockText(b, 'translation');
  const hasArt = b.runs.some(r => r.image);
  const blank = !b.tibetan && !hasArt;
  const textRuns = b.runs.filter(run => (run.text || '').trim());
  const notesOnly = textRuns.length > 0 && textRuns.every(run => run.blue);
  const cls = 'block block-source block-recitation is-collapsible' +
    (b.tibetan || hasArt ? ' has-tib' : '') + (pho ? ' has-pho' : '') + (tr ? ' has-eng' : '') +
    (b.heading ? ' source-heading heading-' + b.heading : '') + (hasArt ? ' has-source-art' : '') +
    (blank ? ' source-blank' : '') + (notesOnly ? ' source-notes-only' : '');
  const style = b.align ? ' style="text-align:' + b.align + '"' : '';
  const tag = b.heading ? 'h' + Math.min(6, b.heading + 1) : 'div';
  let h = '<div class="' + cls + '" id="' + b.id + '" data-bid="' + b.id + '"' + style + '>';
  if (!blank) h += '<' + tag + ' class="tib" lang="bo">' + renderSourceRuns(b) + '</' + tag + '>';
  if (pho) h += '<div class="pho">' + esc(pho) + '</div>';
  if (tr) h += '<div class="eng">' + esc(tr) + '</div>';
  return h + '</div>';
}

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Small, synchronous estimates keep occluded paragraphs cheap without retaining
// shaped text for thousands of paragraphs or changing heights in later idle jobs.
let trackedBlockNodes = [];
let refrainOffsets = null;
let scrollHeightCache = 0;
const sourceLayoutUnits = new Map();

function paragraphUnits(block) {
  let units = sourceLayoutUnits.get(block.id);
  if (!units) {
    units = block.tibetan.split('\n').map(line =>
      line.replace(/[\p{M}\u200B-\u200D\uFEFF]/gu, '').length);
    sourceLayoutUnits.set(block.id, units);
  }
  return units;
}

function updateHeightEstimates() {
  const area = document.getElementById('contentArea');
  if (!area || !trackedBlockNodes.length) return;
  const cs = getComputedStyle(area);
  const width = Math.max(80, area.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
  const lineHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lh-tibetan')) || 1.85;
  let i = 0;
  for (const section of TABS_DATA[state.activeTab]) {
    for (const block of section.blocks) {
      const el = trackedBlockNodes[i++];
      if (!el || block.runs.some(run => run.image)) continue;
      const factor = block.heading === 1 ? 2 : block.heading === 2 ? 1.7 : block.heading === 3 ? 1.65 : block.heading ? 1.6 : 1.5;
      const font = state.fontSize * factor;
      const visibleRuns = block.runs.filter(run => (run.text || '').trim());
      const noteScale = !block.heading && visibleRuns.length && visibleRuns.every(run => run.blue) ? 11 / 12 : 1;
      const columns = Math.max(1, width / (font * noteScale * 0.52));
      const lines = paragraphUnits(block).reduce((n, units) => n + Math.max(1, Math.ceil(units / columns)), 0);
      const chrome = block.heading === 1 ? 17 : 0;
      el.style.setProperty('--blk-h', Math.ceil(lines * font * lineHeight + chrome) + 'px');
    }
  }
  refrainOffsets = null;
  scrollHeightCache = 0;
  queueIndexLocationUpdate(true);
}

function invalidateGeometry() {
  updateHeightEstimates();
  if (state.readingMode === 'pages') queuePageLayout();
}


/* Refrain arrival used to call getBoundingClientRect() on every panel on
   every animation frame, which forces layout in the middle of a scroll.
   The tops only move when the document is rebuilt or resized, so cache
   them once and compare against scrollY instead. */
function refrainGeometry() {
  if (refrainOffsets) return refrainOffsets;
  const groups = document.getElementsByClassName('refrain-group');
  const base = window.scrollY || window.pageYOffset || 0;
  const out = [];
  for (let i = 0; i < groups.length; i++) {
    out.push({
      id: groups[i].id,
      el: groups[i],
      top: groups[i].getBoundingClientRect().top + base
    });
  }
  refrainOffsets = out;
  return out;
}

function documentScrollHeight() {
  if (!scrollHeightCache) scrollHeightCache = document.documentElement.scrollHeight;
  return scrollHeightCache;
}

// ══════════════════════════════════════════════════════
// MANUAL-SCROLL DETECTION (pause auto/tilt while user touches)
// ══════════════════════════════════════════════════════

let userScrollPaused = false;
let userScrollResumeTimer = null;
const USER_SCROLL_RESUME_MS = 500;

function pauseForUserInput() {
  userScrollPaused = true;
  if (userScrollResumeTimer) {
    clearTimeout(userScrollResumeTimer);
    userScrollResumeTimer = null;
  }
  // Reset auto-scroll timing so it doesn't lurch on resume
  lastScrollTime = 0;
  scrollAccumulator = 0;
  // Re-baseline tilt so current device angle becomes neutral on resume
  tiltReferenceBeta = null;
}

function scheduleResumeAfterUserInput() {
  if (userScrollResumeTimer) clearTimeout(userScrollResumeTimer);
  userScrollResumeTimer = setTimeout(() => {
    userScrollPaused = false;
    userScrollResumeTimer = null;
    lastScrollTime = 0;
  }, USER_SCROLL_RESUME_MS);
}

window.addEventListener('touchmove', pauseForUserInput, { passive: true });
window.addEventListener('touchend', scheduleResumeAfterUserInput, { passive: true });
window.addEventListener('touchcancel', scheduleResumeAfterUserInput, { passive: true });
window.addEventListener('wheel', () => {
  pauseForUserInput();
  scheduleResumeAfterUserInput();
}, { passive: true });

// ══════════════════════════════════════════════════════
// AUTO-SCROLL (rAF + time-delta engine)
// ══════════════════════════════════════════════════════

let isAutoScrolling = false;
let autoScrollRaf = null;
let lastScrollTime = 0;
let scrollAccumulator = 0;

// ── Gentle pause on arriving at a repeated ("refrain") passage ──
let refrainHoldUntil = 0;     // timestamp to hold (no scroll) until
let refrainResumeStart = 0;   // timestamp the post-hold ease-in began
const refrainVisited = new Set();
const REFRAIN_HOLD_MS = 2600;   // length of the gentle pause
const REFRAIN_RESUME_MS = 900;  // ease back up to full speed afterwards

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// Pause once when a refrain panel reaches ~40% up the viewport.
function scanRefrainArrival(ts) {
  const groups = refrainGeometry();
  const vh = window.innerHeight;
  const triggerY = vh * 0.40;
  const scrollY = window.scrollY || window.pageYOffset || 0;
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i].el;
    const top = groups[i].top - scrollY;   // arithmetic, not a layout flush
    if (top > vh) { refrainVisited.delete(g.id); continue; } // re-arm below view
    if (refrainVisited.has(g.id)) continue;
    if (top <= triggerY && top > triggerY - 220) {
      refrainVisited.add(g.id);
      refrainHoldUntil = ts + REFRAIN_HOLD_MS;
      refrainResumeStart = refrainHoldUntil;
      scrollAccumulator = 0;
      g.classList.add('refrain-active');
      setTimeout(() => g.classList.remove('refrain-active'),
        REFRAIN_HOLD_MS + REFRAIN_RESUME_MS);
      break;
    }
  }
}

// Speed factor 0..1: 0 while holding, eased ramp on resume, else 1.
function refrainSpeedMultiplier(ts) {
  if (ts >= refrainHoldUntil) scanRefrainArrival(ts);
  if (ts < refrainHoldUntil) return 0;
  if (refrainResumeStart) {
    const t = (ts - refrainResumeStart) / REFRAIN_RESUME_MS;
    if (t >= 1) { refrainResumeStart = 0; return 1; }
    return easeOutCubic(t);
  }
  return 1;
}

// pixels per second at scrollSpeed = 1 .. 10
function autoScrollPxPerSec() {
  return 20 + state.scrollSpeed * 18; // ~38 .. 200 px/s
}

function toggleAutoScroll() {
  if (isTiltScrolling) stopTiltScroll();
  isAutoScrolling ? stopAutoScroll() : startAutoScroll();
}

function startAutoScroll() {
  if (state.readingMode === 'pages') return;
  isAutoScrolling = true;
  lastScrollTime = 0;
  scrollAccumulator = 0;
  refrainHoldUntil = 0;
  refrainResumeStart = 0;
  refrainVisited.clear();
  updatePlayIcon();
  autoScrollRaf = requestAnimationFrame(autoScrollLoop);
}

function stopAutoScroll() {
  isAutoScrolling = false;
  if (autoScrollRaf) cancelAnimationFrame(autoScrollRaf);
  autoScrollRaf = null;
  scrollAccumulator = 0;
  lastScrollTime = 0;
  updatePlayIcon();
}

function autoScrollLoop(ts) {
  if (!isAutoScrolling) return;

  if (userScrollPaused) {
    lastScrollTime = 0;
    scrollAccumulator = 0;
    autoScrollRaf = requestAnimationFrame(autoScrollLoop);
    return;
  }

  if (!lastScrollTime) lastScrollTime = ts;

  if (!lastScrollTime) {
    lastScrollTime = ts;
    autoScrollRaf = requestAnimationFrame(autoScrollLoop);
    return;
  }

  let dt = ts - lastScrollTime;
  lastScrollTime = ts;
  // Clamp dt to avoid giant jumps after tab was backgrounded
  if (dt > 100) dt = 100;

  scrollAccumulator += autoScrollPxPerSec() * refrainSpeedMultiplier(ts) * (dt / 1000);

  if (scrollAccumulator >= 1) {
    const px = Math.floor(scrollAccumulator);
    window.scrollBy({ top: px, behavior: 'auto' });
    scrollAccumulator -= px;
  }

  // Stop at bottom
  if ((window.innerHeight + window.scrollY) >= documentScrollHeight() - 2) {
    stopAutoScroll();
    return;
  }

  autoScrollRaf = requestAnimationFrame(autoScrollLoop);
}

function changeSpeed(delta) {
  state.scrollSpeed = Math.max(1, Math.min(10, state.scrollSpeed + delta));
  saveState();
}

function updatePlayIcon() {
  document.getElementById('iconPlay').style.display = isAutoScrolling ? 'none' : 'block';
  document.getElementById('iconPause').style.display = isAutoScrolling ? 'block' : 'none';
  document.getElementById('btnPlay').classList.toggle('active', isAutoScrolling);
}

// ══════════════════════════════════════════════════════
// TILT-TO-SCROLL (SMOOTH & BALANCED FIX)
// ══════════════════════════════════════════════════════

let isTiltScrolling = false;
let tiltPermissionGranted = false;
let tiltReferenceBeta = null;
let tiltRafId = null;

let targetTiltSpeed = 0;
let currentTiltSpeed = 0;
let tiltScrollAccumulator = 0;

async function toggleTiltScroll() {
  if (state.readingMode === 'pages') return;
  if (isAutoScrolling) stopAutoScroll();

  if (isTiltScrolling) {
    stopTiltScroll();
    return;
  }

  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm === 'granted') {
        tiltPermissionGranted = true;
      } else {
        alert('Motion permission denied. Enable it in Settings → Safari.');
        return;
      }
    } catch (e) {
      alert('Could not request motion permission.');
      return;
    }
  } else {
    tiltPermissionGranted = true;
  }

  startTiltScroll();
}

function startTiltScroll() {
  if (state.readingMode === 'pages') return;
  isTiltScrolling = true;
  tiltReferenceBeta = null;
  targetTiltSpeed = 0;
  currentTiltSpeed = 0;
  tiltScrollAccumulator = 0;
  document.documentElement.style.scrollBehavior = 'auto';
  window.addEventListener('deviceorientation', handleTilt);
  tiltLoop();
  document.getElementById('btnTilt').classList.add('active');
}

function stopTiltScroll() {
  isTiltScrolling = false;
  window.removeEventListener('deviceorientation', handleTilt);
  if (tiltRafId) cancelAnimationFrame(tiltRafId);
  tiltRafId = null;
  document.getElementById('btnTilt').classList.remove('active');
  document.documentElement.style.scrollBehavior = '';
}

function handleTilt(e) {
  if (e.beta === null) return;
  if (tiltReferenceBeta === null) tiltReferenceBeta = e.beta;

  let tilt = e.beta - tiltReferenceBeta;
  tilt = Math.max(-30, Math.min(30, tilt));

  const deadzone = 0.5;

  if (Math.abs(tilt) < deadzone) {
    targetTiltSpeed = 0;
  } else {
    const t = tilt - Math.sign(tilt) * deadzone;
    const raw = Math.sign(t) * Math.pow(Math.abs(t) / 1.2, 1.5) * (state.scrollSpeed * 0.12);
    const maxPxPerFrame = 3.5;
    targetTiltSpeed = -Math.max(-maxPxPerFrame, Math.min(maxPxPerFrame, raw));
  }
}

function tiltLoop() {
  if (!isTiltScrolling) return;

  currentTiltSpeed += (targetTiltSpeed - currentTiltSpeed) * 0.08;

  if (!userScrollPaused && Math.abs(currentTiltSpeed) > 0.05) {
    tiltScrollAccumulator += currentTiltSpeed;

    if (Math.abs(tiltScrollAccumulator) >= 1) {
      const pixelsToScroll = Math.trunc(tiltScrollAccumulator);
      tiltScrollAccumulator -= pixelsToScroll;
      window.scrollBy({ top: pixelsToScroll, behavior: 'auto' });
    }
  }

  tiltRafId = requestAnimationFrame(tiltLoop);
}

// Page each title independently. Native columns fragment text at line boxes,
// including paragraphs taller than the viewport; only the active title lays out.
const readingPage = {section:0, index:0, count:1, stride:0, anchor:null};
let pageLayoutFrame = 0;

function syncReadingMode() {
  const paged = state.readingMode === 'pages';
  document.documentElement.classList.toggle('paged-reading', paged);
  document.getElementById('btnPage').classList.toggle('active', paged);
  document.getElementById('btnPage').setAttribute('aria-pressed', String(paged));
  document.getElementById('pageNavigation').hidden = !paged;
  document.querySelectorAll('.reader-toolbar [onclick^="changeSpeed"], #btnPlay, #btnTilt').forEach(button => {
    button.disabled = paged;
  });
}

function toggleReadingMode() {
  const anchor = captureReadingAnchor();
  stopAutoScroll();
  stopTiltScroll();
  cancelPark();
  closeHelp(false);
  state.readingMode = state.readingMode === 'pages' ? 'scroll' : 'pages';
  syncReadingMode();
  if (state.readingMode === 'pages') {
    window.scrollTo({top:0, behavior:'instant'});
    layoutReadingPage(anchor);
  } else {
    trackedSectionNodes.forEach(section => {
      section.classList.remove('page-section');
      section.style.transform = '';
    });
    updateHeightEstimates();
    if (anchor) holdReadingPosition({...anchor, top:readerLine()});
  }
  saveState();
  updateTitleReturnButton();
}

function queuePageLayout() {
  if (state.readingMode !== 'pages' || pageLayoutFrame) return;
  pageLayoutFrame = requestAnimationFrame(() => {
    pageLayoutFrame = 0;
    if (state.readingMode === 'pages') layoutReadingPage(readingPage.anchor);
  });
}

function layoutReadingPage(anchor = null) {
  if (state.readingMode !== 'pages' || !trackedSectionNodes.length) return;
  const area = document.getElementById('contentArea');
  const target = anchor?.block.closest('.section-block');
  if (target) readingPage.section = trackedSectionNodes.indexOf(target);
  readingPage.section = Math.max(0, Math.min(trackedSectionNodes.length - 1, readingPage.section));
  const section = trackedSectionNodes[readingPage.section];
  trackedSectionNodes.forEach(node => node.classList.toggle('page-section', node === section));
  const barHeight = document.querySelector('.bottom-bar').getBoundingClientRect().height;
  document.documentElement.style.setProperty('--reader-bar-h', barHeight + 'px');
  const top = isFullScreen ? 12 : document.getElementById('stickyStack').getBoundingClientRect().bottom + 12;
  const height = Math.max(32, (window.visualViewport?.height || innerHeight) - top - barHeight - (isFullScreen ? 12 : 48));
  area.style.setProperty('--page-top', top + 'px');
  area.style.setProperty('--page-height', height + 'px');
  // A very short landscape viewport must still fit the largest heading's line.
  area.style.setProperty('--page-font-cap', Math.max(4, Math.floor((height - 8) / 3.7)) + 'px');
  const width = area.clientWidth - 32;
  area.style.setProperty('--page-width', width + 'px');
  readingPage.stride = width + 32;
  readingPage.count = Math.max(1, Math.ceil((section.scrollWidth + 31) / readingPage.stride));
  if (target) {
    const rect = anchor.range?.getClientRects()[0] || anchor.block.getClientRects()[0];
    if (rect) readingPage.index = Math.floor((rect.left - section.getBoundingClientRect().left + 1) / readingPage.stride);
  }
  readingPage.index = Math.max(0, Math.min(readingPage.count - 1, readingPage.index));
  showReadingPage();
}

function showReadingPage() {
  const section = trackedSectionNodes[readingPage.section];
  if (!section) return;
  section.style.transform = 'translateX(' + (-readingPage.index * readingPage.stride) + 'px)';
  const position = document.getElementById('pagePosition');
  position.textContent = (readingPage.index + 1) + ' / ' + readingPage.count;
  position.setAttribute('aria-label', 'Page ' + (readingPage.index + 1) + ' of ' + readingPage.count + ', title ' +
    (readingPage.section + 1) + ' of ' + trackedSectionNodes.length);
  document.getElementById('btnPreviousPage').disabled = readingPage.section === 0 && readingPage.index === 0;
  document.getElementById('btnNextPage').disabled = readingPage.section === trackedSectionNodes.length - 1 && readingPage.index === readingPage.count - 1;
  readingPage.anchor = capturePageAnchor();
  queueIndexLocationUpdate(true);
  updateTitleReturnButton();
  schedulePositionSave();
}

function capturePageAnchor() {
  const section = trackedSectionNodes[readingPage.section];
  if (!section) return null;
  const area = document.getElementById('contentArea').getBoundingClientRect();
  const left = area.left + 16, right = area.right - 16;
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.length) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    if (!Array.from(range.getClientRects()).some(rect => rect.width && rect.right > left && rect.left < right && rect.bottom > area.top && rect.top < area.bottom)) continue;
    // Find the first character on this column, retaining its DOM identity on reflow.
    let lo = 0, hi = node.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const rect = characterRange(node, mid).getBoundingClientRect();
      if (rect.right <= left) lo = mid + 1;
      else hi = mid;
    }
    const character = characterRange(node, lo);
    return {block:node.parentElement.closest('.block') || section, range:character, top:character.getBoundingClientRect().top};
  }
  const block = Array.from(section.querySelectorAll('.block')).find(block =>
    Array.from(block.getClientRects()).some(rect => rect.right > left && rect.left < right));
  return {block:block || section, range:null, top:area.top};
}

function turnReadingPage(direction) {
  if (state.readingMode !== 'pages') return;
  cancelPark();
  const next = readingPage.index + direction;
  if (next >= 0 && next < readingPage.count) {
    readingPage.index = next;
    showReadingPage();
  } else {
    const section = readingPage.section + direction;
    if (section < 0 || section >= trackedSectionNodes.length) return;
    readingPage.section = section;
    readingPage.index = direction < 0 ? Number.MAX_SAFE_INTEGER : 0;
    layoutReadingPage();
  }
}

function pageInputBlocked(target) {
  return target.closest('input,textarea,select,[contenteditable="true"],a,button,[role="dialog"],.index-panel,.search-panel') ||
    !document.getElementById('collectionMenu').hidden ||
    helpOpen || introOpen || welcomeOpen || document.getElementById('indexPanel').classList.contains('open') || !document.getElementById('searchPanel').hidden;
}

document.getElementById('contentArea').addEventListener('click', e => {
  if (state.readingMode !== 'pages' || pageInputBlocked(e.target) || !window.getSelection().isCollapsed) return;
  const bounds = e.currentTarget.getBoundingClientRect();
  const fraction = (e.clientX - bounds.left) / bounds.width;
  if (fraction < 0.25) turnReadingPage(-1);
  else if (fraction > 0.75) turnReadingPage(1);
});
document.addEventListener('keydown', e => {
  const button = e.target.closest('button');
  if (button && (e.key === ' ' || e.key === 'Enter')) return;
  if (state.readingMode !== 'pages' || pageInputBlocked(button?.parentElement || e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
  const direction = ['ArrowRight','ArrowDown','PageDown',' '].includes(e.key) ? (e.shiftKey && e.key === ' ' ? -1 : 1) :
    ['ArrowLeft','ArrowUp','PageUp'].includes(e.key) ? -1 : 0;
  if (direction) { e.preventDefault(); turnReadingPage(direction); }
  else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault();
    readingPage.index = e.key === 'Home' ? 0 : readingPage.count - 1;
    showReadingPage();
  }
});
let lastPageWheel = 0;
window.addEventListener('wheel', e => {
  if (state.readingMode !== 'pages' || pageInputBlocked(e.target) || e.ctrlKey) return;
  e.preventDefault();
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(delta) >= 10 && performance.now() - lastPageWheel > 300) {
    lastPageWheel = performance.now();
    turnReadingPage(delta > 0 ? 1 : -1);
  }
}, {passive:false});
window.visualViewport?.addEventListener('resize', queuePageLayout);

// ══════════════════════════════════════════════════════
// FULLSCREEN
// ══════════════════════════════════════════════════════

let isFullScreen = false;

function updateFSIcon() {
  document.getElementById('iconFSEnter').style.display = isFullScreen ? 'none' : 'block';
  document.getElementById('iconFSExit').style.display = isFullScreen ? 'block' : 'none';
  document.getElementById('btnFS').classList.toggle('active', isFullScreen);
  document.getElementById('btnFS').setAttribute('aria-pressed', String(isFullScreen));
  document.getElementById('btnFS').setAttribute('aria-label', isFullScreen ? 'Exit fullscreen' : t('barFullscreen'));
}

function toggleFullScreen() {
  const anchor = captureReadingAnchor();
  closeIndex();
  closeSearch();
  isFullScreen = !isFullScreen;
  document.body.classList.toggle('fullscreen', isFullScreen);
  updateFSIcon();

  if (state.readingMode === 'pages') layoutReadingPage(anchor);
  else if (anchor) holdReadingPosition({...anchor, top:readerLine()});

  if (isFullScreen && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else if (!isFullScreen && document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

// Sync if user exits fullscreen via Escape
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && isFullScreen) {
    const anchor = captureReadingAnchor();
    isFullScreen = false;
    document.body.classList.remove('fullscreen');
    updateFSIcon();
    if (state.readingMode === 'pages') layoutReadingPage(anchor);
    else if (anchor) holdReadingPosition({...anchor, top:readerLine()});
  }
});

// ══════════════════════════════════════════════════════
// SCROLL-TO-TOP BUTTON
// ══════════════════════════════════════════════════════

function updateTitleReturnButton() {
  const visible = state.readingMode === 'pages' ? readingPage.section > 0 || readingPage.index > 0 : window.scrollY > 300;
  document.getElementById('scrollTopBtn').classList.toggle('visible', visible);
}
window.addEventListener('scroll', updateTitleReturnButton, {passive:true});

function scrollToTop() {
  stopAutoScroll();
  stopTiltScroll();
  if (state.readingMode === 'pages') {
    if (readingPage.index === 0) readingPage.section = Math.max(0, readingPage.section - 1);
    readingPage.index = 0;
    layoutReadingPage();
    return;
  }
  const line = readerLine();
  let index = 0;
  for (let i = 0; i < trackedSectionNodes.length; i++) {
    if (trackedSectionNodes[i].getBoundingClientRect().top > line + 2) break;
    index = i;
  }
  // At a title's beginning, a second tap advances to the previous title.
  const section = trackedSectionNodes[index];
  if (section && Math.abs(section.getBoundingClientRect().top - line) <= 3) index = Math.max(0, index - 1);
  scrollToSectionEl(index, false);
}

// Search the source data, including the other volume, without laying it out.
const SEARCH_LIMIT = 50;
let searchTimer = 0;
let searchResults = [];
let searchRecords = null;
let searchQuery = '';

function normalizeSearch(text) {
  return text.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function closeSearch(restoreFocus = false) {
  clearTimeout(searchTimer);
  document.getElementById('searchPanel').hidden = true;
  document.getElementById('readerSearch').setAttribute('aria-expanded', 'false');
  if (restoreFocus) document.getElementById('readerSearch').focus({preventScroll:true});
}

function searchSnippet(text, query) {
  const compact = text.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  const at = compact.toLocaleLowerCase().indexOf(query);
  const start = Math.max(0, at - 45), end = Math.min(compact.length, at + query.length + 75);
  return (start ? '…' : '') + esc(compact.slice(start, at)) + '<mark>' + esc(compact.slice(at, at + query.length)) +
    '</mark>' + esc(compact.slice(at + query.length, end)) + (end < compact.length ? '…' : '');
}

function runSearch() {
  clearTimeout(searchTimer);
  const input = document.getElementById('readerSearch');
  const panel = document.getElementById('searchPanel');
  const list = document.getElementById('searchResults');
  const status = document.getElementById('searchStatus');
  searchQuery = normalizeSearch(input.value);
  document.getElementById('searchClear').hidden = !input.value;
  if (!searchQuery) { searchResults = []; closeSearch(); return; }
  closeIndex();
  closeHelp(false);
  if (!searchRecords) {
    searchRecords = ['E','WAM','PRAYERS'].flatMap(tab => TABS_DATA[tab].flatMap((section, sectionIdx) =>
      section.blocks.filter(block => block.tibetan.trim()).map(block => ({
        tab, sectionIdx, bid:block.id, title:indexTitle(section), text:block.tibetan,
        folded:normalizeSearch(block.tibetan), heading:!!block.heading
      }))));
  }
  const matches = searchRecords.filter(record => COLLECTIONS[state.collection].tabs.includes(record.tab) && record.folded.includes(searchQuery));
  // Titles first; retain volume and source order within each group.
  matches.sort((a, b) => Number(b.heading) - Number(a.heading));
  searchResults = matches.slice(0, SEARCH_LIMIT);
  status.textContent = matches.length ? matches.length + (matches.length === 1 ? ' passage' : ' passages') +
    (matches.length > SEARCH_LIMIT ? ' · First ' + SEARCH_LIMIT + ' shown' : '') : 'No matching text in this collection.';
  list.innerHTML = searchResults.map((record, i) =>
    '<button type="button" class="search-result" onclick="openSearchResult(' + i + ')">' +
    '<span class="search-result-volume">' + tabLabel(record.tab) + '</span>' +
    '<span class="search-result-title" lang="bo">' + esc(record.title) + '</span>' +
    '<span class="search-result-snippet" lang="bo">' + searchSnippet(record.text, searchQuery) + '</span></button>').join('');
  panel.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function findSearchRange(block, query) {
  const root = block.querySelector('.tib');
  if (!root) return null;
  // Map whitespace-normalized search offsets back to the unmodified source.
  const text = root.textContent;
  let folded = '', sourceOffsets = [], rawOffset = 0;
  for (const char of text) {
    if (!/[\u200B-\u200D\uFEFF]/.test(char)) {
      if (/\s/.test(char)) {
        if (folded && !folded.endsWith(' ')) { folded += ' '; sourceOffsets.push(rawOffset); }
      } else {
        const normalized = char.normalize('NFC').toLocaleLowerCase();
        folded += normalized;
        for (let i = 0; i < normalized.length; i++) sourceOffsets.push(rawOffset);
      }
    }
    rawOffset += char.length;
  }
  const at = folded.indexOf(query);
  if (at < 0) return null;
  let remaining = sourceOffsets[at];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (remaining < node.length) return characterRange(node, remaining);
    remaining -= node.length;
  }
  return null;
}

function openSearchResult(i) {
  const result = searchResults[i];
  if (!result) return;
  const query = searchQuery;
  document.getElementById('readerSearch').blur();
  closeSearch();
  jumpToSource(result.tab, result.bid, query);
}

const readerSearch = document.getElementById('readerSearch');
readerSearch.addEventListener('input', () => {
  clearTimeout(searchTimer);
  document.getElementById('searchClear').hidden = !readerSearch.value;
  if (!readerSearch.value.trim()) closeSearch();
  else searchTimer = setTimeout(runSearch, 180);
});
readerSearch.addEventListener('focus', () => { if (readerSearch.value.trim()) runSearch(); });
document.getElementById('readerSearchForm').addEventListener('submit', e => { e.preventDefault(); runSearch(); });
document.getElementById('searchClear').addEventListener('click', () => {
  readerSearch.value = '';
  runSearch();
  readerSearch.focus({preventScroll:true});
});
readerSearch.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') {
    if (document.getElementById('searchPanel').hidden) runSearch();
    const first = document.querySelector('.search-result');
    if (first) { e.preventDefault(); first.focus(); }
  }
});
document.getElementById('searchResults').addEventListener('keydown', e => {
  if (!['ArrowDown','ArrowUp'].includes(e.key)) return;
  const rows = Array.from(document.querySelectorAll('.search-result'));
  const at = rows.indexOf(document.activeElement);
  const next = at + (e.key === 'ArrowDown' ? 1 : -1);
  e.preventDefault();
  if (next < 0) readerSearch.focus({preventScroll:true});
  else rows[Math.min(next, rows.length - 1)]?.focus();
});
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('#readerSearchForm, #searchPanel')) closeSearch();
});

// Native text selection, Copy and the context menu remain available.
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && document.getElementById('contentArea').contains(selection.anchorNode)) {
    stopAutoScroll();
    stopTiltScroll();
  }
});


// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════

function measureStackHeight() {
  const stack = document.getElementById('stickyStack');
  if (!stack) return;
  const h = stack.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--stack-h', h + 'px');
}

function updateTabIndicator() {
  const indicator = document.getElementById('tabIndicator');
  if (!indicator) return;
  const active = document.querySelector('.tab-btn.active');
  if (!active) {
    indicator.style.setProperty('--w', '0px');
    return;
  }
  indicator.style.setProperty('--x', active.offsetLeft + 'px');
  indicator.style.setProperty('--w', active.offsetWidth + 'px');
}

window.addEventListener('resize', measureStackHeight);
window.addEventListener('resize', updateTabIndicator);
window.addEventListener('resize', () => {
  if (state.readingMode === 'pages') { queuePageLayout(); return; }
  const anchor = captureReadingAnchor();
  invalidateGeometry();
  if (anchor && !document.getElementById('searchPanel').contains(document.activeElement) && document.activeElement !== readerSearch) holdReadingPosition(anchor);
});
window.addEventListener('orientationchange', measureStackHeight);
window.addEventListener('orientationchange', updateTabIndicator);

// ══════════════════════════════════════════════════════
// KEYBOARD DISMISSAL
// ══════════════════════════════════════════════════════

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('searchPanel').hidden) { e.preventDefault(); closeSearch(true); return; }
  if (welcomeOpen) { e.preventDefault(); closeWelcome(); return; }
  if (introOpen) { e.preventDefault(); closeIntro(); return; }
  if (helpOpen) { e.preventDefault(); closeHelp(); return; }
  if (document.getElementById('indexPanel').classList.contains('open')) {
    e.preventDefault(); closeIndex(); document.querySelector('[data-tab="INDEX"]').focus(); return;
  }
  closeLangMenu();
});

// Help labels follow the reference layout and only describe visible controls.
const HELP_TARGETS = [
  { sel: '#introBtn',                              key: 'introduction' },
  { sel: '#btnTib',                                key: 'helpTib' },
  { sel: '#btnPho',                                key: 'helpPho' },
  { sel: '#btnEng',                                key: 'helpEng' },
  { sel: '#donateLink',                            key: 'donate' },
  { sel: '#helpBtn',                               key: 'helpTitle' },
  { sel: '#langSelectBtn',                         key: 'langMenu' },
  { sel: '.tab-btn[data-tab="E"]',              key: 'tabE' },
  { sel: '.tab-btn[data-tab="INDEX"]',             key: 'tabIndex' },
  { sel: '.tab-btn[data-tab="WAM"]',           key: 'tabWam' },
  { sel: '#scrollTopBtn',                          key: 'scrollTop' },
  { sel: '.bar-btn[onclick="changeSpeed(-1)"]',    key: 'barSlower' },
  { sel: '#btnPlay',                               key: 'barPlayPause' },
  { sel: '.bar-btn[onclick="changeSpeed(1)"]',     key: 'barFaster' },
  { sel: '#btnPage',                               key: 'barPages' },
  { sel: '#btnFS',                                 key: 'barFullscreen' },
  { sel: '#btnTilt',                               key: 'barTilt' },
  { sel: '#btnTheme',                              key: 'barTheme' },
  { sel: '.bar-btn[onclick="changeFontSize(-1)"]', key: 'barSmaller' },
  { sel: '.bar-btn[onclick="changeFontSize(1)"]',  key: 'barLarger' }
];

const HELP_PAD = 6;      /* keep a label this far off the viewport edge */
const HELP_GUTTER = 8;   /* clear space between two labels in one row */
const HELP_BAR_GAP = 6;  /* bar to the first row of labels */
const HELP_ROW_GAP = 4;  /* row to row */

let helpOpen = false;
let helpPrevFocus = null;
let helpResumeAuto = false;
let helpResumeTilt = false;
let helpScrollX = 0;
let helpScrollY = 0;

/* On screen for real, not merely present in the document. */
function helpOnScreen(el) {
  if (!el) return false;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  if (parseFloat(cs.opacity) < 0.05) return false;
  /* offsetParent is null inside a display:none subtree — and also for
     anything fixed, which is on screen all the same. */
  if (el.offsetParent === null && cs.position !== 'fixed') return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  return r.right > 0 && r.bottom > 0 &&
         r.left < window.innerWidth && r.top < window.innerHeight;
}

/* Greedy row packing: sorted by centre x, each label goes into the
   lowest row — the one nearest the bar — whose occupied spans it
   clears by the gutter. The result is a staircase, not a grid. */
function helpPackRows(items, vw) {
  items.sort((a, b) => a.cx - b.cx);
  const rows = [];
  items.forEach(item => {
    const left = Math.max(HELP_PAD, Math.min(item.cx - item.w / 2, vw - HELP_PAD - item.w));
    const from = left - HELP_GUTTER;
    const to = left + item.w + HELP_GUTTER;
    let r = 0;
    while (rows[r] && rows[r].some(span => from < span[1] && to > span[0])) r++;
    if (!rows[r]) rows[r] = [];
    rows[r].push([left, left + item.w]);
    item.left = left;
    item.row = r;
  });
  return rows.length;
}

function helpWire(layer, cx, from, to) {
  const el = document.createElement('div');
  el.className = 'help-wire';
  el.style.left = Math.round(cx) + 'px';
  el.style.top = Math.round(Math.min(from, to)) + 'px';
  el.style.height = Math.max(0, Math.round(Math.abs(to - from))) + 'px';
  layer.appendChild(el);
}

function helpPlaceHint(hint, vw, bandTop, bandBottom) {
  const r = hint.getBoundingClientRect();
  hint.style.left = Math.max(HELP_PAD, Math.round((vw - r.width) / 2)) + 'px';
  const room = bandBottom - bandTop;
  const y = room >= r.height
    ? bandTop + (room - r.height) / 2            /* centred in the quiet band */
    : bandBottom - r.height - HELP_ROW_GAP;      /* no band left: tuck it above */
  hint.style.top = Math.round(Math.max(HELP_PAD, y)) + 'px';
}

function layoutHelp() {
  const wires = document.getElementById('helpWires');
  const labels = document.getElementById('helpLabels');
  const hint = document.getElementById('helpHint');

  wires.textContent = '';
  labels.textContent = '';

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const stack = document.getElementById('stickyStack');
  const stackRect = stack.getBoundingClientRect();
  const stackLive = stackRect.height > 0;

  const chrome = [];
  const bottom = [];
  HELP_TARGETS.forEach(target => {
    const el = document.querySelector(target.sel);
    if (!helpOnScreen(el)) return;
    const r = el.getBoundingClientRect();
    const item = { cx: r.left + r.width / 2, top: r.top, bottom: r.bottom, text: t(target.key) };
    (stackLive && stack.contains(el) ? chrome : bottom).push(item);
  });

  const all = chrome.concat(bottom);
  hint.style.display = all.length ? '' : 'none';
  if (!all.length) return;

  /* Build every label before measuring any of them. The overlay is
     already shown by now, so these measure for real rather than zero. */
  all.forEach(item => {
    const el = document.createElement('span');
    el.className = 'help-label';
    el.textContent = item.text;
    el.style.left = '0px';
    el.style.top = '0px';
    labels.appendChild(el);
    item.el = el;
  });
  all.forEach(item => {
    const r = item.el.getBoundingClientRect();
    item.w = r.width;
    item.h = r.height;
  });

  /* The chrome is one slab: its labels hang below it, and each wire
     rises to its underside at the control's own centre x. Stopping at
     the slab is what keeps a header wire from being drawn across the
     tab bar underneath it. */
  let chromeBottom = stackLive ? stackRect.bottom : 0;
  if (chrome.length) {
    const rows = helpPackRows(chrome, vw);
    const h = Math.max.apply(null, chrome.map(item => item.h));
    chrome.forEach(item => {
      const top = stackRect.bottom + HELP_BAR_GAP + item.row * (h + HELP_ROW_GAP);
      item.el.style.left = item.left + 'px';
      item.el.style.top = top + 'px';
      helpWire(wires, item.cx, stackRect.bottom, top);
    });
    chromeBottom = stackRect.bottom + HELP_BAR_GAP + rows * h + (rows - 1) * HELP_ROW_GAP;
  }

  /* The bar and the back-to-top button beside it: labels stand above,
     rows building upward away from the bar. */
  let bottomTop = vh;
  if (bottom.length) {
    const edge = Math.min.apply(null, bottom.map(item => item.top));
    const rows = helpPackRows(bottom, vw);
    const h = Math.max.apply(null, bottom.map(item => item.h));
    bottom.forEach(item => {
      const top = edge - HELP_BAR_GAP - (item.row + 1) * h - item.row * HELP_ROW_GAP;
      item.el.style.left = item.left + 'px';
      item.el.style.top = top + 'px';
      helpWire(wires, item.cx, top + h, edge);
    });
    bottomTop = edge - HELP_BAR_GAP - rows * h - (rows - 1) * HELP_ROW_GAP;
  }

  helpPlaceHint(hint, vw, chromeBottom, bottomTop);
}

function openHelp() {
  if (helpOpen) return;
  helpOpen = true;

  /* Hold whatever would move the page underneath. Both engines drive
     their own indicator as they stop, so the ▶/❚❚ face keeps telling
     the truth about the engine rather than about the overlay. */
  helpResumeAuto = isAutoScrolling;
  helpResumeTilt = isTiltScrolling;
  if (isAutoScrolling) stopAutoScroll();
  if (isTiltScrolling) stopTiltScroll();

  helpScrollX = window.scrollX;
  helpScrollY = window.scrollY;
  helpPrevFocus = document.activeElement;

  document.getElementById('contentArea').classList.add('help-recede');
  document.getElementById('indexPanel').classList.add('help-recede');

  document.getElementById('helpOverlay').hidden = false;   /* shown before measuring */
  document.getElementById('helpBtn').setAttribute('aria-expanded', 'true');

  layoutHelp();

  document.getElementById('helpDismiss').focus({ preventScroll: true });

  if (window.scrollX !== helpScrollX || window.scrollY !== helpScrollY) {
    window.scrollTo(helpScrollX, helpScrollY);
  }
}

function closeHelp(restoreFocus) {
  if (!helpOpen) return;
  helpOpen = false;

  document.getElementById('helpOverlay').hidden = true;
  document.getElementById('helpWires').textContent = '';
  document.getElementById('helpLabels').textContent = '';

  document.getElementById('contentArea').classList.remove('help-recede');
  document.getElementById('indexPanel').classList.remove('help-recede');
  document.getElementById('helpBtn').setAttribute('aria-expanded', 'false');

  if (restoreFocus !== false) {
    const btn = document.getElementById('helpBtn');
    const back = helpOnScreen(btn) ? btn : helpPrevFocus;
    if (back && back.focus) back.focus({ preventScroll: true });
  }
  helpPrevFocus = null;

  if (window.scrollX !== helpScrollX || window.scrollY !== helpScrollY) {
    window.scrollTo(helpScrollX, helpScrollY);
  }

  /* Resume exactly what was held, and nothing else. */
  if (helpResumeAuto) startAutoScroll();
  if (helpResumeTilt) startTiltScroll();
  helpResumeAuto = false;
  helpResumeTilt = false;
}

function toggleHelp() {
  helpOpen ? closeHelp() : openHelp();
}

/* Which controls exist depends on the viewport, so re-pack rather than
   leave stale labels behind. */
window.addEventListener('resize', () => { if (helpOpen) layoutHelp(); });
window.addEventListener('orientationchange', () => {
  if (helpOpen) setTimeout(() => { if (helpOpen) layoutHelp(); }, 120);
});

/* Routes a tap cannot intercept. */
window.addEventListener('popstate', () => closeHelp(false));
window.addEventListener('hashchange', () => closeHelp(false));

// ══════════════════════════════════════════════════════
// INTRODUCTION — prose, sheet and welcome card
//
// The prose is data rather than markup, so a language can
// carry its own edition of it and the sheet is redrawn on a
// language switch. A language without one falls back to
// English, exactly the way the interface strings do.
//
// Block shapes: { h } heading, { p } paragraph, { ul } list,
// { dl } term / definition pairs. Inline **bold** and
// *italic* are honoured; everything else is escaped.
// ══════════════════════════════════════════════════════

const INTRO_L10N = {"en": {"about": [{"p": "The **Ewam Collection** is a digital edition of the E and Wam volumes of liturgies used at Gangteng Monastery and its branches in the Pema Lingpa lineage, under the patronage of Gangteng Tulku Rinpoche."}, {"p": "This edition presents the Tibetan texts in their original order, including the opening contents lists, introductory material, instructions, colophons and embedded lettering. The black and blue text distinction is preserved in both reading themes."}], "howTo": [{"p": "Select **E** or **Wam** to read a volume continuously. **Index** lists the individual texts from both volumes; expand a volume and select a Tibetan title to jump to that text."}, {"p": "Select the **page icon** between Faster (+) and Fullscreen to turn pages without animation. Use the arrows below the text, tap the left or right edge, or use the arrow keys, Page Up/Down, or Space (Shift+Space to go back). Pages keep whole lines and adapt to portrait, landscape, and text size changes. Select the page icon again to return to scrolling. Automatic and tilt scrolling are paused in page mode."}, {"p": "Use **Play/Pause** to start or stop automatic scrolling, and **Slower** or **Faster** to adjust its speed. Touching or manually scrolling the page temporarily pauses automatic movement."}, {"p": "**Tilt scroll** moves the text as you change the angle of your device. It may ask for motion access when first enabled. Automatic scrolling and tilt scrolling are used separately."}, {"p": "Use **Fullscreen** to hide the header and bottom options. Only the expand/contract icon remains; tap it to restore the controls. In page mode, edge taps and keyboard page turns still work in fullscreen. The text size controls adjust the lettering, and the sun/moon button switches themes. **Help** labels the visible controls."}, {"p": "The **up arrow** returns to the beginning of the current title. Tap it again to go to the preceding title; further taps continue backward through the volume."}, {"p": "This edition contains Tibetan text only. Translations and phonetic pronunciation will be added in future editions."}], "welcome": [{"p": "The **Ewam Collection** brings together the E and Wam volumes of Tibetan liturgies in the Pema Lingpa lineage, used at Gangteng Monastery and its branches."}, {"p": "Read either volume continuously, or open the **Index** to find an individual text."}]}};

function introBundle() {
  const base = INTRO_L10N[state.lang] || INTRO_L10N.en;
  const shared = [{p:'Choose **E Wam** or **Prayer Collection** using the arrow beside the title, or the collection buttons in the **Index**. Each collection remembers its own reading position. Both collections and the fonts download automatically for offline reading.'}, ...base.howTo.slice(1)];
  return state.collection === 'PRAYERS' ? {
    about:[{p:'The **Prayer Collection** presents the prayers from the Sangag Choling Prayer Book in their original order, with chapter headings and smaller instruction text preserved. The opening publication material and original contents pages are omitted from this edition.'}],
    howTo:shared,
    welcome:[{p:'Choose a collection to begin. Your place is saved separately in each collection.'}]
  } : {...base, howTo:[shared[0], base.howTo[0], ...shared.slice(1)], welcome:[{p:'Choose a collection to begin. Your place is saved separately in each collection.'}]};
}

/* Escape first, then the two inline marks — bold before italic, so a
   nested **phrase (*term*)** keeps both. */
function introInline(s) {
  return esc(s)
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
}

function introRender(blocks) {
  return blocks.map(b => {
    if (b.h)  return '<h3>' + introInline(b.h) + '</h3>';
    if (b.p)  return '<p>' + introInline(b.p) + '</p>';
    if (b.ul) return '<ul>' + b.ul.map(li => '<li>' + introInline(li) + '</li>').join('') + '</ul>';
    if (b.dl) return '<dl>' + b.dl.map(row =>
      '<dt>' + introInline(row[0]) + '</dt><dd>' + introInline(row[1]) + '</dd>').join('') + '</dl>';
    return '';
  }).join('');
}

/* The opening paragraph stands in for the whole section; CSS clamps it
   to its first few lines, so there is no separate summary to keep in
   step with the text it summarises. */
function introPreview(blocks) {
  const first = blocks.filter(b => b.p)[0];
  return first ? '<p>' + introInline(first.p) + '</p>' : '';
}

/* Draw the prose for the active language. Called from applyLanguage(),
   so the sheet never keeps the previous edition's text. */
function buildIntro() {
  const b = introBundle();
  const fill = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };
  fill('introAboutPreview', introPreview(b.about));
  fill('introAboutBody',    introRender(b.about));
  fill('introHowPreview',   introPreview(b.howTo));
  fill('introHowBody',      introRender(b.howTo));
  fill('welcomeBody',       introRender(b.welcome));

  /* The two expanders are named by their own state rather than by a
     data-i18n attribute, so they are relabelled here. */
  ['introAbout', 'introHow'].forEach(id => {
    const sec = document.getElementById(id);
    if (sec) setIntroSection(id, sec.classList.contains('open'));
  });
}

function setIntroSection(id, open) {
  const sec = document.getElementById(id);
  if (!sec) return;
  sec.classList.toggle('open', !!open);
  const head = sec.querySelector('.intro-acc-head');
  if (head) head.setAttribute('aria-expanded', String(!!open));
  const more = sec.querySelector('.intro-more');
  if (more) more.textContent = open ? t('introCollapse') : t('introExpand');
}

function toggleIntroSection(id) {
  const sec = document.getElementById(id);
  if (!sec) return;
  setIntroSection(id, !sec.classList.contains('open'));
}

// ── Opening and closing ───────────────────────────────────────────────

let introOpen = false;
let introPrevFocus = null;
let introHideTimer = null;

let welcomeOpen = false;
let welcomeShown = false;
let welcomePrevFocus = null;

let overlayLocked = false;
let overlayPrevOverflow = '';
let overlayResumeAuto = false;
let overlayResumeTilt = false;

/* One page-lock for both cards: whichever is up blurs and freezes what
   lies behind it, and the lock lifts only once neither is up — so
   handing over from the welcome card to the sheet does not flash the
   liturgy back into focus in between. */
function overlaySync() {
  const want = introOpen || welcomeOpen;
  if (want === overlayLocked) return;
  overlayLocked = want;

  if (want) {
    /* Hold whatever would move the page underneath, the way the help
       overlay does. Both engines drive their own indicator as they
       stop, so the ▶/❚❚ face keeps telling the truth. */
    overlayResumeAuto = isAutoScrolling;
    overlayResumeTilt = isTiltScrolling;
    if (isAutoScrolling) stopAutoScroll();
    if (isTiltScrolling) stopTiltScroll();

    overlayPrevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('overlay-blur');
  } else {
    document.body.style.overflow = overlayPrevOverflow;
    document.body.classList.remove('overlay-blur');

    if (overlayResumeAuto) startAutoScroll();
    if (overlayResumeTilt) startTiltScroll();
    overlayResumeAuto = false;
    overlayResumeTilt = false;
  }
}

/* `section` picks which part opens expanded: 'about', 'howTo', or
   nothing at all, in which case both show their preview. */
function openIntro(section) {
  const ov = document.getElementById('introOverlay');
  if (!ov) return;

  if (introHideTimer) { clearTimeout(introHideTimer); introHideTimer = null; }

  setIntroSection('introAbout', section === 'about');
  setIntroSection('introHow',   section === 'howTo');

  const scroller = document.getElementById('introScroll');
  if (scroller) scroller.scrollTop = 0;

  if (introOpen) return;
  introOpen = true;
  introPrevFocus = document.activeElement;
  overlaySync();

  ov.hidden = false;
  document.getElementById('introBtn').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => { if (introOpen) ov.classList.add('open'); });
  document.getElementById('introClose').focus({ preventScroll: true });
}

function closeIntro(restoreFocus) {
  if (!introOpen) return;
  introOpen = false;

  const ov = document.getElementById('introOverlay');
  ov.classList.remove('open');
  document.getElementById('introBtn').setAttribute('aria-expanded', 'false');

  /* Let the sheet finish leaving before it is taken out of the layout. */
  if (introHideTimer) clearTimeout(introHideTimer);
  introHideTimer = setTimeout(() => {
    introHideTimer = null;
    if (!introOpen) ov.hidden = true;
  }, 340);

  overlaySync();

  if (restoreFocus !== false) {
    /* Back to the button that opened it whenever that button is on
       screen — in fullscreen the header is gone, so fall back to
       whatever held focus before. */
    const btn = document.getElementById('introBtn');
    const back = (btn && btn.offsetParent !== null) ? btn : introPrevFocus;
    if (back && back.focus) back.focus({ preventScroll: true });
  }
  introPrevFocus = null;
}

/* DOM only: used both by the plain close and by the hand-over to the
   sheet, which must not let the page-lock lift in between. */
function hideWelcomeCard() {
  welcomeOpen = false;
  document.getElementById('welcomeBackdrop').classList.remove('open');
  document.getElementById('welcomeCard').classList.remove('open');
}

/* Shown once per visit, after the entrance animation has cleared. */
function openWelcome() {
  if (state.hasEntered || welcomeShown || welcomeOpen || introOpen) return;
  const card = document.getElementById('welcomeCard');
  if (!card) return;

  welcomeShown = true;
  welcomeOpen = true;
  welcomePrevFocus = document.activeElement;
  overlaySync();

  document.getElementById('welcomeBackdrop').classList.add('open');
  card.classList.add('open');
  card.scrollTop = 0;
  card.focus({ preventScroll: true });
}

function closeWelcome() {
  if (!welcomeOpen) return;
  state.hasEntered = true;
  saveState();
  hideWelcomeCard();
  overlaySync();

  const back = welcomePrevFocus;
  welcomePrevFocus = null;
  if (back && back.focus && document.contains(back)) back.focus({ preventScroll: true });
}

function welcomeGo(section) {
  if (!welcomeOpen) return;
  hideWelcomeCard();
  welcomePrevFocus = null;
  openIntro(section);
}

/* Routes a tap cannot intercept. */
window.addEventListener('popstate',   () => closeIntro(false));
window.addEventListener('hashchange', () => closeIntro(false));

(function init() {
  applyTheme();
  syncReadingMode();

  // Set active tab buttons
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === state.activeTab);
  });

  // Restore the saved reader size and script toggles, then draw the whole
  // app — chrome included — in the saved master language.
  applyFontSize();
  syncScriptToggles();
  applyLanguage();

  measureStackHeight();
  updateTabIndicator();
  // Re-measure after fonts/layout settle
  requestAnimationFrame(() => requestAnimationFrame(() => {
    measureStackHeight();
    updateTabIndicator();
  }));
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measureStackHeight();
      updateTabIndicator();
      // Font loading can move the current index boundary.
      queueIndexLocationUpdate(true);
      queuePageLayout();
    });
  } else {
    queueIndexLocationUpdate(true);
  }

  /* If the entrance finished before this script ran, the welcome card
     is ours to raise; otherwise the loader raises it on its way out. */
  const resume = () => {
    readerReady = true;
    restoreCollectionPosition();
    if (window.__ykLoaderDone) openWelcome();
  };
  document.fonts.ready.then(() => requestAnimationFrame(resume));
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(registration => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            const status = document.getElementById('offlineStatus');
            status.textContent = 'Update ready · reopen the app to use it';
          }
        });
      });
      return navigator.serviceWorker.ready;
    }).then(() => {
      const status = document.getElementById('offlineStatus');
      if (!status.textContent.startsWith('Update')) status.textContent = 'Both collections are available offline';
    }).catch(() => {
      document.getElementById('offlineStatus').textContent = 'Offline download incomplete · reopen when connected to retry';
    });
  }

})();
