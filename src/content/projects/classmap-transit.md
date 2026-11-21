---
title: Classmap Transit
description: The backend behind Classmap's live buses. It ingests Santa Cruz METRO's realtime feed into PostgreSQL and serves departures, bus positions and alerts from an AWS server.
techStack: [Go, PostgreSQL, Docker, AWS EC2, Caddy, k6, React]
githubUrl: https://github.com/JMBugarin/classmap-transit
liveUrl: https://32-188-109-110.sslip.io/v1/feed-status
category: Backend and infrastructure
stat: 1.65 ms p95 at 100 req/s
order: 4
problem: Classmap's web map could only show scheduled bus times, and students care about the bus that is actually coming. METRO publishes a live GTFS-Realtime feed, but a feed snapshot can arrive late, twice, out of order or malformed, and a worker that stalls mid-job could publish old data over new. The map also needs an honest answer when predictions are missing, instead of a blank list or a stale time shown as live.
solution: A Go service polls the feed and accepts each capture, its fetch record and a job in one transaction. Workers claim jobs with leases and fencing tokens, so a worker whose lease expired can't publish. Late, duplicate, conflicting and future-dated snapshots are classified instead of applied, and the live pointer never moves backwards. Every response says whether its data is fresh, stale or unavailable, and falls back to the published schedule when predictions aren't fresh. Replays run into their own namespace with a pinned clock and give the same fingerprint for the same inputs. It has run on one EC2 instance since November 17, behind a Caddy ingress that exposes only the routes the web map needs.
next:
  - "Copy backups off the host automatically. Daily dumps sit on the same volume today, so a lost volume loses everything since the last manual copy."
  - "Measure uptime, cost and real traffic. None of them have been recorded yet."
  - "Benchmark through Caddy and TLS. The fast numbers bypass the ingress, and real users pay for TLS and their own internet path."
  - "Sample bus occupancy during the day. The feed reports it, but it has only been checked at night."
  - "Support a second agency, which the schema allows but nothing tests yet."
results:
  - "Load test from a machine in the same AWS zone: 100 requests/s for 10 minutes, departures p95 1.64 to 1.65 ms (1.46 to 1.50 ms with the response cache), 0 errors and 0 dropped requests in all 6 runs."
  - "Without the stop index, 70% of requests hit the 5 s statement timeout on 1M rows. From my home connection the indexed p95 was 36 ms, almost all of it network."
  - "Recovery drill on the cloud host: after destroying the database volume, the service was ready again in 18.0 s and published fresh data in 19.6 s. 305 s of history was lost, which is the time since the last off-host backup."
  - "33 Go tests run with the race detector against a real PostgreSQL in CI, including two fuzz targets and a check that the served routes match the OpenAPI spec. The operator page has 4 Vitest and 6 Playwright tests."
struggles:
  - issue: "The recovery drill exposed a bug. Generation ids came from a sequence, and restoring an older backup rewound it, so ids 7 to 12 were reissued for different data. A client that cached an id could see the same id for different data."
    fix: "New ids take the larger of the next sequence value and the database clock in microseconds, then move the sequence up to match. A restore can rewind a sequence but not the clock. A test rewinds the sequence and deletes a published capture, the way a restore does, and checks the next id is larger."
  - issue: "The first schedule import on the cloud host failed. The 5 s statement timeout cancelled the 235,038-row stop-times COPY, which took about 2.5 s on my laptop."
    fix: "The import transaction lifts the timeout for itself only. It now takes 8.9 s on the host, and the timeout still guards every API query."
  - issue: "My first remote benchmark said departures took 36 ms at p95, and I couldn't tell how much of that was the service."
    fix: "I froze a new protocol and pushed it before sending any load, then ran k6 from an instance in the host's subnet. In-zone TCP connects take about 0.3 ms, so the service's own p95 is about 1.65 ms. I deleted the load instance and its rules afterwards."
media:
  - kind: image
    group: interface
    src: media/classmap-transit/live-departures-1600.webp
    alt: The Classmap web map showing the Science Hill bus stop with six upcoming METRO buses, each labeled on time or scheduled.
    caption: The Classmap web map at a campus stop, fed by this service. Fresh predictions say on time, and buses without one fall back to the schedule. Captured November 20, 2026.
    width: 1600
    height: 900
---
## Decisions

- **Correctness in the database.** Acceptance, fencing and publication are transactions with row locks, so a crash or a stalled worker can't leave half a result or publish old data.
- **Say how fresh the data is.** Every response carries fresh, stale or unavailable, computed from the feed's own time, even on a cache hit.
- **Expose as little as possible.** The API listens on localhost. The public ingress forwards only departures, feed status, vehicles, alerts and two opt-in posts; admin and operator routes need SSH.
- **Freeze protocols before measuring.** Each benchmark's protocol was committed before any load was sent, and the raw output is in the repo.

## Limits

- One agency and one small server, with no measured uptime, cost or traffic yet.
- The benchmarks use synthetic data and skip the TLS ingress.
- Automated backups stay on the server's own disk.
