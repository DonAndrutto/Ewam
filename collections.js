// Collection routing and durable positions use source character offsets,
// so saved places survive font-size changes, rotation and page-mode reflow.
const COLLECTIONS = {
  EWAM: {label:'E Wam', title:'Ewam Collection', tabs:['E','WAM']},
  PRAYERS: {label:'Prayer Collection', title:'Prayer Collection', tabs:['PRAYERS']}
};
let readerReady = false;
let restoringPosition = false;
let positionTimer = 0;

function collectionForTab(tab) { return tab === 'PRAYERS' ? 'PRAYERS' : 'EWAM'; }
function tabLabel(tab) { return tab === 'PRAYERS' ? 'Prayers' : tab === 'WAM' ? 'Wam' : 'E'; }

function positionSnapshot() {
  if (!readerReady || restoringPosition || parkFrame || !trackedBlockNodes.length) return null;
  const anchor = captureReadingAnchor();
  if (!anchor?.block.dataset.bid) return null;
  const root = anchor.block.querySelector('.tib');
  let offset = 0;
  if (root && anchor.range && root.contains(anchor.range.startContainer)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node === anchor.range.startContainer) { offset += anchor.range.startOffset; break; }
      offset += node.length;
    }
  }
  return {tab:state.activeTab, bid:anchor.block.dataset.bid, offset,
    relativeTop:anchor.top - readerLine(),
    start:state.readingMode === 'scroll' && scrollY < 1};
}

function rememberPosition() {
  clearTimeout(positionTimer);
  const position = positionSnapshot();
  if (!position) return;
  state.positions[collectionForTab(state.activeTab)] = position;
  saveState();
}

function schedulePositionSave() {
  if (!readerReady || restoringPosition) return;
  clearTimeout(positionTimer);
  positionTimer = setTimeout(rememberPosition, 300);
}

function restoreCollectionPosition() {
  const position = state.positions[state.collection];
  const block = position && document.getElementById(position.bid);
  if (!block || position.tab !== state.activeTab) {
    window.scrollTo({top:0, behavior:'instant'});
    restoringPosition = false;
    return;
  }
  if (position.start && state.readingMode === 'scroll') {
    window.scrollTo({top:0, behavior:'instant'});
    restoringPosition = false;
    return;
  }
  restoringPosition = true;
  const root = block.querySelector('.tib');
  let range = null;
  if (root) {
    let offset = Math.max(0, Number(position.offset) || 0), node;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while ((node = walker.nextNode())) {
      if (offset < node.length) { range = characterRange(node, offset); break; }
      offset -= node.length;
    }
  }
  const relativeTop = Number.isFinite(position.relativeTop) ? position.relativeTop : 0;
  holdReadingPosition({block, range, top:readerLine() + relativeTop}, () => {
    restoringPosition = false;
    schedulePositionSave();
  });
}

function syncCollectionChrome() {
  const collection = COLLECTIONS[state.collection];
  document.querySelector('.header-title').textContent = collection.title;
  document.title = collection.title;
  document.getElementById('collectionBtn').setAttribute('aria-label', 'Choose collection · ' + collection.label);
  document.querySelectorAll('[data-collection]').forEach(button => {
    const active = button.dataset.collection === state.collection;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('active', active);
  });
  document.querySelectorAll('.tab-btn[data-tab]').forEach(button => {
    button.hidden = button.dataset.tab !== 'INDEX' && !collection.tabs.includes(button.dataset.tab);
  });
  const search = document.getElementById('readerSearch');
  search.placeholder = state.collection === 'PRAYERS' ? 'Search prayers' : 'Search E and Wam';
  search.setAttribute('aria-label', search.placeholder);
  document.getElementById('tabBar').classList.toggle('prayer-navigation', state.collection === 'PRAYERS');
}

function closeCollectionMenu(restoreFocus = false) {
  document.getElementById('collectionMenu').hidden = true;
  document.getElementById('collectionBtn').setAttribute('aria-expanded', 'false');
  if (restoreFocus) document.getElementById('collectionBtn').focus({preventScroll:true});
}

function toggleCollectionMenu() {
  const menu = document.getElementById('collectionMenu');
  const opening = menu.hidden;
  closeSearch();
  closeIndex();
  closeHelp(false);
  menu.hidden = !opening;
  document.getElementById('collectionBtn').setAttribute('aria-expanded', String(opening));
  if (opening) menu.querySelector('[data-collection="' + state.collection + '"]').focus({preventScroll:true});
}

function switchCollection(collection, opts = {}) {
  if (!COLLECTIONS[collection]) return;
  closeCollectionMenu();
  if (collection === state.collection) {
    closeIndex();
    if (welcomeOpen) closeWelcome();
    return;
  }
  rememberPosition();
  const position = state.positions[collection];
  const tab = position && COLLECTIONS[collection].tabs.includes(position.tab) ? position.tab : COLLECTIONS[collection].tabs[0];
  switchTab(tab, {restore:true, skipRemember:true});
  if (welcomeOpen) closeWelcome();
  if (opts.showIndex) toggleIndex();
}

function chooseCollection(collection) {
  switchCollection(collection);
  state.hasEntered = true;
  saveState();
  closeWelcome();
}

window.addEventListener('scroll', schedulePositionSave, {passive:true});
window.addEventListener('pagehide', rememberPosition);
document.addEventListener('visibilitychange', () => { if (document.hidden) rememberPosition(); });
document.addEventListener('pointerdown', event => {
  restoringPosition = false;
  if (!event.target.closest('.header-title-group')) closeCollectionMenu();
});
document.addEventListener('keydown', event => {
  restoringPosition = false;
  const menu = document.getElementById('collectionMenu');
  if (menu.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); closeCollectionMenu(true); }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const buttons = [...menu.querySelectorAll('button')];
    const current = buttons.indexOf(document.activeElement);
    buttons[(current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
  }
});
window.addEventListener('wheel', () => { restoringPosition = false; }, {passive:true});
window.addEventListener('touchstart', () => { restoringPosition = false; }, {passive:true});
