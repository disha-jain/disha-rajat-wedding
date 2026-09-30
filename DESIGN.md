# Design System — Disha & Rajat Wedding Site

One palette, one font scheme, one travel layout. Every page follows this.

## Color palette
Sampled from the approved swatch screenshots.

| Token            | Hex       | Use                                  |
|------------------|-----------|--------------------------------------|
| Gold             | `#C9A961` | Accents, borders, active states      |
| Gold light       | `#E7D6AC` | Highlights on dark surfaces          |
| Gold dark        | `#A5813F` | Script headings, emphasized text     |
| Ink              | `#1B1A17` | Nav, footer, dark panels, primary buttons |
| Dark gray        | `#3B3A37` | Body text, serif headings            |
| Smoke            | `#C8BFB4` | Muted decorative gray                |
| Taupe            | `#9F968A` | Secondary / muted text               |
| Glacier          | `#D4D5CE` | Cool light gray                      |
| Warm gray        | `#D4CCC2` | Nav link text                        |
| Cream            | `#DDCFBA` | Warm tint                            |
| Ivory            | `#FAF7F0` | Page background                      |
| White            | `#FFFFFF` | Cards                                |
| Line             | `#E7DCC8` | Card / input borders                 |

CSS variables live in `styles.css` (`--gold-primary`, `--gold-dark`, `--ink`,
`--dark-gray`, `--taupe`, `--ivory`, `--line`, …). Legacy aliases
(`--bg-dark`, `--text-main`, `--text-sub`, `--border-gold`) are mapped onto the
new palette so older markup keeps working.

## Font scheme
- **Boheme Floral** (script) — decorative accents only: "The Venue", "Can't wait
  to party?", hero script lines. Never for body text. Self-hosted in `fonts/`
  via `@font-face` in `styles.css`.
- **Cinzel** (serif) — all headings: page titles, card titles, nav links,
  buttons, dates.
- **Montserrat** (sans) — body copy, form inputs, labels.

## Page patterns
- **Nav**: dark ink bar, 2px gold underline, cream links, gold active state.
  Hidden until the invite is unlocked; travel tabs render per guest tags.
- **Cards**: white, 1px `--line` border, 14px radius, soft warm shadow.
- **Dark panel**: ink background with gold script sub-heading (used for
  "Parking & Directions" / "Arrival & Transfers" on travel pages).
- **Primary button**: ink pill, white Cinzel text. **Secondary**: gold outline pill.
- **Footer**: ink bar, smoke letter-spaced text.
- **Travel pages** (`travel-us.html`, `travel-india.html`) share one layout from
  `css/travel.css`: script "The" + serif "VENUE" hero, venue card, dark info
  panel, two-column info cards. Only the content differs.

## Entry / auth
`index.html` (invite code or name lookup) → `home.html`. Until unlocked no tabs
exist; `js/guest-auth.js` (`requireUnlock` / `renderNav`) enforces this on every
protected page.

## Schedule config
`js/events.js` (`WEDDING_EVENTS`) is the single source of truth for the
schedule. Edit dates, times, venues, venue details, dress codes, notes, and
tags there — `schedule.html` and `rsvp.html` both read from it.

Tag visibility: an event shows to a guest if ANY event tag matches ANY of the
guest's tags. Current tags: `india-guest`, `us-guest`, `bride-side`
(Disha-specific), `groom-side` (Rajat-specific). Add more (e.g. `family-only`)
in `js/events.js` and assign them to guests via the admin CSV.

## RSVP model
- One RSVP per family: members RSVP for every event their tags unlock.
- Checkboxes per person per event (checked = attending).
- Additional guests: named (first + last required), capped at the family's
  `max_plus_ones` total from the guest CSV. Families with a 0 limit see no
  add-guest UI.
- Saved per event per person to `wedding_rsvps_database` (localStorage) and
  Firestore `rsvps`, so the admin CSV export keeps working.
