/* Shared guest auth: invite code or name lookup, unlock gating, per-guest tabs.
   Mirrors the flow from the reference site: no tabs until unlocked.
   Stores invite in localStorage so families stay signed in on their device. */

(function () {
  const FALLBACK_DB = [
    { family_code: 'FAM01', family_name: 'Khanna Family', members: [{ first_name: 'Rajat', last_name: 'Khanna', email: 'rajat@example.com', tags: ['india-guest', 'us-guest', 'groom-side'], max_plus_ones: 1 }] },
    { family_code: 'FAM02', family_name: 'Jain Family', members: [{ first_name: 'Disha', last_name: 'Jain', email: 'disha@example.com', tags: ['india-guest', 'us-guest', 'bride-side'], max_plus_ones: 2 }] }
  ];


  // --- Storage-safe access (optimized) ---
  // In private mode / some in-app browsers, localStorage/sessionStorage
  // throws on access. Previously signInFamily() used them directly, so a
  // throw there made "Continue" silently do nothing. These helpers never
  // throw: they fall back to an in-memory map for the current page.
  const _memStore = {};
  function _safeGet(store, key) {
    try {
      const v = (store === 'local' ? localStorage : sessionStorage).getItem(key);
      if (v !== null) return v;
    } catch (e) {}
    const mk = store + ':' + key;
    return Object.prototype.hasOwnProperty.call(_memStore, mk) ? _memStore[mk] : null;
  }
  function _safeSet(store, key, value) {
    try { (store === 'local' ? localStorage : sessionStorage).setItem(key, value); return true; }
    catch (e) { _memStore[store + ':' + key] = value; return false; }
  }
  function _safeRemove(store, key) {
    try { (store === 'local' ? localStorage : sessionStorage).removeItem(key); } catch (e) {}
    delete _memStore[store + ':' + key];
  }
  function storageAvailable() {
    // Must test the real storages directly: _safeSet() never throws (it
    // falls back to memory), so testing through it would always pass.
    try {
      localStorage.setItem('__wedding_storage_test__', '1'); localStorage.removeItem('__wedding_storage_test__');
      sessionStorage.setItem('__wedding_storage_test__', '1'); sessionStorage.removeItem('__wedding_storage_test__');
      return true;
    } catch (e) { return false; }
  }

  // --- Single-family cache (optimized) ---
  // A successful invite-code lookup used to be discarded, so the next tab
  // could only restore from the full guest list (which may never have
  // downloaded). Cache just that family, keyed by code, so code logins
  // restore instantly without overwriting the full list.
  const _familyCacheKey = 'wedding_family_cache_v1';
  function getCachedFamily(code) {
    const q = normalize(code).toUpperCase();
    if (!q) return null;
    try {
      const raw = _safeGet('local', _familyCacheKey);
      const map = raw ? JSON.parse(raw) : {};
      return map[q] || null;
    } catch (e) { return null; }
  }
  function cacheFamily(fam) {
    if (!fam || !fam.family_code) return;
    try {
      const raw = _safeGet('local', _familyCacheKey);
      const map = raw ? JSON.parse(raw) : {};
      map[fam.family_code.toUpperCase()] = fam;
      const keys = Object.keys(map);
      if (keys.length > 10) keys.slice(0, keys.length - 10).forEach(k => delete map[k]);
      _safeSet('local', _familyCacheKey, JSON.stringify(map));
    } catch (e) {}
  }

  function getGuestDatabase() {
    if (typeof _memDb !== 'undefined' && _memDb) return _memDb;
    try {
      const stored = _safeGet('local', 'wedding_guest_database');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return FALLBACK_DB;
  }

  function normalize(s) {
    return (s || '').trim().toLowerCase();
  }

  function findFamilyByCode(code) {
    const q = normalize(code).toUpperCase();
    if (!q) return null;
    const db = getGuestDatabase();
    return db.find(f => (f.family_code || '').toUpperCase() === q) || getCachedFamily(q);
  }

  function findFamilyByName(first, last) {
    const fn = normalize(first), ln = normalize(last);
    if (!fn || !ln) return null;
    const db = getGuestDatabase();
    const matches = [];
    db.forEach(fam => {
      (fam.members || []).forEach(m => {
        if (normalize(m.first_name) === fn && normalize(m.last_name) === ln) {
          matches.push(fam);
        }
      });
    });
    if (matches.length === 1) return matches[0];
    return matches.length > 1 ? { ambiguous: true, families: matches } : null;
  }

  function signInFamily(family, member) {
    const tags = [...new Set((family.members || []).flatMap(m => m.tags || []))];
    _safeSet('local', 'inviteCode', family.family_code.toUpperCase());
    // Persistent unlock: previously this lived only in sessionStorage, so
    // a new tab / browser restart / in-app-browser switch forced a fresh
    // sign-in. The local flag is what lets requireUnlock() restore the
    // session in a new tab; signOut() clears it.
    _safeSet('local', 'site_unlocked', 'true');
    _safeSet('session', 'site_unlocked', 'true');
    _safeSet('session', 'family_code', family.family_code);
    _safeSet('session', 'family_name', family.family_name);
    _safeSet('session', 'guest_tags', JSON.stringify(tags));
    // Track the individual when known (name login), so person-level
    // features can tell family members apart. Code / ?invite= logins
    // leave this blank — the individual is unknown there.
    if (member && member.first_name && member.last_name) {
      _safeSet('session', 'guest_first_name', member.first_name);
      _safeSet('session', 'guest_last_name', member.last_name);
    } else {
      _safeRemove('session', 'guest_first_name');
      _safeRemove('session', 'guest_last_name');
    }
    return tags;
  }

  function findFamilyMember(family, first, last) {
    const fn = normalize(first), ln = normalize(last);
    return ((family && family.members) || []).find(m =>
      normalize(m.first_name) === fn && normalize(m.last_name) === ln) || null;
  }

  function signOut() {
    _safeRemove('local', 'inviteCode');
    _safeRemove('local', 'site_unlocked');
    _safeRemove('session', 'site_unlocked');
    _safeRemove('session', 'family_code');
    _safeRemove('session', 'family_name');
    _safeRemove('session', 'guest_tags');
    _safeRemove('session', 'guest_first_name');
    _safeRemove('session', 'guest_last_name');
  }

  function isUnlocked() {
    return _safeGet('session', 'site_unlocked') === 'true' ||
      _safeGet('local', 'site_unlocked') === 'true';
  }

  function getStoredCode() {
    return _safeGet('local', 'inviteCode') || null;
  }

  // Call on protected pages: redirects to index.html if not unlocked.
  // Also hides nav until unlocked, then reveals per-guest tabs.
  // Pass returnTo (e.g. 'lookbook.html') to send the guest back there
  // after they unlock on the gate page.
  function currentReturnTo() {
    try {
      const page = (location.pathname.split('/').pop() || 'home.html');
      return page + (location.hash || '');
    } catch (e) { return 'home.html'; }
  }

  // Call on protected pages: redirects to index.html if not unlocked.
  // Optimized: (a) an invite link is never dropped — a stale local cache
  // now forwards the code to the gate for a live check instead of falling
  // through to a gate redirect that loses it; (b) a new tab restores the
  // session from the stored code instead of bouncing to the gate;
  // (c) the redirect back preserves the page AND anchor (e.g. home.html#rsvp).
  function requireUnlock(returnTo) {
    const target = returnTo || currentReturnTo();
    const params = new URLSearchParams(location.search);
    if (params.has('invite')) {
      const code = params.get('invite').trim().toUpperCase();
      const fam = findFamilyByCode(code);
      if (fam) {
        signInFamily(fam);
        history.replaceState(null, '', location.pathname + location.hash);
        return true;
      }
      window.location.href = 'index.html?invite=' + encodeURIComponent(code) +
        '&next=' + encodeURIComponent(target);
      return false;
    }

    // Restore session in this tab from the stored code (new tab, browser
    // restart, or a session that was lost). This is what makes the
    // persistent unlock in signInFamily() actually work.
    if (!_safeGet('session', 'site_unlocked')) {
      const code = getStoredCode();
      if (code) {
        const fam = findFamilyByCode(code);
        if (fam) signInFamily(fam);
      }
      if (!_safeGet('session', 'site_unlocked')) {
        // No local match: let the gate do the live lookup (it preserves
        // the stored code and the return target).
        window.location.href = 'index.html?next=' + encodeURIComponent(target);
        return false;
      }
    }
    return true;
  }

  // Show/hide nav tabs based on guest tags. Call after requireUnlock.
  function renderNav() {
    const tags = JSON.parse(_safeGet('session', 'guest_tags') || '[]');
    const usEl = document.getElementById('nav-travel-us');
    const indiaEl = document.getElementById('nav-travel-india');
    if (usEl) usEl.style.display = tags.includes('us-guest') ? '' : 'none';
    if (indiaEl) indiaEl.style.display = tags.includes('india-guest') ? '' : 'none';

    // Hamburger menu (Admin / Log out) lives in the top nav now; show it
    // only for signed-in guests and wire the Log out item. The Admin item
    // is only shown when the signed-in family includes Rajat Khanna or
    // Disha Jain.
    const menuWrap = document.getElementById('nav-menu-wrap');
    if (menuWrap) {
      const familyCode = _safeGet('session', 'family_code');
      menuWrap.hidden = !familyCode;
      const adminItem = document.getElementById('nav-admin');
      if (adminItem) {
        // The Admin link is reserved for the owners. It appears when the
        // signed-in individual is Rajat Khanna or Disha Jain (known from
        // name login), or after signing in with Google as an allowlisted
        // admin on admin.html. Never for other guests — not even members
        // of the owners' families.
        let isOwner = false;
        try {
          const fn = normalize(_safeGet('session', 'guest_first_name') || '');
          const ln = normalize(_safeGet('session', 'guest_last_name') || '');
          isOwner = (fn === 'rajat' && ln === 'khanna') || (fn === 'disha' && ln === 'jain');
        } catch (e) {}
        if (!isOwner) {
          try {
            const verified = _safeGet('local', 'admin_verified_email') || '';
            const allowlist = (typeof adminEmails !== 'undefined' && Array.isArray(adminEmails))
              ? adminEmails : [];
            isOwner = !!verified && allowlist.includes(verified);
          } catch (e) {}
        }
        adminItem.style.display = isOwner ? '' : 'none';
      }
      const navLogout = document.getElementById('nav-logout');
      if (navLogout && !navLogout.dataset.wired) {
        navLogout.dataset.wired = '1';
        navLogout.onclick = () => { signOut(); window.location.href = 'index.html'; };
      }
    }
  }

  // Fetch the shared guest list from Firestore (when configured) and cache it
  // in localStorage so lookups work fast and offline. Never rejects: on any
  // failure it falls back to the local cache. Safe to call from multiple
  // places — the in-flight request is shared.
  //
  // A FAILED fetch is deliberately NOT cached: _guestDbPromise is cleared
  // whenever the download didn't actually load the shared list, so the next
  // call (e.g. the guest pressing the login button again) makes a fresh
  // attempt. The old code kept the failed promise for the whole page
  // session, so a slow first visit — the Firestore download racing the 8s
  // timeout on a phone that has never loaded Firebase before — made every
  // retry in that page fail with "couldn't find that name/code" until the
  // guest happened to reload the page.
  let _guestDbPromise = null;
  let _guestDbLoaded = false;
  let _memDb = null; // last remote list, kept in memory if localStorage refuses it
  function ensureGuestDatabase() {
    if (_guestDbLoaded) return Promise.resolve(getGuestDatabase());
    if (!_guestDbPromise) {
      _guestDbPromise = (async () => {
        let loaded = false;
        try {
          if (typeof db !== 'undefined' && db !== null) {
            const snap = await Promise.race([
              db.collection('families').get(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
            ]);
            const remote = [];
            snap.forEach(doc => {
              const f = doc.data();
              if (f && f.family_code) remote.push(f);
            });
            if (remote.length) {
              loaded = true;
              _memDb = remote;
              try { _safeSet('local', 'wedding_guest_database', JSON.stringify(remote)); } catch (e) {}
            }
          }
        } catch (e) { /* offline / denied: keep local cache */ }
        _guestDbPromise = null; // never cache a failure — the next call retries
        if (loaded) _guestDbLoaded = true;
        return getGuestDatabase();
      })();
    }
    return _guestDbPromise;
  }

  // Live lookups: ask Firestore directly, at the moment of the request,
  // instead of trusting a local download that may never have completed.
  // Used by the invite gate, where a stale or missing local list turns
  // real guests away with a bogus "not found".
  // - Resolves with the match when Firestore confirms one (for name
  //   lookups, the same family object / {ambiguous} shape findFamilyByName
  //   returns).
  // - Resolves with null when Firestore answered and there is no match —
  //   an authoritative "not on the list".
  // - REJECTS when Firestore can't be reached at all, so the caller can
  //   fall back to the local cache and, failing that, show a connection
  //   message instead of "not found".
  // There is deliberately no short timeout race here: a slow connection
  // is allowed to finish. A generous 30s cap keeps a truly dead
  // connection from hanging the page forever.
  function liveQuery(promise) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('live-timeout')), 30000))
    ]);
  }

  // Invite code: a single-document query — Firestore returns just the
  // one matching family, so this is fast even on a slow connection.
  async function findFamilyByCodeLive(code) {
    const q = normalize(code).toUpperCase();
    if (!q) return null;
    if (typeof db === 'undefined' || db === null) throw new Error('no-firestore');
    const snap = await liveQuery(
      db.collection('families').where('family_code', '==', q).limit(1).get()
    );
    let found = null;
    snap.forEach(doc => {
      const f = doc.data();
      if (f && f.family_code && !found) found = f;
    });
    if (found) cacheFamily(found);
    return found;
  }

  // Name: guests are nested inside family documents, so Firestore can't
  // query a person directly — but the list is small, so read it fresh
  // from Firestore on every request (never the local download) and
  // search that. The fresh list also refreshes the local cache, so the
  // pages after the gate keep working as before.
  async function findFamilyByNameLive(first, last) {
    if (!normalize(first) || !normalize(last)) return null;
    if (typeof db === 'undefined' || db === null) throw new Error('no-firestore');
    const snap = await liveQuery(db.collection('families').get());
    const remote = [];
    snap.forEach(doc => {
      const f = doc.data();
      if (f && f.family_code) remote.push(f);
    });
    if (!remote.length) throw new Error('empty-response');
    _memDb = remote;
    _guestDbLoaded = true;
    _guestDbPromise = null;
    try { _safeSet('local', 'wedding_guest_database', JSON.stringify(remote)); } catch (e) {}
    return findFamilyByName(first, last);
  }

  window.GuestAuth = {
    getGuestDatabase, findFamilyByCode, findFamilyByName, findFamilyMember,
    findFamilyByCodeLive, findFamilyByNameLive,
    signInFamily, signOut, isUnlocked, getStoredCode, storageAvailable,
    requireUnlock, renderNav, ensureGuestDatabase
  };
})();
