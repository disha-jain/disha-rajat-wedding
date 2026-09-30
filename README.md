# Disha Jain & Rajat Khanna — Wedding Website (#rishta)

A responsive, tag-based wedding website designed for **Disha Jain & Rajat Khanna**'s upcoming multi-event wedding celebrations in Chomu, Rajasthan (India) and Chantilly, Virginia (USA).

The platform features guest authentication, household/family RSVP grouping, tag-restricted travel pages, live countdown timers, and an integrated Admin Dashboard for guest list management via CSV uploads.

---

## Key Features

* **Visual Design:** Dark obsidian theme accented with foil gold borders, floating fairy lights, and customized fonts (`Cinzel`, `Great Vibes`, and `Montserrat`).
* **Dynamic Tag-Based Access Control:**
  * **Event Schedule:** Displays events matching the logged-in guest's assigned tags (e.g., `india-guest`, `us-guest`, `groom-side`, `bride-side`).
  * **US Travel & Lodging Page:** Restricted to guests tagged with `us-guest`. Includes venue details for *The Bellevue* (Chantilly, VA), Dulles International Airport (IAD) transport tips, and nearby hotel recommendations.
  * **India Travel Page:** Restricted to guests tagged with `india-guest`. Displays venue details for *Chomu Palace* (Chomu, Rajasthan), Jaipur International Airport (JAI) connections, and transfer updates.
* **Household RSVP System:**
  * One RSVP per household using a shared `family_id`.
  * Individual attendee selection per event.
  * Plus-one naming inputs enforced by customized `max_plus_ones` limits.
  * Dietary restrictions and notes collection.
* **Admin Dashboard:**
  * Drag-and-drop CSV guest list importer.
  * Automatic tag parsing and household grouping.
* **Backend Integration:**
  * Powered by Google Firebase (Cloud Firestore) for real-time data persistence and guest validation.

---

## File Structure

```text
├── index.html           # Main application HTML, UI components, & script logic
├── firebase-config.js   # Firebase API keys and initialization script
├── NYCEngagementPhotographer-222.jpg # Background hero image
└── README.md            # Documentation
