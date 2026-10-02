/* ============================================================
   WEDDING EVENTS — single source of truth for the schedule.
   *** THIS IS THE FILE TO EDIT when dates, times, venues,
   *** dress codes, color palettes, notes, or tags change. ***
   the single-page home.html (events + rsvp sections) reads from here, so one edit
   updates every page.

   Tags control visibility: an event is shown to a guest if ANY of
   the event's tags matches ANY of the guest's (or family's) tags.
   Set `rsvp: false` on an event to keep it on the schedule while
   hiding it from the RSVP form.
   Tag vocabulary (keep it consistent, no apostrophes):
     india-guest  – invited to the India celebrations
     us-guest     – invited to the Virginia reception
     bride-side   – Disha-specific events
     groom-side   – Rajat-specific events
   Add your own (e.g. family-only, wedding-only) and assign them to
   guests via the admin CSV upload.
   ============================================================ */

const WEDDING_EVENTS = [
  // ---------------- Day 1 — March 13, Chomu Palace ----------------
  {
    id: 'welcome-lunch',
    title: 'Welcome Lunch & Mehendi',
    date: '2027-03-13',
    dateLabel: 'Day 1 — March 13, 2027',
    time: '12:00 PM – 2:30 PM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME — e.g. 'Main Courtyard'
    dressCode: 'Sunset colors',   // EDIT ME — e.g. 'Festive Indian wear'
    palette: ['#F0A8A0', '#E7583E', '#E38322', '#F2C79C', '#166963'], // EDIT ME — swatch colors shown with the dress code
    notes: '',                  // EDIT ME — anything guests should know
    tags: ['india-guest'],
    icon: '🌿'
  },
  {
    id: 'tel-baan',
    title: 'Disha Tel Baan',
    date: '2027-03-13',
    dateLabel: 'Day 1 — March 13, 2027',
    time: '3:00 PM – 4:30 PM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['bride-side'],
    rsvp: false,                // shown on the schedule, hidden from the RSVP form
    icon: '🪔'
  },
  {
    id: 'high-tea',
    title: 'High Tea',
    date: '2027-03-13',
    dateLabel: 'Day 1 — March 13, 2027',
    time: '4:00 PM – 6:00 PM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['india-guest'],
    rsvp: false,                // shown on the schedule, hidden from the RSVP form
    icon: '🫖'
  },
  {
    id: 'sangeet',
    title: 'Sangeet',
    date: '2027-03-13',
    dateLabel: 'Day 1 — March 13, 2027',
    time: '7:00 PM – 11:00 PM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: 'Festive Glamour & Shine (Lehengas, Anarkalis, Bandhgalas, or glamorous Western cocktail attire)',
    notes: '',
    tags: ['india-guest'],
    icon: '🎶'
  },

  // ---------------- Day 2 — March 14, Chomu Palace ----------------
  {
    id: 'gaur-puja',
    title: 'Gaur Puja',
    date: '2027-03-14',
    dateLabel: 'Day 2 — March 14, 2027',
    time: '9:00 AM – 9:30 AM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['bride-side'],
    rsvp: false,                // shown on the schedule, hidden from the RSVP form
    icon: '🙏'
  },
  {
    id: 'tel-haldi',
    title: 'Rajat Tel Haldi',
    date: '2027-03-14',
    dateLabel: 'Day 2 — March 14, 2027',
    time: '9:00 AM – 9:30 AM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: 'Parallel activity',
    tags: ['groom-side'],
    rsvp: false,                // shown on the schedule, hidden from the RSVP form
    icon: '🌼'
  },
  {
    id: 'phoolon-haldi',
    title: 'Phoolon Ki Haldi & Lunch',
    date: '2027-03-14',
    dateLabel: 'Day 2 — March 14, 2027',
    time: '11:30 AM – 2:30 PM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: 'Shades of yellow',
    palette: ['#F0B402', '#FDC52E', '#FED360', '#FEE193', '#FEEFC6'],
    notes: '',
    tags: ['india-guest'],
    icon: '🌸'
  },
  {
    id: 'high-tea-2',
    title: 'High Tea',
    date: '2027-03-14',
    dateLabel: 'Day 2 — March 14, 2027',
    time: '4:00 PM – 6:00 PM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['india-guest'],
    rsvp: false,                // shown on the schedule, hidden from the RSVP form
    icon: '🫖'
  },
  {
    id: 'sehra-bandi',
    title: 'Sehra Bandi',
    date: '2027-03-14',
    dateLabel: 'Day 2 — March 14, 2027',
    time: '6:00 PM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['groom-side'],
    icon: '👑'
  },
  {
    id: 'baarat',
    title: 'Baarat',
    date: '2027-03-14',
    dateLabel: 'Day 2 — March 14, 2027',
    time: '6:30 PM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: '',              // EDIT ME
    notes: '',
    tags: ['groom-side'],
    rsvp: false,                // shown on the schedule, hidden from the RSVP form
    icon: '🥁'
  },
  {
    id: 'shaadi',
    title: 'Shaadi',
    date: '2027-03-14',
    dateLabel: 'Day 2 — March 14, 2027',
    time: '7:00 PM – 11:00 PM',
    venue: 'Chomu Palace',
    venueDetail: '',            // EDIT ME
    dressCode: 'Traditional Indian Formal (Sarees, Lehengas, Sherwanis)',
    notes: '',                  // EDIT ME — anything guests should know
    tags: ['india-guest'],
    icon: '💒',
    parts: [                    // sub-events shown on the schedule; RSVP stays a single row
      { time: '7:00 PM', title: 'Varmala', icon: '💐' },
      { time: '7:30 PM – 9:30 PM', title: 'Reception', icon: '🥂' },
      { time: '9:45 PM – 10:40 PM', title: 'Pheras', icon: '🔥' },
      { time: '11:00 PM', title: 'Vidai', icon: '👋' }
    ]
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

/* Render an event's color palette as a row of small swatches.
   Used after the dress-code line wherever events are listed. */
function renderPalette(e) {
  if (!e || !Array.isArray(e.palette) || !e.palette.length) return '';
  const swatches = e.palette
    .filter(c => /^#[0-9a-fA-F]{6}$/.test(String(c).trim()))
    .map(c => `<span class="palette-swatch" style="background:${String(c).trim()}"></span>`)
    .join('');
  if (!swatches) return '';
  return `<span class="palette-swatches" aria-label="Dress code color palette">${swatches}</span>`;
}

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
