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
- **Great Vibes** (script) — decorative accents only: "The Venue", "Can't wait
  to party?", hero script lines. Never for body text.
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
