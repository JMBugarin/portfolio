---
title: Classmap
description: Your UC Santa Cruz class schedule on a campus map, with walking and bus directions to the door nearest each room.
techStack: [Flutter, Dart, Riverpod, Swift, TypeScript, React, MapLibre, Tesseract.js]
githubUrl: https://github.com/JMBugarin/ucsc-campus-router-v2
liveUrl: https://jmbugarin.github.io/ucsc-campus-router-v2/
category: Mobile and maps
stat: 87 of 87 classrooms resolved
order: 3
problem: A schedule says "Baskin Engr 152" and nothing about where that is. UCSC's campus is steep and wooded, buildings go by abbreviations and nicknames, and the big map apps usually stop at the building name, if they find it at all. For a new student, finding the right room, and the right bus, is a small cost that repeats every day.
solution: Classmap imports a schedule (paste from MyUCSC, add by hand, a photo read on the device, or an .ics file in the app), then shows each day's classes with the building, room and floor where a published UCSC source confirms it. It forgives abbreviations and typos. The Flutter app keeps all campus data on the phone, works offline with no account, and hands the walk or the bus ride to the system maps app. The web map is live and carries the same class features, plus its own directions. Routes follow the real paths, account for slope and stairs, and end at the door nearest the room. Walk and bus are compared side by side with live METRO predictions from Classmap Transit, trips from off campus are planned by bus, and every residence hall is routable, with a saved Home.
next:
  - "Walk the audit lists. No room has been checked on foot yet, so every room page says so, and room tips from students are checked before they show."
  - "Try live directions and the Bus hand-off on real walks. Both are tested in browsers and simulators, not on a phone in motion."
  - "Ship the iOS app beyond my own phone. The hosted web map is the public version for now."
  - "Bring on-device photo import to the Android app, and test the web reader on real MyUCSC screenshots."
  - "Add web push reminders, which need a push server, and update term dates and bus schedules each term automatically."
results:
  - "87 of 87 official classrooms resolve to a building, room and position."
  - "Routes end at the door nearest the room, a median 11 m away. The main entrance it used before was a median 20 m away, and 22 of 87 rooms were 15 m or more off."
  - "Routes follow the real path shapes: 2,592 of 2,594 walking edges matched. The old straight lines strayed up to 162 m from the path."
  - "42 classroom floors confirmed from published UCSC floor plans and maps. The 45 rooms without a confirmed floor show none instead of a guess."
  - "434 Flutter, 165 Vitest, 58 Playwright and 60 data-pipeline tests pass in CI, with iOS and Android builds."
  - "The Dart search, schedule reader and calendar reader are pinned to recorded outputs from the original Python version, and the web map's TypeScript port is checked against the app's fixtures."
struggles:
  - issue: "Students told me class locations weren't accurate. The web map opened the building for a room search and routed to whichever door was quickest, and the app always walked you to the main entrance."
    fix: "I measured it against the official room points, made all 87 classrooms searchable places on the web map, and ended every route at the one or two doors nearest the room, with the indoor stretch dotted. Room pages ask whether the route worked and take anonymous tips."
  - issue: "Floors were wrong. McHenry 1340 showed as floor 3 because the floor came from the campus map's level and a room-number rule. It is one floor below the main entrance."
    fix: "Floors now come only from a file of 42 rooms confirmed from published UCSC sources, each with its source. The room number and map level are no longer used."
  - issue: "The app depended on a server I hosted. A free host that sleeps made a first request fail or crawl, and with no connection there was no next class, no walk time and no route."
    fix: "I ported the schedule and search logic to Dart, pinned it to recorded outputs from the Python original, and saved walk times on the phone. Today now works offline from saved walks, and that server is gone."
  - issue: "Photo import started as a cloud call. It needed an API key I couldn't test against, and it sent schedule images off the phone."
    fix: "I removed the route and the key and read the text on the device with Apple's Vision framework. A parser turns it into classes, and a review step lets you fix headings and letters it read wrongly."
  - issue: "The campus is steep, so a flat walking speed gave bad times. Stairs and slopes made some routes unreasonable."
    fix: "I added USGS elevation to the routing graph, a grade-aware walking effort and an avoid-stairs option, and the web map now routes with those."
  - issue: "Time kept breaking things. A clock change shifted class minutes, and a new term or holiday broke the day picker."
    fix: "I count real minutes across a clock change, added regression tests around the November and March changes, moved term dates into a list of terms (with Winter and Spring 2027), and made the day-picker test time-zone proof."
media:
  - kind: video
    group: demo
    src: media/classmap/classmap-ios.mp4
    poster: media/classmap/ios-03-room-900.webp
    alt: Recording of the Classmap app in the iOS Simulator searching for a room and viewing a schedule
    caption: The app in the iOS Simulator with an invented schedule. Real time, 49 seconds.
    width: 1080
    height: 1920
  - kind: video
    group: demo
    src: media/classmap/classmap-web.mp4
    poster: media/classmap/web-04-route-1600.webp
    alt: Recording of the Classmap web map searching for places and drawing a walking route
    caption: The web map, served locally and recorded in headless Chrome. 29 seconds.
    width: 1920
    height: 1080
  - kind: image
    group: interface
    src: media/classmap/ios-01-map-900.webp
    alt: Classmap iOS app, the Map tab showing the UCSC campus with a search box.
    caption: Map. It needs no schedule to be useful.
    width: 900
    height: 1957
  - kind: image
    group: interface
    src: media/classmap/ios-02-search-900.webp
    alt: Classmap search for "BE 152" suggesting Jack Baskin Engineering 152.
    caption: Search resolves "BE 152" to Jack Baskin Engineering 152.
    width: 900
    height: 1957
  - kind: image
    group: interface
    src: media/classmap/ios-03-room-900.webp
    alt: Classmap showing Jack Baskin Engineering 152 on the map with a Walk there button.
    caption: A room on the map, with a button that hands the walk to the system maps app.
    width: 900
    height: 1957
  - kind: image
    group: interface
    src: media/classmap/ios-04-schedule-900.webp
    alt: Classmap Schedule tab with buttons to paste from MyUCSC, import a calendar file, read a photo or add a class.
    caption: Schedule import by paste, calendar file, photo or by hand.
    width: 900
    height: 1957
  - kind: image
    group: interface
    src: media/classmap/ios-05-day-900.webp
    alt: Classmap Today tab listing two classes on Thursday with the gap between them.
    caption: Today, with the gap between classes.
    width: 900
    height: 1957
  - kind: image
    group: interface
    src: media/classmap/ios-06-class-on-map-900.webp
    alt: Classmap showing Thimann Labs 101 on the map.
    caption: A class shown on the map from the Today list.
    width: 900
    height: 1957
  - kind: image
    group: interface
    src: media/classmap/ios-07-week-900.webp
    alt: Classmap Week view listing each day with its class count and first start time.
    caption: Week view, with holidays and weekends called out.
    width: 900
    height: 1957
  - kind: image
    group: interface
    src: media/classmap/web-10-walk-or-bus-1600.webp
    alt: The Classmap web map with directions from Kresge College to Jack Baskin Engineering 152, comparing an 8-minute walk with a Route 19 bus that arrives 2 minutes sooner.
    caption: Walk and bus side by side, with the route ending at the door nearest the room. The live site, November 20, 2026.
    width: 1600
    height: 900
  - kind: image
    group: interface
    src: media/classmap/web-09-room-door-1600.webp
    alt: The Classmap web map showing Jack Baskin Engineering 152 with its closest mapped door, nearby rooms and a feedback prompt.
    caption: A room page with the closest door, the building's other rooms, and a prompt for students to say whether it got them there.
    width: 1600
    height: 900
  - kind: image
    group: interface
    src: media/classmap/web-01-home-1600.webp
    alt: The Classmap web map with a search box, category filters and a list of popular places.
    caption: Web map home, with places grouped by category.
    width: 1600
    height: 900
  - kind: image
    group: interface
    src: media/classmap/web-03-place-1600.webp
    alt: The Classmap web map showing McHenry Library with its details card.
    caption: A place card with aliases, classroom count and the data source.
    width: 1600
    height: 900
  - kind: image
    group: interface
    src: media/classmap/web-04-route-1600.webp
    alt: The Classmap web map showing a walking route from Kresge College to Jack Baskin Engineering with an avoid-stairs option.
    caption: A walking route with an avoid-stairs option and a time estimate that accounts for slope.
    width: 1600
    height: 900
  - kind: image
    group: interface
    src: media/classmap/web-07-route-dark-1600.webp
    alt: The Classmap web map in dark mode showing a route from Quarry Plaza to McHenry Library.
    caption: The same routing in dark mode.
    width: 1600
    height: 900
---
## Decisions

- **No account.** Campus data ships with the app and schedules stay on the device. The only server is Classmap Transit for live buses, and everything else works without it.
- **Hand off navigation on the phone.** The app passes the destination to the system maps app rather than rebuilding turn-by-turn directions. The web map, with no maps app to lean on, routes itself.
- **Be precise about verification.** Every room page says "Not checked on foot yet" until someone walks it, and a floor is shown only when a published source confirms it.

## Limits

- The iOS app is tested in the Simulator and on my own iPhone, and isn't on an app store.
- Photo import in the app is iOS only. The web map reads photos in the browser.
- Not affiliated with UC Santa Cruz.
