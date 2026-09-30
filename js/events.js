/* ============================================================
   WEDDING EVENTS — single source of truth for the schedule.
   *** THIS IS THE FILE TO EDIT when dates, times, venues,
   *** dress codes, notes, or tags change. ***
   schedule.html and rsvp.html both read from here, so one edit
   updates every page.

   Tags control visibility: an event is shown to a guest if ANY of
   the event's tags matches ANY of the guest's (or family's) tags.
   Tag vocabulary (keep it consistent, no apostrophes):
     india-guest  – invited to the India celebrations
     us-guest     – invited to the Virginia reception
     bride-side   – Disha-specific events
     groom-side   – Rajat-specific events
   Add your own (e.g. family-only, wedding-only) and assign them to
   guests via the admin CSV upload.
   ============================================================ */

const WEDDING_EVENTS = [
  // ---------------- March 13 — Chomu Palace ----------------
  {
    id: 'welcome-lunch',
    title: 'Welcome Lunch & Mehendi',
    date: '2027-03-13',
    dateLabel: 'March 13, 2027',
    time: '12:00 PM',            // EDIT ME
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME — e.g. 'Main Courtyard'
    dressCode: '',              // EDIT ME — e.g. 'Festive Indian wear'
    notes: '',                  // EDIT ME — anything guests should know
    tags: ['india-guest'],
    icon: '🌿'
  },
  {
    id: 'tel-ban',
    title: "Disha's Tel Ban",
    date: '2027-03-13',
    dateLabel: 'March 13, 2027',
    time: '4:00 PM',            // EDIT ME
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['bride-side'],
    icon: '🪔'
  },
  {
    id: 'sangeet',
    title: 'Sangeet',
    date: '2027-03-13',
    dateLabel: 'March 13, 2027',
    time: '7:00 PM',            // EDIT ME
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['india-guest'],
    icon: '🎶'
  },

  // ---------------- March 14 — Chomu Palace ----------------
  {
    id: 'tel-haldi',
    title: "Rajat's Tel Haldi",
    date: '2027-03-14',
    dateLabel: 'March 14, 2027',
    time: '10:00 AM',           // EDIT ME
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['groom-side'],
    icon: '🌼'
  },
  {
    id: 'gaur-puja',
    title: "Disha's Gaur Puja",
    date: '2027-03-14',
    dateLabel: 'March 14, 2027',
    time: '10:00 AM',           // EDIT ME
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['bride-side'],
    icon: '🙏'
  },
  {
    id: 'phoolon-haldi',
    title: 'Phoolon Ki Haldi',
    date: '2027-03-14',
    dateLabel: 'March 14, 2027',
    time: '11:00 AM',           // EDIT ME
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['bride-side'],
    icon: '🌸'
  },
  {
    id: 'shaadi',
    title: 'Shaadi',
    date: '2027-03-14',
    dateLabel: 'March 14, 2027',
    time: '7:00 PM',            // EDIT ME
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['india-guest'],
    icon: '💒'
  },

  // ---------------- March 27 — Virginia ----------------
  {
    id: 'virginia-reception',
    title: 'Virginia Reception',
    date: '2027-03-27',
    dateLabel: 'March 27, 2027',
    time: '6:00 PM – 12:00 AM', // EDIT ME
    venue: 'The Bellevue',
    venueDetail: 'Chantilly, Virginia',  // EDIT ME
    dressCode: '',              // EDIT ME — e.g. 'Black tie optional'
    notes: '',
    tags: ['us-guest'],
    icon: '🥂'
  }
];

/* Events visible to a guest with the given tags (any tag overlap). */
function eventsForTags(tags) {
  const set = new Set((tags || []).map(t => String(t).toLowerCase()));
  return WEDDING_EVENTS.filter(e => e.tags.some(t => set.has(String(t).toLowerCase())));
}

/* Group events by date, preserving order. Returns [{dateLabel, events:[...]}] */
function groupEventsByDate(events) {
  const groups = [];
  const byDate = new Map();
  events.forEach(e => {
    if (!byDate.has(e.date)) {
      const g = { date: e.date, dateLabel: e.dateLabel, events: [] };
      byDate.set(e.date, g);
      groups.push(g);
    }
    byDate.get(e.date).events.push(e);
  });
  return groups;
}
