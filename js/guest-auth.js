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

  function signInFamily(family) {
    const tags = [...new Set((family.members || []).flatMap(m => m.tags || []))];
    localStorage.setItem('inviteCode', family.family_code.toUpperCase());
    sessionStorage.setItem('site_unlocked', 'true');
    sessionStorage.setItem('family_code', family.family_code);
    sessionStorage.setItem('family_name', family.family_name);
    sessionStorage.setItem('guest_tags', JSON.stringify(tags));
    return tags;
  }

  function signOut() {
    localStorage.removeItem('inviteCode');
    sessionStorage.removeItem('site_unlocked');
    sessionStorage.removeItem('family_code');
    sessionStorage.removeItem('family_name');
    sessionStorage.removeItem('guest_tags');
  }

  function isUnlocked() {
    return sessionStorage.getItem('site_unlocked') === 'true';
  }

  function getStoredCode() {
    return localStorage.getItem('inviteCode') || null;
  }

  // Call on protected pages: redirects to index.html if not unlocked.
  // Also hides nav until unlocked, then reveals per-guest tabs.
  function requireUnlock() {
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
      window.location.href = 'index.html';
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

    // Add logout button if nav exists and not already added
    const nav = document.querySelector('nav');
    if (nav && !document.getElementById('nav-logout')) {
      const btn = document.createElement('button');
      btn.id = 'nav-logout';
      btn.textContent = 'Log out';
      btn.style.cssText = 'background:none;border:none;color:#E2E2E8;font-family:var(--font-serif);font-size:0.82rem;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;cursor:pointer;';
      btn.onclick = () => { signOut(); window.location.href = 'index.html'; };
      nav.appendChild(btn);
    }

    // Show family name in nav if available
    const famName = sessionStorage.getItem('family_name');
    if (famName && nav && !document.getElementById('nav-family')) {
      const span = document.createElement('span');
      span.id = 'nav-family';
      span.textContent = famName;
      span.style.cssText = 'color:var(--gold-light);font-size:0.75rem;letter-spacing:1px;margin-left:8px;';
      nav.appendChild(span);
    }
  }

  window.GuestAuth = {
    getGuestDatabase, findFamilyByCode, findFamilyByName,
    signInFamily, signOut, isUnlocked, getStoredCode,
    requireUnlock, renderNav
  };
})();
