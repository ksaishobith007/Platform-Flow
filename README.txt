PLATFORMFLOW — STARTER PROJECT

HOW TO OPEN
1. Extract PlatformFlow.zip.
2. Open the PlatformFlow folder.
3. Double-click index.html in your browser.
4. Demo login:
   Staff ID: staff
   Password: platform123

WHAT'S INCLUDED
- Staff login screen (local demo gate only)
- Overview dashboard
- Train board with station and time-window filters
- Main-line / loop-line illustrative track diagram
- Platform allocation suggestions with preference fallback
- DSA implementation: Map-based station lookup, arrival sorting, graph adjacency list + BFS path checks, interval overlap checks, greedy allocation
- Simulated clearance workflow
- Responsive layout for desktop and mobile

IMPORTANT LIMITATIONS
- All train names/numbers/times, station platform counts, track connections and occupancy states are illustrative demo data. They may not match real schedules or actual station layouts.
- No live railway feed is connected.
- Login is hard-coded and is NOT secure authentication.
- This is not an approved signalling, interlocking, dispatch or clearance system.
- Do not use it for real train movement or operational decisions.
- Real platform/track routing needs verified station-specific track topology, authorized operational feeds and approved railway procedures.
- The demo release button only records a simulated confirmation in the browser.

NEXT STEPS
1. Replace demo topology with a verified station track plan.
2. Define track nodes/edges, point connections, platform lengths, train restrictions, occupancy intervals and clearance buffers.
3. Add a backend and secure authentication with staff roles.
4. Connect only to permitted/authorized data sources.
5. Test the algorithm against reviewed scenarios before expanding the prototype.

NETWORK DATA IMPORT (NEW)
-------------------------
The Train Movement Board includes a local JSON importer for a station directory,
train timetable, and optional delay updates. This lets you load a larger timetable
without pretending the small bundled demo data is nationwide or live.

Suggested open dataset (community-maintained, NOT an official live feed):
https://github.com/prasenjit-27/Indian-Railway-Data
The repository describes stations.json (about 8,990 station records) and trains.json
(about 5,208 train records; approximately 96.6 MB). Verify the repository's current
contents, licence, freshness, and correctness before using it. The Indian Railways
Open Government Data timetable catalogue is another source, but its listed timetable
was last updated in 2018:
https://www.data.gov.in/catalog/indian-railways-train-time-table

IMPORT STEPS
1. Download stations.json and trains.json from the dataset repository above.
2. Open PlatformFlow/index.html and sign in with the demo credentials.
3. Go to Train Movement Board.
4. Choose stations.json under Station directory JSON and trains.json under Train
   timetable JSON, then click Load selected data. A large train JSON can take time
   and memory to parse in a browser.
5. Choose any station code and time window. Records are selected if scheduled or
   expected arrival/departure/occupancy intersects the interval.

OPTIONAL DELAY UPDATE FILE
Select a JSON array with records shaped like this:
[
  {
    "stationCode": "TPTY",
    "trainNumber": "17015",
    "expectedArrival": "16:45",
    "expectedDeparture": "17:05",
    "delayMinutes": 35,
    "updatedAt": "2026-10-17T16:20:00+05:30",
    "source": "Authorized feed name"
  }
]
This is only a schema example. Do not use invented values as live data. Delay updates
must match the station code and train number and must carry a reliable source and
fresh timestamp. This importer does not connect to any live railway API.

SAFETY / ACCURACY LIMITATION
Imported timetables enable broad train and station lookup. They do NOT provide live
running status, actual platform occupancy, route setting, points status, train length,
or confirmed clearance. Imported stations' platform allocation is deliberately
blocked until a station-specific verified track graph and operational data are
configured. Do not use this student prototype to direct real train movements.
