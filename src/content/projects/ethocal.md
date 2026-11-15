---
title: Ethocal
description: A mobile app for finding and hosting local yard sales and flea markets. The concept won the DesignVerse Hackathon at UC Riverside with a team of five.
techStack: [React Native, Expo, TypeScript, Supabase, PostGIS, Figma]
category: Team project
stat: DesignVerse 2026 winner
order: 4
problem: Buying secondhand is the practical alternative to fast fashion, but local yard sales and flea markets are scattered across social posts and word of mouth, so it's hard to see what is happening near you today. Hosts have the opposite worry. Publishing a home address to the whole internet is a privacy risk most people won't take for a Saturday sale.
solution: Ethocal puts local events on one map screen with a draggable panel for the city, date and category filters, and event cards. Pins show only an approximate area. The exact address is released to signed-in users with a confirmed email once the event starts, and the check runs on the server, not in the app. Hosts build a one-day event in steps (location, time, categories, prices, photos, description, preview) with drafts that survive leaving halfway, and shoppers can save events and ask the host a question.
next:
  - "Add push notifications, once the provider is chosen, with exact addresses kept out of notification content."
  - "Roll out to hosted staging and production: apply the migrations, turn on email confirmation and set up a real SMTP provider."
  - "Finish messaging: unread counts, read receipts, and reporting and blocking."
  - "Support recurring and multi-day events, which the first release leaves out on purpose."
  - "Create the restricted Google Maps key for Android builds, and pick a hosted geocoder."
media: []
mediaNote: The repository is private and belongs to the team, so there is no public demo or screenshots yet.
---

## My part

I built four parts of the interface:

- The messaging screens, where a shopper asks a host a question and reads replies.
- The profile pages.
- The schedule and edit-event pages in the host flow.
- The event details page.

The rest of the app is my teammates' work. This list is my own account of my part: the source has no commit history, so it can't be checked from the code alone.

## How it's built

- **One codebase for iOS and Android** with Expo Router, TypeScript and shared design-system components.
- **Supabase** for accounts, data, photos and rules. Row-level security guards every user-facing table.
- **Location privacy by design.** Public queries only return the center of a roughly 1 km grid cell. The exact address lives in a restricted table and leaves through one audited server function.
- **Events carry their own time zone**, so a displayed start time stays correct wherever the viewer is.
- **Checks in CI**: type checking, Jest tests, lint, database tests, and bundle exports for both platforms.

## Limits

- Team project with a private repository.
- No measured results to report yet.
- Not released: the hosted projects haven't been set up.
