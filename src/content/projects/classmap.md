---
title: Classmap
description: Your UC Santa Cruz class schedule on a campus map, including rooms the big map apps can't find.
techStack: [Flutter, Dart, Riverpod, Swift, TypeScript, React, MapLibre]
githubUrl: https://github.com/JMBugarin/ucsc-campus-router-v2
category: Mobile and maps
stat: 87 of 87 classrooms resolved
order: 3
problem: A schedule says "Baskin Engr 152" and nothing about where that is. UCSC's campus is steep and wooded, buildings go by abbreviations and nicknames, and the big map apps usually stop at the building name, if they find it at all. For a new student, finding the right room is a small cost that repeats every day.
solution: The Flutter app imports a schedule (paste, an .ics file, or a photo read on the device by Apple's Vision framework), then shows each day's classes with the building, room and position resolved on the map. It forgives abbreviations and typos. All campus data ships inside the app, so search and the saved schedule work offline with no account. A separate React and MapLibre web map adds slope-aware walking routes you can compute in the browser.
next:
  - "Test on a physical iPhone and ship through TestFlight. It has only been run in the iOS Simulator so far."
  - "Bring photo import to Android. It reads schedule screenshots on iOS only."
  - "Add the department rooms and labs. Only the 87 official classrooms are first-class, and other rooms fall back to their building's main door."
  - "Add room-specific doors and indoor floor guidance, instead of handing the last stretch to the system maps app."
  - "Update campus data and term dates on a schedule, and cache map tiles so the map works offline too."
results:
  - "87 of 87 official classrooms resolve to a building, room and position."
  - "401 Flutter, 31 web and 55 data-pipeline tests pass."
  - "The Dart search, schedule reader and calendar reader are pinned to recorded outputs from the original Python version."
struggles:
  - issue: "The app depended on a server I hosted. A free host that sleeps made a first request fail or crawl, and with no connection there was no next class, no walk time and no route."
    fix: "I ported the schedule and search logic to Dart, pinned it to recorded outputs from the Python original, and saved walk times on the phone. Today now works offline from saved walks, and the server is gone."
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

- **No server, no account.** Campus data ships in the app and the schedule stays on the phone.
- **Hand off navigation.** The phone app passes the destination to the system maps app rather than rebuilding turn-by-turn directions.
- **Be precise about verification.** I checked every official classroom name and tested in the simulator, and I say so instead of calling it done.

## Limits

- Tested in the iOS Simulator, not on a physical device.
- Photo import is iOS only, and the app isn't on an app store.
- Not affiliated with UC Santa Cruz.
