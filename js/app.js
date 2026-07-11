(() => {
  'use strict';

  const ITEM_HEIGHT = 84;
  const SPIN_SECONDS = 4.5;
  const DISH_SPIN_SECONDS = SPIN_SECONDS + 0.4;
  const AVOID_REPEAT_DISH = true;
  const CONFETTI_ENABLED = true;
  const STORAGE_DATA_KEY = 'essensroulette_data_v1';
  const STORAGE_HISTORY_KEY = 'essensroulette_history_v1';
  const CONFETTI_COLORS = ['oklch(0.64 0.15 40)', 'oklch(0.56 0.09 130)', 'oklch(0.7 0.13 70)', 'oklch(0.6 0.12 25)', 'oklch(0.75 0.1 95)'];

  const $ = (id) => document.getElementById(id);

  const els = {
    startSubtitle: $('start-subtitle'),
    btnStartSpin: $('btn-start-spin'),

    screens: {
      start: $('screen-start'),
      catSpin: $('screen-cat-spin'),
      dishSpin: $('screen-dish-spin'),
      result: $('screen-result'),
    },

    catReelTrack: $('cat-reel-track'),
    catLanded: $('cat-landed'),

    dishSpinCatEmoji: $('dish-spin-cat-emoji'),
    dishSpinCatName: $('dish-spin-cat-name'),
    dishReelTrack: $('dish-reel-track'),

    confettiLayer: $('confetti-layer'),
    resultCatEmoji: $('result-cat-emoji'),
    resultDishName: $('result-dish-name'),
    resultCatName: $('result-cat-name'),
    btnSpinAgain: $('btn-spin-again'),
    btnChangeCategory: $('btn-change-category'),
    btnRestart: $('btn-restart'),

    btnHistory: $('btn-history'),
    btnHistoryClose: $('btn-history-close'),
    historyBackdrop: $('history-backdrop'),
    historyDrawer: $('history-drawer'),
    historyList: $('history-list'),
    historyEmpty: $('history-empty'),

    btnEdit: $('btn-edit'),
    btnEditClose: $('btn-edit-close'),
    editBackdrop: $('edit-backdrop'),
    editModal: $('edit-modal'),
    catList: $('cat-list'),
    newCatEmoji: $('new-cat-emoji'),
    newCatName: $('new-cat-name'),
    btnAddCategory: $('btn-add-category'),
    btnResetDefaults: $('btn-reset-defaults'),

    tplHistoryItem: $('tpl-history-item'),
    tplCatItem: $('tpl-cat-item'),
    tplDishRow: $('tpl-dish-row'),
  };

  const state = {
    categories: [],
    history: [],
    editExpandedCatId: null,
    selectedCategory: null,
    selectedDish: null,
    lastDishByCategory: {},
    timers: [],
  };

  function timer(fn, ms) {
    const id = setTimeout(fn, ms);
    state.timers.push(id);
    return id;
  }

  function clearTimers() {
    state.timers.forEach(clearTimeout);
    state.timers = [];
  }

  function loadData() {
    const hadSavedData = !!localStorage.getItem(STORAGE_DATA_KEY);
    let categories;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_DATA_KEY) || 'null');
      categories = (saved && saved.length) ? saved : essDefaultData();
    } catch (e) {
      categories = essDefaultData();
    }

    if (hadSavedData) {
      const migrated = essEnsureFavoriteCategories(categories);
      categories = migrated.categories;
      if (migrated.changed) persistData(categories);
    } else {
      persistData(categories);
    }

    let history = [];
    try { history = JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY) || '[]'); } catch (e) { history = []; }
    state.categories = categories;
    state.history = history;
  }

  function persistData(categories) {
    localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(categories));
  }

  function persistHistory(history) {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
  }

  function showScreen(name) {
    Object.entries(els.screens).forEach(([key, el]) => {
      el.classList.toggle('is-active', key === name);
    });
  }

  function totalDishCount() {
    return state.categories.reduce((sum, c) => sum + c.dishes.length, 0);
  }

  function updateStartSubtitle() {
    const dishCount = totalDishCount();
    const catCount = state.categories.length;
    if (dishCount === 0) {
      els.startSubtitle.textContent = 'Noch keine Gerichte vorhanden. Füge über ⚙️ ein paar Gerichte hinzu, um loszulegen.';
      els.btnStartSpin.disabled = true;
      els.btnStartSpin.style.opacity = '0.5';
      els.btnStartSpin.style.cursor = 'not-allowed';
    } else {
      els.startSubtitle.textContent = `Dreh am Rad und lass dich überraschen — ${dishCount} Gerichte in ${catCount} Kategorie${catCount === 1 ? '' : 'n'} warten auf dich.`;
      els.btnStartSpin.disabled = false;
      els.btnStartSpin.style.opacity = '';
      els.btnStartSpin.style.cursor = '';
    }
  }

  function buildReel(items, targetIndex) {
    const n = items.length;
    const minRows = 42;
    const repeats = Math.max(8, Math.ceil(minRows / Math.max(n, 1)) + 3);
    const landingRepeat = repeats - 2;
    const list = [];
    for (let r = 0; r < repeats; r++) {
      items.forEach((it) => list.push(it));
    }
    const targetListIndex = landingRepeat * n + targetIndex;
    const offset = -(targetListIndex - 1) * ITEM_HEIGHT;
    return { list, offset };
  }

  function renderCatReel(list) {
    els.catReelTrack.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.forEach((row) => {
      const div = document.createElement('div');
      div.className = 'ess-reel-row';
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'ess-reel-row-emoji';
      emojiSpan.textContent = row.emoji;
      const nameSpan = document.createElement('span');
      nameSpan.textContent = row.name;
      div.appendChild(emojiSpan);
      div.appendChild(nameSpan);
      frag.appendChild(div);
    });
    els.catReelTrack.appendChild(frag);
  }

  function renderDishReel(list) {
    els.dishReelTrack.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.forEach((row) => {
      const div = document.createElement('div');
      div.className = 'ess-reel-row ess-reel-row--dish';
      div.textContent = row.name;
      frag.appendChild(div);
    });
    els.dishReelTrack.appendChild(frag);
  }

  function startCategorySpin() {
    const categories = state.categories.filter((c) => c.dishes.length > 0);
    if (!categories.length) return;
    clearTimers();

    const targetIndex = Math.floor(Math.random() * categories.length);
    const target = categories[targetIndex];
    const reel = buildReel(categories.map((c) => ({ emoji: c.emoji, name: c.name })), targetIndex);

    showScreen('catSpin');
    renderCatReel(reel.list);
    els.catReelTrack.classList.remove('is-spinning');
    els.catReelTrack.style.transform = 'translateY(0px)';
    els.catLanded.hidden = true;
    state.selectedDish = null;

    timer(() => {
      els.catReelTrack.style.setProperty('--ess-spin-duration', SPIN_SECONDS + 's');
      els.catReelTrack.classList.add('is-spinning');
      els.catReelTrack.style.transform = `translateY(${reel.offset}px)`;
    }, 30);

    timer(() => {
      state.selectedCategory = target;
      els.catLanded.hidden = false;
      els.catLanded.textContent = `✨ ${target.name}!`;
      timer(() => startDishSpin(target), 900);
    }, 30 + SPIN_SECONDS * 1000 + 80);
  }

  function startDishSpin(category) {
    const cat = category || state.selectedCategory;
    if (!cat || !cat.dishes.length) return;

    const lastId = state.lastDishByCategory[cat.id];
    let pool = cat.dishes;
    if (AVOID_REPEAT_DISH && cat.dishes.length > 1 && lastId) {
      pool = cat.dishes.filter((d) => d.id !== lastId);
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const targetIndex = cat.dishes.findIndex((d) => d.id === chosen.id);
    const reel = buildReel(cat.dishes, targetIndex);

    showScreen('dishSpin');
    els.dishSpinCatEmoji.textContent = cat.emoji;
    els.dishSpinCatName.textContent = cat.name;
    renderDishReel(reel.list);
    els.dishReelTrack.classList.remove('is-spinning');
    els.dishReelTrack.style.transform = 'translateY(0px)';

    timer(() => {
      els.dishReelTrack.style.setProperty('--ess-spin-duration', DISH_SPIN_SECONDS + 's');
      els.dishReelTrack.classList.add('is-spinning');
      els.dishReelTrack.style.transform = `translateY(${reel.offset}px)`;
    }, 30);

    timer(() => showResult(cat, chosen), 30 + DISH_SPIN_SECONDS * 1000 + 80);
  }

  function renderConfetti() {
    els.confettiLayer.innerHTML = '';
    if (!CONFETTI_ENABLED) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement('div');
      piece.className = 'ess-confetti-piece';
      const left = Math.round(Math.random() * 96);
      const size = 6 + Math.round(Math.random() * 8);
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const radius = Math.random() > 0.5 ? '50%' : '3px';
      const duration = (1.6 + Math.random() * 1.2).toFixed(2);
      const delay = (Math.random() * 0.5).toFixed(2);
      piece.style.left = left + '%';
      piece.style.width = size + 'px';
      piece.style.height = size + 'px';
      piece.style.background = color;
      piece.style.borderRadius = radius;
      piece.style.animationDuration = duration + 's';
      piece.style.animationDelay = delay + 's';
      frag.appendChild(piece);
    }
    els.confettiLayer.appendChild(frag);
  }

  function formatRelative(ts) {
    const diffMs = Date.now() - ts;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return 'vor ' + min + ' Min';
    const h = Math.floor(min / 60);
    if (h < 24) return 'vor ' + h + ' Std';
    const d = Math.floor(h / 24);
    return 'vor ' + d + ' Tag' + (d > 1 ? 'en' : '');
  }

  function showResult(cat, dish) {
    state.selectedCategory = cat;
    state.selectedDish = dish;
    state.lastDishByCategory[cat.id] = dish.id;

    const historyEntry = { catEmoji: cat.emoji, catName: cat.name, dishName: dish.name, ts: Date.now() };
    state.history = [historyEntry, ...state.history].slice(0, 20);
    persistHistory(state.history);
    renderHistory();

    showScreen('result');
    renderConfetti();
    els.resultCatEmoji.textContent = cat.emoji;
    els.resultDishName.textContent = dish.name;
    els.resultCatName.textContent = cat.name;
  }

  function spinDishAgain() {
    startDishSpin(state.selectedCategory);
  }

  function changeCategory() {
    startCategorySpin();
  }

  function restart() {
    clearTimers();
    state.selectedCategory = null;
    state.selectedDish = null;
    els.catLanded.hidden = true;
    showScreen('start');
  }

  // ---------- History drawer ----------

  function renderHistory() {
    els.historyList.innerHTML = '';
    const hasHistory = state.history.length > 0;
    els.historyEmpty.style.display = hasHistory ? 'none' : '';
    if (!hasHistory) return;
    const frag = document.createDocumentFragment();
    state.history.forEach((h) => {
      const node = els.tplHistoryItem.content.cloneNode(true);
      node.querySelector('.ess-history-emoji').textContent = h.catEmoji;
      node.querySelector('.ess-history-dish').textContent = h.dishName;
      node.querySelector('.ess-history-meta').textContent = `${h.catName} · ${formatRelative(h.ts)}`;
      frag.appendChild(node);
    });
    els.historyList.appendChild(frag);
  }

  function toggleHistory(open) {
    const isOpen = open !== undefined ? open : !els.historyDrawer.classList.contains('is-open');
    els.historyDrawer.classList.toggle('is-open', isOpen);
    els.historyBackdrop.classList.toggle('is-open', isOpen);
    if (isOpen) renderHistory();
  }

  // ---------- Edit modal ----------

  function renderEditList() {
    els.catList.innerHTML = '';
    const frag = document.createDocumentFragment();

    state.categories.forEach((cat) => {
      const node = els.tplCatItem.content.cloneNode(true);
      const root = node.querySelector('.ess-cat-item');
      const body = node.querySelector('.ess-cat-item-body');
      const isExpanded = state.editExpandedCatId === cat.id;

      node.querySelector('.ess-cat-item-emoji').textContent = cat.emoji;
      node.querySelector('.ess-cat-item-name').textContent = cat.name;
      const count = cat.dishes.length;
      node.querySelector('.ess-cat-item-count').textContent = count + (count === 1 ? ' Gericht' : ' Gerichte');
      body.classList.toggle('is-open', isExpanded);

      node.querySelector('.ess-cat-item-header').addEventListener('click', () => {
        state.editExpandedCatId = state.editExpandedCatId === cat.id ? null : cat.id;
        renderEditList();
      });

      node.querySelector('.ess-cat-item-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeCategory(cat.id);
      });

      const dishList = node.querySelector('.ess-dish-list');
      cat.dishes.forEach((dish) => {
        const dishNode = els.tplDishRow.content.cloneNode(true);
        dishNode.querySelector('.ess-dish-row-name').textContent = dish.name;
        dishNode.querySelector('.ess-dish-row-remove').addEventListener('click', () => {
          removeDish(cat.id, dish.id);
        });
        dishList.appendChild(dishNode);
      });

      const newDishInput = node.querySelector('.ess-new-dish-input');
      const addDishHandler = () => {
        const text = newDishInput.value.trim();
        if (!text) return;
        addDish(cat.id, text);
        newDishInput.value = '';
      };
      node.querySelector('.ess-add-btn').addEventListener('click', addDishHandler);
      newDishInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addDishHandler(); }
      });

      frag.appendChild(node);
    });

    els.catList.appendChild(frag);
  }

  function toggleEdit(open) {
    const isOpen = open !== undefined ? open : !els.editModal.classList.contains('is-open');
    els.editModal.classList.toggle('is-open', isOpen);
    els.editBackdrop.classList.toggle('is-open', isOpen);
    if (isOpen) renderEditList();
  }

  function addCategory() {
    const name = els.newCatName.value.trim();
    if (!name) return;
    const emoji = els.newCatEmoji.value.trim() || '🍽️';
    const id = 'cat-custom-' + essSlugify(name) + '-' + Date.now();
    state.categories = [...state.categories, { id, emoji, name, dishes: [] }];
    persistData(state.categories);
    els.newCatName.value = '';
    els.newCatEmoji.value = '';
    renderEditList();
    updateStartSubtitle();
  }

  function removeCategory(catId) {
    state.categories = state.categories.filter((c) => c.id !== catId);
    persistData(state.categories);
    if (state.editExpandedCatId === catId) state.editExpandedCatId = null;
    renderEditList();
    updateStartSubtitle();
  }

  function addDish(catId, text) {
    state.categories = state.categories.map((c) => {
      if (c.id !== catId) return c;
      const newDish = { id: catId + '-d-' + Date.now(), name: text };
      return Object.assign({}, c, { dishes: [...c.dishes, newDish] });
    });
    persistData(state.categories);
    renderEditList();
    updateStartSubtitle();
  }

  function removeDish(catId, dishId) {
    state.categories = state.categories.map((c) => {
      if (c.id !== catId) return c;
      return Object.assign({}, c, { dishes: c.dishes.filter((d) => d.id !== dishId) });
    });
    persistData(state.categories);
    renderEditList();
    updateStartSubtitle();
  }

  function resetDefaults() {
    if (!window.confirm('Wirklich auf die Standardliste zurücksetzen? Eigene Änderungen gehen verloren.')) return;
    state.categories = essDefaultData();
    persistData(state.categories);
    state.editExpandedCatId = null;
    renderEditList();
    updateStartSubtitle();
  }

  // ---------- Wiring ----------

  function init() {
    loadData();
    updateStartSubtitle();
    renderHistory();

    els.btnStartSpin.addEventListener('click', startCategorySpin);
    els.btnSpinAgain.addEventListener('click', spinDishAgain);
    els.btnChangeCategory.addEventListener('click', changeCategory);
    els.btnRestart.addEventListener('click', restart);

    els.btnHistory.addEventListener('click', () => toggleHistory());
    els.btnHistoryClose.addEventListener('click', () => toggleHistory(false));
    els.historyBackdrop.addEventListener('click', () => toggleHistory(false));

    els.btnEdit.addEventListener('click', () => toggleEdit());
    els.btnEditClose.addEventListener('click', () => toggleEdit(false));
    els.editBackdrop.addEventListener('click', () => toggleEdit(false));

    els.btnAddCategory.addEventListener('click', addCategory);
    els.newCatName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
    });
    els.btnResetDefaults.addEventListener('click', resetDefaults);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (els.historyDrawer.classList.contains('is-open')) toggleHistory(false);
      if (els.editModal.classList.contains('is-open')) toggleEdit(false);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
