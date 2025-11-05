/*
  Dexie.js storage wrapper for Feasibility app
  - Replaces LocalStorage/DataStore with IndexedDB via Dexie
  - Exposes async helpers: getString, setString, getJSON, setJSON, remove
  - Emits cross-tab and in-tab sync via BroadcastChannel and 'storage' event
  - Tables: kv (misc keys), surveys, simulated, users, forms, texts, schemas
  - IMPORTANT: All consumers should await these helpers
*/
(function initFeasibilityDB() {
  if (typeof window === 'undefined') return;
  if (window.FeasibilityDB && window.FeasibilityDB.__ready) return; // idempotent

  function uiAlert(message) {
    try {
      // Try to show a user-friendly message in the UI when possible
      var target = document.getElementById('data-status');
      if (target) {
        var box = document.createElement('div');
        box.className = 'error-message';
        box.style.cssText = 'background:#fff2f0;color:#a8071a;padding:10px;border-radius:6px;margin:8px 0;border:1px solid #ffccc7;';
        box.textContent = String(message || 'A storage error occurred.');
        target.appendChild(box);
        return;
      }
    } catch(_) {}
    try { alert(message); } catch(_) {}
  }

  function ensureDexie() {
    if (!window.Dexie) {
      throw new Error('Dexie is not loaded. Include dexie.min.js before feasibility-db.js');
    }
  }

  // Expose a stable placeholder immediately so consumers can await readiness safely
  var __resolveReady, __rejectReady;
  var __readyPromise = new Promise(function(resolve, reject) { __resolveReady = resolve; __rejectReady = reject; });
  if (!window.FeasibilityDB) {
    window.FeasibilityDB = {
      __ready: false,
      whenReady: function() { return __readyPromise; },
      // These stubs provide clear, user-friendly feedback if called before Dexie is loaded
      getString: async function(_key, fallback) { uiAlert('Storage is not initialized yet.'); return (fallback !== undefined ? fallback : null); },
      setString: async function() { uiAlert('Unable to save: storage is not initialized yet.'); },
      getJSON: async function(_key, fallback) { uiAlert('Storage is not initialized yet.'); return (fallback === undefined ? null : fallback); },
      setJSON: async function() { uiAlert('Unable to save: storage is not initialized yet.'); },
      remove: async function() { uiAlert('Unable to remove: storage is not initialized yet.'); }
    };
  } else if (typeof window.FeasibilityDB.whenReady !== 'function') {
    try { window.FeasibilityDB.whenReady = function() { return __readyPromise; }; } catch(_) {}
  }

  var bc;
  try {
    bc = ('BroadcastChannel' in window) ? new BroadcastChannel('FeasibilityDB') : null;
  } catch(_) { bc = null; }

  function dispatchStorageLikeEvent(key, newValue, oldValue) {
    var payload = (typeof newValue === 'string') ? newValue : (newValue == null ? null : JSON.stringify(newValue));
    try {
      var evt = new StorageEvent('storage', {
        key: key,
        oldValue: (typeof oldValue === 'string') ? oldValue : (oldValue == null ? null : JSON.stringify(oldValue)),
        newValue: payload,
        storageArea: null,
        url: location.href
      });
      window.dispatchEvent(evt);
    } catch(_) {
      try {
        var e = new CustomEvent('storage', { detail: { key: key, newValue: payload, oldValue: oldValue } });
        window.dispatchEvent(e);
      } catch(_) {}
    }
  }

  function keyToTable(key) {
    // Route well-known keys to specific tables; fallback to kv
    var surveys = ['feasibilityStudyAnswers'];
    var simulated = ['simulatedFeasibilityAnswers'];
    var forms = ['startFeasibilityForm'];
    var users = ['userInfo','userName','userEmail','userCountry','userCity','userPhone'];
    var texts = ['surveyData','preferredLanguage','comparisonAnswers','lastDataUpdate'];
    var schemas = ['feasibilityUnifiedSchema'];
    if (surveys.indexOf(key) >= 0) return { table: 'surveys', id: key };
    if (simulated.indexOf(key) >= 0) return { table: 'simulated', id: key };
    if (forms.indexOf(key) >= 0) return { table: 'forms', id: key };
    if (users.indexOf(key) >= 0) return { table: 'users', id: key };
    if (texts.indexOf(key) >= 0) return { table: 'texts', id: key };
    if (schemas.indexOf(key) >= 0) return { table: 'schemas', id: key };
    return { table: 'kv', id: key };
  }

  var db;
  try {
    ensureDexie();
    db = new Dexie('FeasibilityDB');
    db.version(1).stores({
      kv: '&key, updatedAt',
      surveys: '&key, updatedAt',
      simulated: '&key, updatedAt',
      users: '&key, updatedAt',
      forms: '&key, updatedAt',
      texts: '&key, updatedAt',
      schemas: '&key, updatedAt'
    });
  } catch (e) {
    try { uiAlert('Storage system failed to initialize. Please reload the page.'); } catch(_) {}
    try { __rejectReady(e); } catch(_) {}
    return; // Keep placeholder API; __ready stays false
  }

  async function getEntry(key) {
    var route = keyToTable(key);
    var row = await db.table(route.table).get({ key: route.id });
    return row ? row.value : undefined;
  }

  async function putEntry(key, value) {
    var route = keyToTable(key);
    var table = db.table(route.table);
    var oldRow = await table.get({ key: route.id });
    var oldValue = oldRow ? oldRow.value : undefined;
    await table.put({ key: route.id, value: value, updatedAt: Date.now() });
    try {
      dispatchStorageLikeEvent(key, value, oldValue);
      if (bc) bc.postMessage({ key: key, newValue: value, oldValue: oldValue });
    } catch(_) {}
    return true;
  }

  async function removeEntry(key) {
    var route = keyToTable(key);
    var table = db.table(route.table);
    var oldRow = await table.get({ key: route.id });
    await table.delete(route.id);
    try {
      dispatchStorageLikeEvent(key, null, oldRow ? oldRow.value : undefined);
      if (bc) bc.postMessage({ key: key, newValue: null, oldValue: oldRow ? oldRow.value : undefined });
    } catch(_) {}
    return true;
  }

  if (bc) {
    try {
      bc.onmessage = function(ev) {
        var d = ev && ev.data;
        if (!d || !d.key) return;
        dispatchStorageLikeEvent(d.key, d.newValue, d.oldValue);
      };
    } catch(_) {}
  }

  // Upgrade placeholder to the fully-initialized API and resolve readiness
  try {
    var readyApi = {
      __ready: true,
      db: db,
      whenReady: function() { return Promise.resolve(true); },
      getString: async function(key, fallback) {
        try {
          var v = await getEntry(key);
          return (v == null) ? (fallback !== undefined ? fallback : null) : String(v);
        } catch (e) {
          uiAlert('Unable to read saved data.');
          return (fallback !== undefined ? fallback : null);
        }
      },
      setString: async function(key, value) {
        try {
          await putEntry(key, (value == null ? '' : String(value)));
        } catch (e) {
          uiAlert('Unable to save your data.');
          throw e;
        }
      },
      getJSON: async function(key, fallback) {
        try {
          var v = await getEntry(key);
          if (v == null) return (fallback === undefined ? null : fallback);
          if (typeof v === 'object') return v;
          try { return JSON.parse(v); } catch(_) { return (fallback === undefined ? null : fallback); }
        } catch (e) {
          uiAlert('Unable to read saved data.');
          return (fallback === undefined ? null : fallback);
        }
      },
      setJSON: async function(key, value) {
        try {
          await putEntry(key, value);
        } catch (e) {
          uiAlert('Unable to save your data.');
          throw e;
        }
      },
      remove: async function(key) {
        try { await removeEntry(key); } catch (e) { uiAlert('Unable to remove saved data.'); }
      }
    };
    // Preserve early whenReady promise so consumers awaiting it do not hang
    try { readyApi.whenReady = function() { return __readyPromise.then(function(){ return true; }); }; } catch(_) {}
    window.FeasibilityDB = readyApi;
    try { __resolveReady(true); } catch(_) {}
  } catch(_) {}
})();
