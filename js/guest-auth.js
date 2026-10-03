/* Shared guest auth: invite code or name lookup, unlock gating, per-guest tabs.
   Mirrors the flow from the reference site: no tabs until unlocked.
   Stores invite in localStorage so families stay signed in on their device. */

(function () {
  const FALLBACK_DB = [
    { family_code: 'FAM01', family_name: 'Khanna Family', members: [{ first_name: 'Rajat', last_name: 'Khanna', email: 'rajat@example.com', tags: ['india-guest', 'us-guest', 'groom-side'], max_plus_ones: 1 }] },
    { family_code: 'FAM02', family_name: 'Jain Family', members: [{ first_name: 'Disha', last_name: 'Jain', email: 'disha@example.com', tags: ['india-guest', 'us-guest', 'bride-side'], max_plus_ones: 2 }] }
  ];

  function getGuestDatabase() {
    try {
      const stored = localStorage.getItem('wedding_guest_database');
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
    return db.find(f => (f.family_code || '').toUpperCase() === q) || null;
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
    localStorage.setItem('inviteCode', family.family_code.toUpperCase());
    sessionStorage.setItem('site_unlocked', 'true');
    sessionStorage.setItem('family_code', family.family_code);
    sessionStorage.setItem('family_name', family.family_name);
    sessionStorage.setItem('guest_tags', JSON.stringify(tags));
    // Track the individual when known (name login), so person-level
    // features can tell family members apart. Code / ?invite= logins
    // leave this blank — the individual is unknown there.
    if (member && member.first_name && member.last_name) {
      sessionStorage.setItem('guest_first_name', member.first_name);
      sessionStorage.setItem('guest_last_name', member.last_name);
    } else {
      sessionStorage.removeItem('guest_first_name');
      sessionStorage.removeItem('guest_last_name');
    }
    return tags;
  }

  function findFamilyMember(family, first, last) {
    const fn = normalize(first), ln = normalize(last);
    return ((family && family.members) || []).find(m =>
      normalize(m.first_name) === fn && normalize(m.last_name) === ln) || null;
  }

  function signOut() {
    localStorage.removeItem('inviteCode');
    sessionStorage.removeItem('site_unlocked');
    sessionStorage.removeItem('family_code');
    sessionStorage.removeItem('family_name');
    sessionStorage.removeItem('guest_tags');
    sessionStorage.removeItem('guest_first_name');
    sessionStorage.removeItem('guest_last_name');
  }

  function isUnlocked() {
    return sessionStorage.getItem('site_unlocked') === 'true';
  }

  function getStoredCode() {
    return localStorage.getItem('inviteCode') || null;
  }

  // Call on protected pages: redirects to index.html if not unlocked.
  // Also hides nav until unlocked, then reveals per-guest tabs.
  // Pass returnTo (e.g. 'lookbook.html') to send the guest back there
  // after they unlock on the gate page.
  function requireUnlock(returnTo) {
    // Support personal invite links like ?invite=FAM01
    const params = new URLSearchParams(location.search);
    if (params.has('invite')) {
      const code = params.get('invite').trim().toUpperCase();
      const fam = findFamilyByCode(code);
      if (fam) {
        signInFamily(fam);
        history.replaceState(null, '', location.pathname + location.hash);
      }
    }

    // Restore session from stored code (new tab)
    if (!isUnlocked()) {
      const code = getStoredCode();
      if (code) {
        const fam = findFamilyByCode(code);
        if (fam) signInFamily(fam);
      }
    }

    if (!isUnlocked()) {
      window.location.href = returnTo
        ? 'index.html?next=' + encodeURIComponent(returnTo)
        : 'index.html';
      return false;
    }
    return true;
  }

  // Show/hide nav tabs based on guest tags. Call after requireUnlock.
  function renderNav() {
    const tags = JSON.parse(sessionStorage.getItem('guest_tags') || '[]');
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
      const familyCode = sessionStorage.getItem('family_code');
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
          const fn = normalize(sessionStorage.getItem('guest_first_name') || '');
          const ln = normalize(sessionStorage.getItem('guest_last_name') || '');
          isOwner = (fn === 'rajat' && ln === 'khanna') || (fn === 'disha' && ln === 'jain');
        } catch (e) {}
        if (!isOwner) {
          try {
            const verified = localStorage.getItem('admin_verified_email') || '';
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
  let _guestDbPromise = null;
  function ensureGuestDatabase() {
    if (!_guestDbPromise) {
      _guestDbPromise = (async () => {
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
              try { localStorage.setItem('wedding_guest_database', JSON.stringify(remote)); } catch (e) {}
            }
          }
        } catch (e) { /* offline / denied: keep local cache */ }
        return getGuestDatabase();
      })();
    }
    return _guestDbPromise;
  }

  window.GuestAuth = {
    getGuestDatabase, findFamilyByCode, findFamilyByName, findFamilyMember,
    signInFamily, signOut, isUnlocked, getStoredCode,
    requireUnlock, renderNav, ensureGuestDatabase
  };
})();
