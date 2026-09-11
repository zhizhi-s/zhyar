const firebaseConfig = {
    apiKey: "AIzaSyDf8v2t0GzChcIc1wP6vmNdTZsI5Y-rCfU",
    authDomain: "zhi-zhii.firebaseapp.com",
    projectId: "zhi-zhii",
    storageBucket: "zhi-zhii.firebasestorage.app",
    messagingSenderId: "660343070228",
    appId: "1:660343070228:web:7d360db626016ad4541101",
    measurementId: "G-WLGWYNH6L4"
};

let app, db;
try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("✅ Firebase initialized");
    testFirebaseConnection();
} catch (error) {
    console.error("❌ Firebase error:", error);
}

let apps = [], games = [], iosApps = [];
let currentCategory = 'all';
let bookmarkItems = [];
let unsubscribeApps = null, unsubscribeGames = null, unsubscribeIos = null;

const allGrid = document.getElementById('all-grid');
const appsGrid = document.getElementById('apps-grid');
const gamesGrid = document.getElementById('games-grid');
const iosGrid = document.getElementById('ios-grid');
const bookmarkBadge = document.getElementById('bookmarkBadge');
const bookmarkListContainer = document.getElementById('bookmarkListContainer');

// ===== SMART SEARCH VARIABLES =====
const sidenavSearchInput = document.getElementById('sidenavSearch');
const searchDropdown = document.getElementById('searchDropdown');
let searchHighlightIndex = -1;
let currentSuggestions = [];

function loadBookmarks() {
    try {
        const stored = localStorage.getItem('zhizhi_bookmarks');
        bookmarkItems = stored ? JSON.parse(stored) : [];
        updateBookmarkBadge();
        renderBookmarkPage();
    } catch (e) { bookmarkItems = []; }
}

function saveBookmarks() {
    try {
        localStorage.setItem('zhizhi_bookmarks', JSON.stringify(bookmarkItems));
        updateBookmarkBadge();
        renderBookmarkPage();
    } catch (e) {}
}

function updateBookmarkBadge() {
    bookmarkBadge.textContent = bookmarkItems.length;
}

function toggleBookmark(item) {
    const index = bookmarkItems.findIndex(b => b.id === item.id);
    if (index > -1) {
        bookmarkItems.splice(index, 1);
        saveBookmarks();
        return false;
    } else {
        bookmarkItems.push({
            id: item.id, name: item.name, type: item.type,
            imgurl: item.imgurl || '', downloadurl: item.downloadurl || '#',
            description: item.description || ''
        });
        saveBookmarks();
        return true;
    }
}

function isBookmarked(id) {
    return bookmarkItems.some(b => b.id === id);
}

function renderBookmarkPage() {
    if (!bookmarkListContainer) return;
    if (bookmarkItems.length === 0) {
        bookmarkListContainer.innerHTML = `
            <div class="bookmark-empty">
                <i class="fas fa-inbox"></i>
                <p>هیچ بەرنامەیەک پاشەکەوت نەکراوە</p>
                <div class="sub-text">تۆ دەتوانیت بە کلیک لە دوگمەی <i class="fas fa-plus" style="color:var(--green-dark);"></i> لەسەر هەر کارتێک، بەرنامەکان پاشەکەوت بکەیت</div>
            </div>
        `;
        return;
    }
    let html = '<div style="display:flex;flex-direction:column;gap:12px;padding-bottom:20px;">';
    bookmarkItems.forEach(item => {
        const icon = item.type === 'app' ? 'fa-mobile-alt' : item.type === 'game' ? 'fa-gamepad' : 'fa-apple';
        const typeName = item.type === 'app' ? 'ئەپ' : item.type === 'game' ? 'یاری' : 'IOS';
        const typeIcon = item.type === 'app' ? 'fa-mobile-alt' : item.type === 'game' ? 'fa-gamepad' : 'fa-apple';
        html += `
            <div class="bookmark-item" data-id="${item.id}">
                <div class="bookmark-item-img">
                    ${item.imgurl ? `<img src="${item.imgurl}" alt="${item.name}">` : `<i class="fas ${icon}"></i>`}
                </div>
                <div class="bookmark-item-info">
                    <div class="bookmark-item-name">${item.name}</div>
                    <div class="bookmark-item-type">
                        <i class="fas ${typeIcon}"></i> ${typeName}
                    </div>
                </div>
                <div class="bookmark-item-actions">
                    <button class="bm-remove" data-id="${item.id}"><i class="fas fa-trash"></i> سڕینەوە</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    bookmarkListContainer.innerHTML = html;

    bookmarkListContainer.querySelectorAll('.bm-remove').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const index = bookmarkItems.findIndex(b => b.id === id);
            if (index > -1) {
                bookmarkItems.splice(index, 1);
                saveBookmarks();
                renderBookmarkPage();
                document.querySelectorAll('.card-bookmark').forEach(el => {
                    const cardId = el.dataset.id;
                    if (cardId === id) {
                        el.classList.remove('saved');
                        el.innerHTML = '<i class="fas fa-plus"></i>';
                    }
                });
            }
        });
    });
}

function testFirebaseConnection() {
    if (!db) return;
    db.collection("zhi-zhi").limit(1).get()
        .then(() => { console.log("✅ Firebase connected");
            loadAllData();
            setupRealtimeListeners(); })
        .catch(e => { console.error("❌ Firebase connection error:", e); });
}

function loadAllData() { if (db) { loadApps(); loadGames(); loadIos(); } }

function loadApps() {
    if (!db) return;
    db.collection("zhi-zhi").where("type", "==", "app").get()
        .then(snap => {
            apps = [];
            snap.forEach(doc => {
                const d = doc.data();
                apps.push({ id: doc.id, ...d, name: d.name || "بێ ناو", description: d.description || "",
                    descriptionLong: d.descriptionLong || "", info: d.info || "",
                    imgurl: d.imgurl || "", downloadurl: d.downloadurl || "#", downloads: d.downloads || 0,
                    featured: d.featured || false, version: d.version || "1.0.0",
                    platform: d.platform || "android",
                    createdAt: d.createdAt || new Date().toISOString() });
            });
            renderAll(); renderApps();
        })
        .catch(e => console.error("❌ loadApps error:", e));
}

function loadGames() {
    if (!db) return;
    db.collection("zhi-zhi").where("type", "==", "game").get()
        .then(snap => {
            games = [];
            snap.forEach(doc => {
                const d = doc.data();
                games.push({ id: doc.id, ...d, name: d.name || "بێ ناو", description: d.description || "",
                    descriptionLong: d.descriptionLong || "", info: d.info || "",
                    imgurl: d.imgurl || "", downloadurl: d.downloadurl || "#", downloads: d.downloads || 0,
                    featured: d.featured || false, version: d.version || "1.0.0",
                    platform: d.platform || "android",
                    createdAt: d.createdAt || new Date().toISOString() });
            });
            renderAll(); renderGames();
        })
        .catch(e => console.error("❌ loadGames error:", e));
}

function loadIos() {
    if (!db) return;
    db.collection("zhi-zhi").where("type", "==", "ios").get()
        .then(snap => {
            iosApps = [];
            snap.forEach(doc => {
                const d = doc.data();
                iosApps.push({ id: doc.id, ...d, name: d.name || "بێ ناو", description: d.description || "",
                    descriptionLong: d.descriptionLong || "", info: d.info || "",
                    imgurl: d.imgurl || "", downloadurl: d.downloadurl || "#", downloads: d.downloads || 0,
                    featured: d.featured || false, version: d.version || "1.0.0",
                    platform: d.platform || "ios",
                    createdAt: d.createdAt || new Date().toISOString() });
            });
            renderAll(); renderIos();
        })
        .catch(e => console.error("❌ loadIos error:", e));
}

function setupRealtimeListeners() {
    if (!db) return;
    if (unsubscribeApps) unsubscribeApps();
    if (unsubscribeGames) unsubscribeGames();
    if (unsubscribeIos) unsubscribeIos();
    unsubscribeApps = db.collection("zhi-zhi").where("type", "==", "app").onSnapshot(() => loadApps());
    unsubscribeGames = db.collection("zhi-zhi").where("type", "==", "game").onSnapshot(() => loadGames());
    unsubscribeIos = db.collection("zhi-zhi").where("type", "==", "ios").onSnapshot(() => loadIos());
}

function sortFeaturedFirst(arr) {
    return arr.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
}

function getAllItems() {
    let all = [...apps, ...games, ...iosApps];
    if (currentCategory === 'apps') all = apps;
    else if (currentCategory === 'games') all = games;
    else if (currentCategory === 'ios') all = iosApps;
    return sortFeaturedFirst(all);
}

function renderAll() {
    const items = getAllItems();
    allGrid.innerHTML = '';
    if (items.length === 0) {
        allGrid.innerHTML = '<div class="no-items"><i class="fas fa-inbox"></i> هیچ ئایتمێک بوونی نیە</div>';
        return;
    }
    items.forEach(item => renderCard(allGrid, item));
}

function renderApps() {
    appsGrid.innerHTML = '';
    if (apps.length === 0) { appsGrid.innerHTML = '<div class="no-items"><i class="fas fa-mobile-alt"></i> هیچ ئەپێک بوونی نیە</div>'; return; }
    sortFeaturedFirst(apps).forEach(item => renderCard(appsGrid, item));
}

function renderGames() {
    gamesGrid.innerHTML = '';
    if (games.length === 0) { gamesGrid.innerHTML = '<div class="no-items"><i class="fas fa-gamepad"></i> هیچ یارییەک بوونی نیە</div>'; return; }
    sortFeaturedFirst(games).forEach(item => renderCard(gamesGrid, item));
}

function renderIos() {
    iosGrid.innerHTML = '';
    if (iosApps.length === 0) { iosGrid.innerHTML = '<div class="no-items"><i class="fab fa-apple"></i> هیچ بەرنامەیەکی IOS بوونی نیە</div>'; return; }
    sortFeaturedFirst(iosApps).forEach(item => renderCard(iosGrid, item));
}

function renderCard(container, item) {
    const card = document.createElement('div');
    card.className = 'card';

    const badgeMap = { free: 'FREE', mod: 'MOD', pro: 'PRO' };
    const badgeKey = item.badge || 'free';
    const badgeLabel = badgeMap[badgeKey] || 'FREE';
    let badgeHTML = '';
    if (item.badge) badgeHTML = `<span class="card-badge ${badgeKey}">${badgeLabel}</span>`;

    let pinHTML = '';
    if (item.featured) {
        pinHTML = `<div class="pin-badge"><i class="fas fa-thumbtack"></i></div>`;
    }

    const icon = item.type === 'app' ? 'fa-mobile-alt' : item.type === 'game' ? 'fa-gamepad' : 'fa-apple';
    const version = item.version || '1.0.0';
    const platform = item.platform || (item.type === 'ios' ? 'ios' : 'android');
    const platformLabel = platform === 'ios' ? 'iOS' : 'Android';
    const saved = isBookmarked(item.id);

    card.innerHTML = `
        <div class="card-img">
            <div class="image-wrapper">
                <div class="image-inner">
                    ${item.imgurl ? `<img src="${item.imgurl}" alt="${item.name}" loading="lazy">` : `<i class="fas ${icon} placeholder-icon"></i>`}
                </div>
            </div>
            ${badgeHTML}
            ${pinHTML}
            <button class="card-bookmark ${saved ? 'saved' : ''}" data-id="${item.id}">
                <i class="fas ${saved ? 'fa-check' : 'fa-plus'}"></i>
            </button>
        </div>
        <div class="card-body">
            <div class="card-title">${item.name}</div>
            <div class="card-meta">
                <span class="card-category">${item.type === 'app' ? 'ئەپ' : item.type === 'game' ? 'یاری' : 'IOS'}</span>
                <span class="card-version">V${version} ${platformLabel}</span>
            </div>
            <div class="card-footer-simple">
                <span class="card-downloads"><i class="fas fa-download"></i> ${item.downloads || 0} داگرتن</span>
            </div>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (e.target.closest('.card-bookmark')) return;
        openModal(item);
    });

    card.querySelector('.card-bookmark').addEventListener('click', (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        const id = btn.dataset.id;
        const fullItem = getAllItems().find(i => i.id === id);
        if (!fullItem) return;
        const nowSaved = toggleBookmark(fullItem);
        if (nowSaved) {
            btn.classList.add('saved');
            btn.innerHTML = '<i class="fas fa-check"></i>';
        } else {
            btn.classList.remove('saved');
            btn.innerHTML = '<i class="fas fa-plus"></i>';
        }
        updateBookmarkBadge();
        renderBookmarkPage();
    });

    container.appendChild(card);
}

const modal = document.getElementById('itemModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDownloadsCount = document.getElementById('modalDownloadsCount');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');

function openModal(item) {
    if (item.imgurl) {
        modalImage.innerHTML = `<img src="${item.imgurl}" alt="${item.name}">`;
    } else {
        const icon = item.type === 'app' ? 'fa-mobile-alt' : item.type === 'game' ? 'fa-gamepad' : 'fa-apple';
        modalImage.innerHTML = `<i class="fas ${icon}"></i>`;
    }
    modalTitle.textContent = item.name;
    modalDownloadsCount.textContent = item.downloads || 0;
    modalDownloadBtn.href = '#';
    if (item.type === 'ios') modalDownloadBtn.classList.add('ios');
    else modalDownloadBtn.classList.remove('ios');
    modalDownloadBtn.dataset.id = item.id;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

let currentDownloadItem = null;
let downloadStep2Timer = null;

modalDownloadBtn.addEventListener('click', function(e) {
    e.preventDefault();
    const id = this.dataset.id;
    if (!id) return;
    const item = getAllItems().find(i => i.id === id);
    if (!item) return;
    closeModal();
    openDownloadPage1(item);
});

function openDownloadPage1(item) {
    currentDownloadItem = item;
    const imgWrap = document.getElementById('dl1-img');
    if (item.imgurl) {
        imgWrap.innerHTML = `<img src="${item.imgurl}" alt="${item.name}"><div class="dl-verified"><i class="fas fa-check"></i></div>`;
    } else {
        const icon = item.type === 'app' ? 'fa-mobile-alt' : item.type === 'game' ? 'fa-gamepad' : 'fa-apple';
        imgWrap.innerHTML = `<i class="fas ${icon}"></i><div class="dl-verified"><i class="fas fa-check"></i></div>`;
    }
    document.getElementById('dl1-title').textContent = item.name;

    const typeName = item.type === 'app' ? 'ئەپ' : item.type === 'game' ? 'یاری' : 'IOS';
    const platform = item.platform || (item.type === 'ios' ? 'ios' : 'android');
    const platformName = platform === 'ios' ? 'iOS' : 'Android';
    const platformIcon = platform === 'ios' ? 'fab fa-apple' : 'fab fa-android';
    const version = item.version || '1.0.0';

    document.getElementById('dl1-meta').innerHTML = `
        <div class="dl-stat">
            <i class="fas fa-tag"></i>
            <span class="lbl">جۆر</span>
            <span class="val">${typeName}</span>
        </div>
        <div class="dl-stat">
            <i class="${platformIcon}"></i>
            <span class="lbl">پلاتفۆرم</span>
            <span class="val">${platformName}</span>
        </div>
        <div class="dl-stat">
            <i class="fas fa-code-branch"></i>
            <span class="lbl">ڤێرژن</span>
            <span class="val">V${version}</span>
        </div>
    `;
    document.getElementById('dl1-info').textContent = item.info || 'زانیاری بەردەست نییە';
    document.getElementById('dl1-desc').textContent = item.descriptionLong || item.description || 'Description بەردەست نییە';

    const inlineAction = document.getElementById('dl1-inline-action');
    const btn2 = document.getElementById('dl1-btn2');
    const hint = document.getElementById('dl1-hint');
    const step2 = document.getElementById('dl1-step2');

    inlineAction.classList.add('show');
    btn2.classList.remove('show');
    if (hint) hint.style.display = 'flex';
    if (step2) step2.classList.remove('active');

    showPage('download');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('dl1-btn').addEventListener('click', function() {
    const inlineAction = document.getElementById('dl1-inline-action');
    const btn2 = document.getElementById('dl1-btn2');
    const hint = document.getElementById('dl1-hint');
    const step2 = document.getElementById('dl1-step2');

    inlineAction.classList.remove('show');
    btn2.classList.add('show');
    if (hint) hint.style.display = 'none';
    if (step2) step2.classList.add('active');

    setTimeout(() => {
        btn2.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
});

document.getElementById('dl1-btn2').addEventListener('click', function() {
    if (!currentDownloadItem) return;
    openDownloadPage2(currentDownloadItem);
});

function openDownloadPage2(item) {
    currentDownloadItem = item;
    const imgWrap = document.getElementById('dl2-img');
    if (item.imgurl) {
        imgWrap.innerHTML = `<img src="${item.imgurl}" alt="${item.name}"><div class="dl-verified"><i class="fas fa-check"></i></div>`;
    } else {
        const icon = item.type === 'app' ? 'fa-mobile-alt' : item.type === 'game' ? 'fa-gamepad' : 'fa-apple';
        imgWrap.innerHTML = `<i class="fas ${icon}"></i><div class="dl-verified"><i class="fas fa-check"></i></div>`;
    }
    document.getElementById('dl2-title').textContent = item.name;

    const typeName = item.type === 'app' ? 'ئەپ' : item.type === 'game' ? 'یاری' : 'IOS';
    const platform = item.platform || (item.type === 'ios' ? 'ios' : 'android');
    const platformName = platform === 'ios' ? 'iOS' : 'Android';
    const platformIcon = platform === 'ios' ? 'fab fa-apple' : 'fab fa-android';
    const version = item.version || '1.0.0';

    document.getElementById('dl2-meta').innerHTML = `
        <div class="dl-stat">
            <i class="fas fa-tag"></i>
            <span class="lbl">جۆر</span>
            <span class="val">${typeName}</span>
        </div>
        <div class="dl-stat">
            <i class="${platformIcon}"></i>
            <span class="lbl">پلاتفۆرم</span>
            <span class="val">${platformName}</span>
        </div>
        <div class="dl-stat">
            <i class="fas fa-code-branch"></i>
            <span class="lbl">ڤێرژن</span>
            <span class="val">V${version}</span>
        </div>
    `;
    document.getElementById('dl2-info').textContent = item.info || 'زانیاری بەردەست نییە';
    document.getElementById('dl2-desc').textContent = item.descriptionLong || item.description || 'Description بەردەست نییە';

    const loadingBox = document.getElementById('dl2-loading-box');
    const countdownEl = document.getElementById('dl2-countdown');
    const circle = document.getElementById('dl2-progress-circle');
    const dlBtn = document.getElementById('dl2-btn');
    const readyInd = document.getElementById('dl2-ready-indicator');
    const step1 = document.getElementById('dl2-loadstep-1');
    const step2 = document.getElementById('dl2-loadstep-2');
    const step3 = document.getElementById('dl2-loadstep-3');

    loadingBox.classList.remove('hidden');
    dlBtn.classList.add('hidden');
    dlBtn.disabled = true;
    readyInd.classList.add('hidden');
    countdownEl.textContent = '10';
    circle.style.strokeDashoffset = 251.2;

    [step1, step2, step3].forEach(s => { s.classList.remove('active', 'done'); });
    step1.classList.add('active');

    showPage('download2');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (downloadStep2Timer) {
        clearInterval(downloadStep2Timer);
        downloadStep2Timer = null;
    }

    let remaining = 10;

    setTimeout(() => {
        circle.style.strokeDashoffset = '0';
    }, 50);

    downloadStep2Timer = setInterval(() => {
        remaining--;
        countdownEl.textContent = remaining;
        if (remaining === 7) {
            step1.classList.remove('active'); step1.classList.add('done');
            step2.classList.add('active');
        }
        if (remaining === 3) {
            step2.classList.remove('active'); step2.classList.add('done');
            step3.classList.add('active');
        }
        if (remaining <= 0) {
            clearInterval(downloadStep2Timer);
            downloadStep2Timer = null;
            step3.classList.remove('active'); step3.classList.add('done');
            loadingBox.classList.add('hidden');
            dlBtn.classList.remove('hidden');
            dlBtn.disabled = false;
            readyInd.classList.remove('hidden');
            setTimeout(() => {
                dlBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        }
    }, 1000);
}

document.getElementById('dl2-btn').addEventListener('click', function() {
    if (!currentDownloadItem) return;
    const url = currentDownloadItem.downloadurl;
    if (url && url !== '#') {
        if (db && currentDownloadItem.id) {
            db.collection("zhi-zhi").doc(currentDownloadItem.id).update({
                downloads: (currentDownloadItem.downloads || 0) + 1
            }).catch(() => {});
        }
        window.open(url, '_blank');
    }
});

document.getElementById('bookmarkBtn').addEventListener('click', () => {
    showPage('bookmarks');
});

document.getElementById('bookmarkBackBtn').addEventListener('click', () => {
    showPage('home');
});

function openSidenav() {
    document.getElementById('sidenav').classList.add('open');
    document.getElementById('sidenavOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeSidenav() {
    document.getElementById('sidenav').classList.remove('open');
    document.getElementById('sidenavOverlay').classList.remove('active');
    document.body.style.overflow = '';
    hideSearchDropdown();
    if (sidenavSearchInput) {
        sidenavSearchInput.value = '';
    }
}
document.getElementById('hamburgerBtn').addEventListener('click', openSidenav);
document.getElementById('sidenavClose').addEventListener('click', closeSidenav);
document.getElementById('sidenavOverlay').addEventListener('click', closeSidenav);

function showPage(pageId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidenav-link').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`${pageId}-page`);
    if (el) el.classList.add('active');
    const link = document.querySelector(`.sidenav-link[data-page="${pageId}"]`);
    if (link) link.classList.add('active');
    closeSidenav();

    if (pageId === 'bookmarks') renderBookmarkPage();
}

document.querySelectorAll('.sidenav-link[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        showPage(page);
    });
});

document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.category;
        renderAll();
    });
});

document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = document.getElementById('theme-toggle').querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
        localStorage.setItem('zhizhi_theme', 'dark');
    } else {
        icon.className = 'fas fa-moon';
        localStorage.setItem('zhizhi_theme', 'light');
    }
});

if (localStorage.getItem('zhizhi_theme') === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-toggle').querySelector('i').className = 'fas fa-sun';
}

// ===== SMART SEARCH FUNCTIONS =====
function getSearchableItems() {
    return [...apps, ...games, ...iosApps];
}

function highlightMatch(text, query) {
    if (!query) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function showSearchDropdown(query) {
    const items = getSearchableItems();
    const q = query.toLowerCase().trim();

    if (!q) {
        hideSearchDropdown();
        return;
    }

    const filtered = items.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        return nameMatch || descMatch;
    }).slice(0, 8);

    currentSuggestions = filtered;
    searchHighlightIndex = -1;

    if (filtered.length === 0) {
        searchDropdown.innerHTML = `
            <div class="search-dropdown-empty">
                <i class="fas fa-search"></i>
                هیچ ئەنجامێک نەدۆزرایەوە
            </div>
        `;
        searchDropdown.classList.add('show');
        return;
    }

    let html = '';
    filtered.forEach((item, index) => {
        const icon = item.type === 'app' ? 'fa-mobile-alt' : item.type === 'game' ? 'fa-gamepad' : 'fa-apple';
        const typeName = item.type === 'app' ? 'ئەپ' : item.type === 'game' ? 'یاری' : 'IOS';
        html += `
            <div class="search-dropdown-item" data-index="${index}" data-id="${item.id}">
                <div class="search-dropdown-item-img">
                    ${item.imgurl ? `<img src="${item.imgurl}" alt="${item.name}">` : `<i class="fas ${icon}"></i>`}
                </div>
                <div class="search-dropdown-item-info">
                    <div class="search-dropdown-item-name">${highlightMatch(item.name, q)}</div>
                    <div class="search-dropdown-item-meta">
                        <span class="type-tag">${typeName}</span>
                        <span>V${item.version || '1.0.0'}</span>
                    </div>
                </div>
            </div>
        `;
    });
    searchDropdown.innerHTML = html;
    searchDropdown.classList.add('show');

    searchDropdown.querySelectorAll('.search-dropdown-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.id;
            const item = getSearchableItems().find(i => i.id === id);
            if (item) {
                hideSearchDropdown();
                sidenavSearchInput.value = '';
                openModal(item);
            }
        });
    });
}

function hideSearchDropdown() {
    searchDropdown.classList.remove('show');
    searchHighlightIndex = -1;
}

function updateHighlight() {
    const items = searchDropdown.querySelectorAll('.search-dropdown-item');
    items.forEach((el, i) => {
        if (i === searchHighlightIndex) {
            el.classList.add('highlighted');
            el.scrollIntoView({ block: 'nearest' });
        } else {
            el.classList.remove('highlighted');
        }
    });
}

sidenavSearchInput.addEventListener('input', function() {
    showSearchDropdown(this.value);
});

sidenavSearchInput.addEventListener('focus', function() {
    if (this.value.trim()) {
        showSearchDropdown(this.value);
    }
});

sidenavSearchInput.addEventListener('keydown', function(e) {
    const items = searchDropdown.querySelectorAll('.search-dropdown-item');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!searchDropdown.classList.contains('show')) {
            showSearchDropdown(this.value);
            return;
        }
        if (items.length === 0) return;
        searchHighlightIndex = (searchHighlightIndex + 1) % items.length;
        updateHighlight();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length === 0) return;
        searchHighlightIndex = (searchHighlightIndex - 1 + items.length) % items.length;
        updateHighlight();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchHighlightIndex >= 0 && items[searchHighlightIndex]) {
            items[searchHighlightIndex].click();
        } else if (this.value.trim()) {
            const q = this.value.toLowerCase().trim();
            const filtered = getSearchableItems().filter(item =>
                item.name.toLowerCase().includes(q) ||
                (item.description || '').toLowerCase().includes(q)
            );
            if (filtered.length > 0) {
                hideSearchDropdown();
                sidenavSearchInput.value = '';
                openModal(filtered[0]);
            }
        }
    } else if (e.key === 'Escape') {
        hideSearchDropdown();
        this.value = '';
        this.blur();
    }
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.sidenav-search')) {
        hideSearchDropdown();
        if (sidenavSearchInput && sidenavSearchInput.value.trim()) {
            sidenavSearchInput.value = '';
        }
    }
});

loadBookmarks();
showPage('home');
