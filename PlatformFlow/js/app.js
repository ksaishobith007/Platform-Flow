
"use strict";

/*
 * PlatformFlow
 * DSA-based railway platform planning prototype.
 * All train records entered here are illustrative/manual data.
 * This is not connected to live railway operations.
 */

const trains = [];
const allocations = new Map();
const TRAIN_STORAGE_KEY = "platformflow.manualTrains.v1";
let activePlanWindow = { day: new Date().toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(), start: "04:00", end: "08:00" };


let nextTrainId = 1;
let stationRecords = [];
let stationDataLoaded = false;
const PLATFORM_BUFFER_MINUTES = 10; // Minimum clearance gap between consecutive platform uses.
const ORIGINATING_ENTRY_MINUTES = 30;
const DESTINATION_MAINTENANCE_MINUTES = 20;

// Fallback platform counts from the project's supplied station list.
// These values need verification against official railway records.
const fallbackPlatformCounts = {
  BZA: 10, VSKP: 8, TPTY: 6, GTL: 7, OGL: 5,
  RJY: 3, NLR: 4, VZM: 5, RU: 5, GNT: 7,
  SC: 10, HYB: 6, KCG: 5, CHZ: 9, LPI: 5,
  BMT: 2, KZJ: 3, WL: 4, KMT: 3, NZB: 3,
  MAS: 12, MS: 11, TBM: 8, AJJ: 8, CGL: 7,
  KPD: 5, CBE: 6, ED: 4, TPJ: 8, MDU: 7,
  SBC: 10, YPR: 6, BNC: 4, KJM: 4, SMVB: 5,
  MYS: 6, UBL: 8, DWR: 4, BGM: 4, MAQ: 5,
  TVC: 5, KCVL: 6, ERS: 6, ERN: 4, QLN: 6,
  ALLP: 3, KTYM: 6, TCR: 4, CLT: 4, CAN: 4,
  PDY: 5
};

const priorityRank = {
  high: 3,
  medium: 2,
  normal: 1
};

const priorityLabel = {
  high: "High",
  medium: "Medium",
  normal: "Normal"
};

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// Convert HH:MM into minutes after midnight.
function toMinutes(time) {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return NaN;

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) return NaN;

  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder
    ? `${hours} hr ${remainder} min`
    : `${hours} hr`;
}

function movementLabel(value) {
  return {
    originating: "Originating",
    intermediate: "Intermediate halt",
    destination: "Destination / terminating",
    terminating: "Destination / terminating"
  }[value] || value;
}

function setMessage(id, message, type = "") {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.className = "message" + (type ? ` ${type}` : "");
}

function getStationCode() {
  return ($("mainStationSelect")?.value || $("entryStationCode")?.value || "BZA")
    .trim()
    .toUpperCase();
}



function getPlatformCount(stationCode) {
  const code = String(stationCode || "").trim().toUpperCase();

  const station = stationRecords.find(item =>
    String(
      item.code ??
      item.station_code ??
      item.stationCode ??
      item.stationCodeShort ??
      ""
    ).trim().toUpperCase() === code
  );

  if (station) {
    const rawCount =
      station.platform_count ??
      station.platformCount ??
      station.platforms_count ??
      station.number_of_platforms ??
      station.platforms;

    const count = Number(rawCount);

    if (
      rawCount !== undefined &&
      rawCount !== null &&
      rawCount !== "" &&
      Number.isInteger(count) &&
      count > 0
    ) {
      return count;
    }
  }

  return fallbackPlatformCounts[code] ?? null;
}

// Try to load the station list. When opened directly using file://,
// browsers may block fetch; the fallback counts still allow a demo.

async function loadStations() {
  try {
    const response = await fetch(new URL("data/stations.json", document.baseURI), { cache: "no-store" });

    if (!response.ok) {
      throw new Error(
        `Could not load stations.json: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const records = Array.isArray(data)
      ? data
      : data.stations;

    if (!Array.isArray(records)) {
      throw new Error(
        "stations.json must be an array or an object containing a stations array."
      );
    }

    stationRecords = records;
    stationDataLoaded = true;

    console.log("Station records loaded:", stationRecords.length);
    console.table(
      stationRecords.map(station => ({
        code: station.code ?? station.station_code,
        name: station.name ?? station.station_name,
        platforms:
          station.platform_count ??
          station.platformCount ??
          station.number_of_platforms
      }))
    );
  } catch (error) {
    stationRecords = [];
    stationDataLoaded = false;
    console.error("Could not load station data:", error);
    const display = $("entryStationName");
    if (display) {
      display.textContent = `Station file could not load. Check Live Server and the data/stations.json path.`;
    }
    const heading = $("selectedStationHeading");
    const meta = $("selectedStationMeta");
    if (heading) heading.textContent = "Station data unavailable";
    if (meta) meta.textContent = "Check data/stations.json and reopen index.html through Live Server.";
  }
}



function updateEntryStationName() {
  const input = $("entryStationCode");
  const display = $("entryStationName");

  if (!input || !display) return;

  const code = input.value.trim().toUpperCase();
  input.value = code;

  if (!code) {
    display.textContent = "Enter a station code.";
    return;
  }

  const station = stationRecords.find(record =>
    String(record.code ?? record.station_code ?? record.stationCode ?? "")
      .trim()
      .toUpperCase() === code
  );

  if (station) {
    const name =
      station.name ||
      station.station_name ||
      station.stationName;

    display.textContent = name
      ? `Station: ${name}`
      : "Station found, but its name is missing.";
  } else if (stationDataLoaded) {
    display.textContent = "Station code not found.";
  } else {
    display.textContent =
      "Station data unavailable. Open the project using Live Server.";
  }
}


let editingTrainId = null;
let editingRakeIndex = null;

// Add one manually entered train.
function selectedServiceDays() {
  return [...document.querySelectorAll('input[name="serviceDay"]:checked')].map(input => input.value);
}

function trainRunsOnDay(train, day) {
  const days = Array.isArray(train.serviceDays)
    ? train.serviceDays
    : String(train.serviceDays || "MON,TUE,WED,THU,FRI,SAT,SUN").split(",");
  return days.includes(day);
}

function saveManualTrains() {
  try {
    localStorage.setItem(TRAIN_STORAGE_KEY, JSON.stringify(trains));
  } catch (error) {
    console.warn("Could not save train records in this browser.", error);
  }
  if (window.platformFlowCloud) {
    window.platformFlowCloud.saveState({
      trains,
      rake_links: typeof readRakeSharingLinks === "function" ? readRakeSharingLinks() : []
    });
  }
}

async function restoreManualTrains() {
  let localSaved = [];
  try {
    const saved = JSON.parse(localStorage.getItem(TRAIN_STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) localSaved = saved;
  } catch (error) {
    console.warn("Local train records could not be restored.", error);
  }

  let cloudState = null;
  if (window.platformFlowCloud) {
    cloudState = await window.platformFlowCloud.loadState();
  }
  const selectedTrains = cloudState && Array.isArray(cloudState.trains) ? cloudState.trains : localSaved;
  trains.splice(0, trains.length, ...selectedTrains);
  nextTrainId = trains.reduce((max, train) => Math.max(max, Number(train.id) || 0), 0) + 1;

  if (cloudState) {
    try {
      localStorage.setItem(TRAIN_STORAGE_KEY, JSON.stringify(trains));
      localStorage.setItem(RAKE_SHARING_STORAGE_KEY, JSON.stringify(Array.isArray(cloudState.rake_links) ? cloudState.rake_links : []));
    } catch (error) {
      console.warn("Cloud data loaded, but local cache could not be updated.", error);
    }
  } else if (window.platformFlowCloud && (localSaved.length > 0)) {
    // Migrate existing browser-only train records into the signed-in user's cloud state.
    window.platformFlowCloud.saveState({ trains, rake_links: readRakeSharingLinks() });
  }
}

function applyHomePlan(event) {
  event.preventDefault();
  activePlanWindow = {
    day: $("planDay").value,
    start: $("planStartTime").value,
    end: $("planEndTime").value
  };
  if ($("startTime")) $("startTime").value = activePlanWindow.start;
  if ($("endTime")) $("endTime").value = activePlanWindow.end;
  calculateAllocations();
  renderAll();
  const count = trains.filter(train =>
    train.stationCode === getStationCode() &&
    trainRunsOnDay(train, activePlanWindow.day) &&
    (timeInWindow(train.expectedArrival, activePlanWindow.start, activePlanWindow.end) ||
     timeInWindow(train.scheduledArrival, activePlanWindow.start, activePlanWindow.end))
  ).length;
  setMessage("homePlanMessage", `${count} train(s) match ${activePlanWindow.day}, ${activePlanWindow.start}–${activePlanWindow.end}. Platform view is filtered to this plan window.`, "success");
}

function addTrain(event) {
  event.preventDefault();

  const stationCode = $("entryStationCode").value.trim().toUpperCase();
  const number = $("entryTrainNumber").value.trim();
  const name = $("entryTrainName").value.trim();
  const movement = $("entryMovementType").value;
  
if (!["originating", "intermediate", "destination"].includes(movement)) {
  setMessage("entryMessage", "Select a valid movement type.", "error");
  return;
}

  const arrival = $("entryArrival").value;
  const haltMinutes = Number($("entryHaltMinutes").value);
  const priority = $("entryPriority").value;
  const serviceDays = selectedServiceDays();

  if (!/^[A-Z0-9]{2,8}$/.test(stationCode)) {
    setMessage("entryMessage", "Enter a valid station code.", "error");
    return;
  }

  
if (!/^[0-9]{1,5}$/.test(number)) {
  setMessage(
    "entryMessage",
    "Invalid train number. Enter 1 to 5 digits only.",
    "error"
  );
  return;
}


  if (!name || name.length > 100) {
    setMessage("entryMessage", "Enter a train name up to 100 characters.", "error");
    return;
  }

  if (!Number.isFinite(toMinutes(arrival))) {
    setMessage("entryMessage", "Select a valid expected arrival time.", "error");
    return;
  }

  if (!Number.isInteger(haltMinutes) || haltMinutes < 1 || haltMinutes > 1440) {
    setMessage("entryMessage", "Occupancy must be from 1 to 1440 minutes.", "error");
    return;
  }

  if (serviceDays.length === 0) {
    setMessage("entryMessage", "Select at least one operating day.", "error");
    return;
  }

  if (!Object.hasOwn(priorityRank, priority)) {
    setMessage("entryMessage", "Select a valid priority.", "error");
    return;
  }

  const duplicate = trains.some(train =>
    train.id !== editingTrainId && train.stationCode === stationCode &&
    train.number.toLowerCase() === number.toLowerCase()
  );

  if (duplicate) {
    setMessage(
      "entryMessage",
      "This train number is already in the plan for this station.",
      "error"
    );
    return;
  }

  const trainRecord = {
    stationCode, number, name, movement, serviceDays,
    scheduledArrival: editingTrainId ? (trains.find(t => t.id === editingTrainId)?.scheduledArrival || arrival) : arrival,
    expectedArrival: arrival, haltMinutes, priority,
    delayMinutes: 0, delayReason: "", lastUpdated: null,
    proposedPlatform: null, approvedPlatform: null,
    approvalStatus: "Not calculated", conflict: false,
    estimatedEntry: null, status: "Planned"
  };
  if (editingTrainId !== null) {
    const index = trains.findIndex(t => t.id === editingTrainId);
    if (index < 0) { editingTrainId = null; setMessage("entryMessage", "Train record no longer exists. Please try again.", "error"); return; }
    trains[index] = { ...trains[index], ...trainRecord, id: editingTrainId, createdFromRakeLink: false };
    allocations.delete(editingTrainId);
    editingTrainId = null;
    const submit = $("trainEntryForm")?.querySelector('button[type="submit"]');
    if (submit) submit.textContent = "Add train to plan";
  } else {
    trains.push({ id: nextTrainId++, ...trainRecord });
  }

  saveManualTrains();
  $("entryTrainNumber").value = "";
  $("entryTrainName").value = "";
  $("entryHaltMinutes").value = "20";
  $("entryTrainNumber").focus();

  setMessage(
    "entryMessage",
    `${number} saved. Add more trains or predict platform allocation.`,
    "success"
  );

  renderAll();
}

// Remove a train and recalculate the plan.
function removeTrain(id) {
  const index = trains.findIndex(train => train.id === id);
  if (index === -1) return;

  const removed = trains.splice(index, 1)[0];
  allocations.delete(id);
  saveManualTrains();

  setMessage(
    "entryMessage",
    `Train ${removed.number} removed from the plan.`,
    "success"
  );

  calculateAllocations();
  renderAll();
}

// Absolute minute values allow trains to occupy a platform across midnight.
function makeIntervals(trainList) {
  return trainList.map(train => {
    const scheduled = toMinutes(train.scheduledArrival);
    const expected = toMinutes(train.expectedArrival);
    let arrival = expected;

    // If a revised time moves a train past midnight, keep its delay
    // relative to the original scheduled service.
    if (train.delayMinutes > 0) {
      arrival = scheduled + train.delayMinutes;
    } else if (expected < scheduled) {
      arrival = expected + 1440;
    }

    let start = arrival;
    let end = arrival + train.haltMinutes + PLATFORM_BUFFER_MINUTES;

    // For an originating service, the entered time represents its planned
    // departure: reserve the platform for the configured preparation window.
    if (train.movement === "originating") {
      start = arrival - ORIGINATING_ENTRY_MINUTES;
      end = arrival + PLATFORM_BUFFER_MINUTES;
    } else if (train.movement === "destination" || train.movement === "terminating") {
      // Destination services are planned to leave the platform for maintenance
      // after the configured station-clearance window, not a normal halt.
      end = arrival + DESTINATION_MAINTENANCE_MINUTES + PLATFORM_BUFFER_MINUTES;
    }

    return { train, start, end };
  });
}

function overlaps(startA, endA, startB, endB) {
  // Treat touching interval boundaries as a conflict. The configured clearance
  // buffer must finish before another service can reuse the same platform.
  // Example: a departure at 05:45 with a 5-minute buffer reserves the platform
  // through 05:50, so an arrival at exactly 05:50 cannot reuse it.
  return startA <= endB && startB <= endA;
}

function platformIsFree(platformNumber, candidate, assigned) {
  for (const item of assigned) {
    if (item.platform !== platformNumber) continue;

    if (overlaps(candidate.start, candidate.end, item.start, item.end)) {
      return false;
    }
  }

  return true;
}

// Find a feasible platform and, if needed, estimate the earliest
// time at which any platform might become free.
// Platform 6 is available to every train type, subject to the same occupancy,
// rake-sharing reservation, and clearance-gap checks as the other platforms.
function isHaltingTrain(train) {
  return train.movement !== "originating";
}

function usablePlatformsFor(train, platformCount) {
  return Array.from({ length: platformCount }, (_, index) => index + 1);
}

function preferredPlatformOrder(train, platformCount) {
  const all = usablePlatformsFor(train, platformCount);
  let preferred = [];
  if (train.movement === "originating") {
    preferred = all.slice(-Math.min(2, platformCount)).reverse();
  } else if (train.movement === "destination" || train.movement === "terminating") {
    preferred = all.slice(-Math.min(3, platformCount)).reverse();
  }
  return [...preferred, ...all.filter(platform => !preferred.includes(platform))];
}

// Find a feasible platform and estimate a later feasible entry when necessary.
function balancedPlatformOrder(train, platformCount, assigned) {
  const preferred = preferredPlatformOrder(train, platformCount);
  const preferredRank = new Map(preferred.map((platform, index) => [platform, index]));
  // Balance assignments across all usable platforms instead of filling P1 first.
  // Count continuous rake reservations too, so a reserved platform is not favoured.
  return usablePlatformsFor(train, platformCount).sort((a, b) => {
    const aItems = assigned.filter(item => item.platform === a);
    const bItems = assigned.filter(item => item.platform === b);
    const countDiff = aItems.length - bItems.length;
    if (countDiff) return countDiff;
    const aMinutes = aItems.reduce((sum, item) => sum + Math.max(0, item.end - item.start), 0);
    const bMinutes = bItems.reduce((sum, item) => sum + Math.max(0, item.end - item.start), 0);
    return aMinutes - bMinutes || (preferredRank.get(a) ?? a) - (preferredRank.get(b) ?? b);
  });
}

function findPlatform(candidate, platformCount, assigned) {
  const order = balancedPlatformOrder(candidate.train, platformCount, assigned);
  for (const platform of order) {
    if (platformIsFree(platform, candidate, assigned)) {
      return { platform, estimatedEntry: candidate.start, status: "Proposed" };
    }
  }

  const releaseTimes = [...new Set(
    assigned.filter(item => item.end >= candidate.start).map(item => item.end + 1)
  )].sort((a, b) => a - b);

  for (const start of releaseTimes) {
    // Shift the complete occupancy interval by the same amount. This preserves
    // originating/destination rules and the train's configured halt duration.
    const shiftBy = start - candidate.start;
    const shifted = {
      ...candidate,
      start,
      end: candidate.end + shiftBy
    };
    for (const platform of order) {
      if (platformIsFree(platform, shifted, assigned)) {
        return {
          platform,
          estimatedEntry: start,
          start: shifted.start,
          end: shifted.end,
          status: "Platform unavailable at planned time — delay expected",
          delayed: true,
          delayMinutes: start - candidate.start
        };
      }
    }
  }
  return { platform: null, estimatedEntry: null, status: "No feasible slot found" };
}

// Build continuous platform reservations for rake-sharing links before ordinary trains
// are allocated. A shared rake occupies its chosen platform from arrival until the
// departure time plus the configured clearance buffer.
function getRakeReservation(link) {
  const start = rakeMinutes(link.arrivalTime);
  let end = rakeMinutes(link.departureTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (end <= start) end += 1440;
  end += Math.max(10, Number(link.bufferMinutes) || 0);
  return { start, end };
}

function intervalConflictsWithReservation(candidate, reservation) {
  return [-1440, 0, 1440].some(offset =>
    overlaps(candidate.start, candidate.end, reservation.start + offset, reservation.end + offset)
  );
}

function applyRakeSharingPlatformLinks(stationCode, stationTrains, platformCount, assigned) {
  const links = readRakeSharingLinks();
  const handledTrainIds = new Set();
  const relevantLinks = links.filter(link => String(link.stationCode || '').trim().toUpperCase() === stationCode);

  for (const link of relevantLinks) {
    link.sharedPlatform = null;
    link.platformAssignmentStatus = 'Not assigned';
    const arriving = stationTrains.find(t => normalizeTrainNumber(t.number) === normalizeTrainNumber(link.arrivingNumber));
    const departing = stationTrains.find(t => normalizeTrainNumber(t.number) === normalizeTrainNumber(link.departingNumber));
    if (!arriving || !departing) {
      link.platformAssignmentStatus = 'Missing train record';
      continue;
    }
    handledTrainIds.add(arriving.id);
    handledTrainIds.add(departing.id);

    const reservation = getRakeReservation(link);
    if (!reservation) {
      arriving.conflict = departing.conflict = true;
      link.platformAssignmentStatus = 'Invalid rake-sharing times';
      continue;
    }

    const approvedPlatformA = Number(arriving.approvedPlatform) || null;
    const approvedPlatformD = Number(departing.approvedPlatform) || null;
    // Existing approvals are requests, not permission to split a shared rake.
    // The arrival's approved platform is preferred; if it is unavailable, a
    // feasible common platform is selected for both linked services.

    const requestedSharedPlatform = approvedPlatformA || approvedPlatformD;
    // Preserve an approved shared platform when feasible, but never let an old
    // approval force a conflict: try every other platform before declaring failure.
    const preferredOrder = preferredPlatformOrder(arriving, platformCount);
    const platformOrder = requestedSharedPlatform && requestedSharedPlatform >= 1 && requestedSharedPlatform <= platformCount
      ? [requestedSharedPlatform, ...preferredOrder.filter(p => p !== requestedSharedPlatform)]
      : preferredOrder;
    let chosen = null;
    for (const platform of platformOrder) {
      if (!Number.isInteger(platform) || platform < 1 || platform > platformCount) continue;
      const blockedByAssigned = assigned.some(item => item.platform === platform && intervalConflictsWithReservation(item, reservation));
      // Existing reservations include other rake links and ordinary train occupancy.
      if (!blockedByAssigned) { chosen = platform; break; }
    }

    if (chosen === null) {
      arriving.conflict = departing.conflict = true;
      arriving.proposedPlatform = departing.proposedPlatform = null;
      link.platformAssignmentStatus = 'No platform available — manual review required';
      allocations.set(arriving.id, { platform: approvedPlatformA, estimatedEntry: reservation.start, status: 'Rake conflict — no platform available', reason: 'No platform can remain continuously reserved for the complete rake-sharing interval.' });
      allocations.set(departing.id, { platform: approvedPlatformD, estimatedEntry: reservation.end, status: 'Rake conflict — no platform available', reason: 'No platform can remain continuously reserved for the complete rake-sharing interval.' });
      continue;
    }

    // Reserve the complete rake window, not just the arrival/departure events.
    assigned.push({ train: arriving, start: reservation.start, end: reservation.end, platform: chosen, rakeReservation: true, rakeId: link.rakeId });
    arriving.proposedPlatform = approvedPlatformA ? arriving.proposedPlatform : chosen;
    departing.proposedPlatform = approvedPlatformD ? departing.proposedPlatform : chosen;
    arriving.conflict = departing.conflict = false;
    allocations.set(arriving.id, {
      platform: chosen, estimatedEntry: reservation.start,
      status: approvedPlatformA ? 'Approved rake-sharing platform' : 'Rake-sharing platform reserved',
      reason: `Platform ${chosen} is reserved continuously for rake ${link.rakeId || ''} from ${link.arrivalTime} until ${link.departureTime} plus ${Math.max(10, Number(link.bufferMinutes) || 0)} minutes clearance.`
    });
    allocations.set(departing.id, {
      platform: chosen, estimatedEntry: reservation.end,
      status: approvedPlatformD ? 'Approved rake-sharing platform' : 'Same platform reserved for rake departure',
      reason: `Same platform as arriving train ${arriving.number}; the full rake-sharing window is reserved.`
    });
    link.sharedPlatform = chosen;
    link.platformAssignmentStatus = `Platform ${chosen} reserved continuously for both services`;
  }

  try { saveRakeSharingLinks(links); } catch (error) { console.warn('Could not persist rake-sharing platform status.', error); }
  return handledTrainIds;
}

// Allocation with priority ordering, balanced platform usage, and interval conflict checks.
// Rake reservations are placed first; conflicting approvals are reassigned when possible.
function calculateAllocations() {
  allocations.clear();
  const stationCodes = [...new Set(trains.map(train => train.stationCode))];

  for (const stationCode of stationCodes) {
    const platformCount = getPlatformCount(stationCode);
    const stationTrains = trains.filter(train => train.stationCode === stationCode);
    for (const train of stationTrains) {
      train.conflict = false;
      train.proposedPlatform = null;
      train.estimatedEntry = null;
      if (!train.approvedPlatform) train.approvalStatus = 'Not approved';
    }
    if (!platformCount) {
      for (const train of stationTrains) allocations.set(train.id, { platform: null, estimatedEntry: null, status: 'Unknown platform count', reason: `No platform count is available for ${stationCode}.` });
      continue;
    }

    const assigned = [];
    const rakeHandled = new Set();
    const rakeLinks = readRakeSharingLinks().filter(link => String(link.stationCode || '').trim().toUpperCase() === stationCode);
    const rakeTrainNumbers = new Set(rakeLinks.flatMap(link => [String(link.arrivingNumber), String(link.departingNumber)]));

    // Rake-sharing reservations have priority: reserve the complete interval first.
    // A previously approved ordinary train must not silently occupy that platform
    // during the shared-rake window; it is reassigned if another platform is free.
    for (const link of rakeLinks) {
      const a = stationTrains.find(t => String(t.number) === String(link.arrivingNumber));
      const d = stationTrains.find(t => String(t.number) === String(link.departingNumber));
      if (a && d) { rakeHandled.add(a.id); rakeHandled.add(d.id); }
    }
    const actuallyHandled = applyRakeSharingPlatformLinks(stationCode, stationTrains, platformCount, assigned);
    for (const id of actuallyHandled) rakeHandled.add(id);

    const approved = makeIntervals(stationTrains.filter(train => train.approvedPlatform && !rakeHandled.has(train.id)));
    approved.sort((a, b) => a.start - b.start);
    for (const candidate of approved) {
      const requested = Number(candidate.train.approvedPlatform);
      let chosen = null;
      if (requested >= 1 && requested <= platformCount && platformIsFree(requested, candidate, assigned)) {
        chosen = requested;
      } else {
        chosen = balancedPlatformOrder(candidate.train, platformCount, assigned)
          .find(platform => platformIsFree(platform, candidate, assigned)) ?? null;
      }
      if (chosen !== null) {
        assigned.push({ ...candidate, platform: chosen });
        const moved = chosen !== requested;
        candidate.train.proposedPlatform = chosen;
        candidate.train.conflict = false;
        allocations.set(candidate.train.id, {
          platform: chosen, estimatedEntry: candidate.start,
          status: moved ? 'Reassigned — approved platform conflicts' : 'Approved',
          reason: moved
            ? `Requested Platform ${requested} overlaps a continuous rake-sharing reservation or another train. Reassigned to Platform ${chosen} in this planning preview; station-master review is required.`
            : 'Station master approved this platform and no interval conflict was detected.'
        });
      } else {
        // Never retain an approval label for a platform that cannot be occupied
        // safely. Treat the requested platform as rejected, then run the normal
        // allocator so a feasible later slot can be proposed when one exists.
        candidate.train.approvedPlatform = null;
        candidate.train.approvalStatus = 'Conflict — approval cleared';
        candidate.train.conflict = true;
        const fallback = findPlatform(candidate, platformCount, assigned);
        if (fallback.platform !== null) {
          assigned.push({
            ...candidate,
            start: fallback.start ?? candidate.start,
            end: fallback.end ?? candidate.end,
            platform: fallback.platform
          });
          candidate.train.proposedPlatform = fallback.platform;
          candidate.train.estimatedEntry = fallback.estimatedEntry;
          candidate.train.conflict = false;
          allocations.set(candidate.train.id, {
            ...fallback,
            status: `Approval conflicted — ${fallback.status.toLowerCase()}`,
            reason: `The requested approved Platform ${requested} was not feasible because of an occupancy or clearance conflict. The approval was cleared. ${fallback.reason || `Platform ${fallback.platform} is the next feasible planning option.`}`
          });
        } else {
          allocations.set(candidate.train.id, {
            platform: null, estimatedEntry: candidate.start,
            status: 'No feasible platform — delay/manual review required',
            reason: `Approved Platform ${requested} conflicts with a rake reservation or another train. Approval was cleared; no feasible platform slot was found in the current planning window.`
          });
        }
      }
    }

    const unapproved = makeIntervals(stationTrains.filter(train => !train.approvedPlatform && !rakeHandled.has(train.id)));
    unapproved.sort((a, b) => priorityRank[b.train.priority] - priorityRank[a.train.priority] || a.start - b.start || a.train.id - b.train.id);
    for (const candidate of unapproved) {
      const result = findPlatform(candidate, platformCount, assigned);
      candidate.train.proposedPlatform = result.platform;
      candidate.train.estimatedEntry = result.estimatedEntry;
      if (result.platform !== null) {
        assigned.push({ ...candidate, start: result.start ?? candidate.start, end: result.end ?? candidate.end, platform: result.platform });
        candidate.train.conflict = false;
      } else {
        candidate.train.conflict = true;
      }
      allocations.set(candidate.train.id, {
        ...result,
        reason: result.platform !== null
          ? result.delayed
            ? `Platform unavailable at planned time ${formatTime(candidate.start)}. Estimated delay: ${result.delayMinutes ?? (result.estimatedEntry - candidate.start)} minutes; earliest feasible entry is ${formatTime(result.estimatedEntry)} on Platform ${result.platform}. The 10-minute clearance buffer and current train occupancy intervals were checked. Confirm the revised time before approval.`
            : 'Balanced platform selected without overlapping occupancy, rake reservations, or the minimum 10-minute clearance buffer.'
          : 'No feasible platform slot was found in the current plan; manual review is required.'
      });
    }
  }
  renderAll();
}

// Render the train-entry table.
function renderEntryTable() {
  const table = $("entryTrainTable");
  if (!table) return;

  const currentStation = getStationCode();
  const stationTrains = trains.filter(train =>
    String(train.stationCode || "").trim().toUpperCase() === currentStation
  );

  if (stationTrains.length === 0) {
    table.innerHTML = `
      <tr><td colspan="9" class="empty">No trains added for ${escapeHTML(currentStation)} yet. Select another station or add a train for this station.</td></tr>
    `;
    return;
  }

  table.innerHTML = stationTrains.map(train => `
    <tr>
      <td>${escapeHTML(train.number)}</td>
      <td>${escapeHTML(train.name)}</td>
      <td>${escapeHTML(train.stationCode)}</td>
      <td>${escapeHTML(movementLabel(train.movement))}</td>
      <td>${escapeHTML(train.expectedArrival)}</td>
      <td>${escapeHTML((Array.isArray(train.serviceDays) ? train.serviceDays : String(train.serviceDays || "MON,TUE,WED,THU,FRI,SAT,SUN").split(",")).join(", "))}</td>
      <td>${escapeHTML(formatDuration(train.haltMinutes))}</td>
      <td>${escapeHTML(priorityLabel[train.priority])}</td>
      <td>
        <button type="button" data-edit-train="${train.id}">Edit</button>
        <button type="button" data-remove-train="${train.id}">Remove</button>
      </td>
    </tr>
  `).join("");
}

// Render allocation recommendations and approval controls.
function renderAllocationTable() {
  const table = $("allocationTable");
  if (!table) return;

  const currentStation = getStationCode();
  const start = $("planStartTime")?.value || activePlanWindow.start;
  const end = $("planEndTime")?.value || activePlanWindow.end;
  const stationTrains = trains
    .filter(train => train.stationCode === currentStation)
    .filter(train => trainRunsOnDay(train, activePlanWindow.day))
    .filter(train =>
      timeInWindow(train.expectedArrival, start, end) ||
      timeInWindow(train.scheduledArrival, start, end)
    )
    .sort((a, b) => toMinutes(a.expectedArrival) - toMinutes(b.expectedArrival));

  // Rake links are reviewed here too, but they do not automatically assign a
  // platform or represent authority to move a train.
  const rakeLinks = readRakeSharingLinks()
    .map((link, index) => ({ ...link, _index: index }))
    .filter(link => String(link.stationCode || "").toUpperCase() === currentStation)
    .filter(link => timeInWindow(link.arrivalTime, start, end) || timeInWindow(link.departureTime, start, end));

  const trainRows = stationTrains.map(train => {
    const allocation = allocations.get(train.id);
    if (!allocation) return `<tr><td>${escapeHTML(train.number)} — ${escapeHTML(train.name)}</td><td>${escapeHTML(train.expectedArrival)}</td><td>—</td><td>—</td><td>${escapeHTML(priorityLabel[train.priority])}</td><td>Not calculated</td><td>—</td></tr>`;

    const platformCount = getPlatformCount(train.stationCode) || 0;
    const selectedPlatform = train.approvedPlatform ?? train.proposedPlatform ?? "";
    const platformOptions = Array.from({ length: platformCount }, (_, index) => {
      const platform = index + 1;
      return `<option value="${platform}" ${Number(selectedPlatform) === platform ? "selected" : ""}>Platform ${platform}</option>`;
    }).join("");
    const entryText = allocation.estimatedEntry === null ? "Unknown" : formatTime(allocation.estimatedEntry);
    const status = train.rejected ? "Rejected — revise proposal" : train.conflict ? "Conflict — review" : allocation.status;
    const action = train.approvedPlatform
      ? `<div class="approval-actions approved-actions"><span class="approval-result">Approved: Platform ${train.approvedPlatform}</span><button type="button" class="reopen-button" data-unapprove="${train.id}" aria-label="Reopen approval for train ${escapeHTML(train.number)}">↺ Reopen</button></div>`
      : platformCount
        ? `<select aria-label="Platform for train ${escapeHTML(train.number)}" data-platform-choice="${train.id}"><option value="">Choose platform</option>${platformOptions}</select><div class="approval-actions"><button type="button" class="approve-button" data-approve="${train.id}" aria-label="Approve train ${escapeHTML(train.number)}">✓ Approve</button><button type="button" class="reject-button" data-reject="${train.id}" aria-label="Do not approve train ${escapeHTML(train.number)}">✕ Not Approve</button></div>`
        : "Platform count unavailable";
    return `<tr><td>${escapeHTML(train.number)} — ${escapeHTML(train.name)}</td><td>${escapeHTML(train.expectedArrival)}</td><td>${escapeHTML(entryText)}</td><td>${allocation.platform ? `Platform ${allocation.platform}` : "No platform assigned"}</td><td>${escapeHTML(priorityLabel[train.priority])}</td><td>${escapeHTML(status)}</td><td>${action}</td></tr>`;
  });

  const rakeRows = rakeLinks.map(link => {
    const approved = link.stationMasterReviewed === true;
    const windowText = formatRakeWindow(link.arrivalTime, link.departureTime);
    const buffer = Number(link.bufferMinutes || 0);
    const enoughTime = Number.isFinite(rakeMinutes(link.arrivalTime)) && Number.isFinite(rakeMinutes(link.departureTime)) && (rakeMinutes(link.departureTime) - rakeMinutes(link.arrivalTime) + 1440) % 1440 >= buffer;
    const status = link.stationMasterReviewStatus === "Flagged for verification" ? "Flagged for verification" : approved ? "Rake link reviewed" : enoughTime ? "Awaiting station-master review" : "Buffer check required";
    const action = approved
      ? `<div class="approval-actions approved-actions"><span class="approval-result">Reviewed</span><button type="button" class="reopen-button" data-unreview-rake="${link._index}">↺ Reopen</button></div>`
      : `<div class="approval-actions"><button type="button" class="approve-button" data-review-rake="${link._index}">✓ Review link</button><button type="button" class="reject-button" data-reject-rake="${link._index}">✕ Flag for verification</button></div>`;
    // Show the independently allocated platform for each service, if that train
    // has been added to this station plan. A rake link itself never assigns one.
    const arrivingTrain = stationTrains.find(train => normalizeTrainNumber(train.number) === normalizeTrainNumber(link.arrivingNumber));
    const departingTrain = stationTrains.find(train => normalizeTrainNumber(train.number) === normalizeTrainNumber(link.departingNumber));
    const arrivingAllocation = arrivingTrain ? allocations.get(arrivingTrain.id) : null;
    const departingAllocation = departingTrain ? allocations.get(departingTrain.id) : null;
    const arrivingPlatform = arrivingTrain?.approvedPlatform ?? arrivingAllocation?.platform ?? null;
    const departingPlatform = departingTrain?.approvedPlatform ?? departingAllocation?.platform ?? null;
    const assignedSharedPlatform = link.sharedPlatform || null;
    const platformDetails = `Arriving: ${arrivingPlatform ? `Platform ${arrivingPlatform}` : "Not assigned"}<br>Departing: ${assignedSharedPlatform ? `Platform ${assignedSharedPlatform}` : departingPlatform ? `Platform ${departingPlatform}` : "Not assigned"}`;
    const assignmentStatus = link.platformAssignmentStatus || "Not assigned";
    return `<tr class="rake-approval-row"><td>Rake link: ${escapeHTML(link.arrivingNumber)} → ${escapeHTML(link.departingNumber)}<br><small>Rake ${escapeHTML(link.rakeId)}</small></td><td>${escapeHTML(link.arrivalTime)} → ${escapeHTML(link.departureTime)}</td><td>${escapeHTML(windowText)}</td><td>${platformDetails}</td><td>—</td><td>${escapeHTML(status)}<br><small>${escapeHTML(assignmentStatus)} · Buffer: ${escapeHTML(buffer)} min. Verify official details.</small></td><td>${action}</td></tr>`;
  });

  const rows = [...trainRows, ...rakeRows];
  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="7" class="empty">No trains or rake-sharing links match ${escapeHTML(currentStation)}, ${escapeHTML(activePlanWindow.day)}, ${escapeHTML(start)}–${escapeHTML(end)}. Change the station/time window or add planning records.</td></tr>`;
    return;
  }
  table.innerHTML = rows.join("");
}

// Search the current plan by station and expected arrival window.
function timeInWindow(time, start, end) {
  const value = toMinutes(time);
  const first = toMinutes(start);
  const last = toMinutes(end);

  if (![value, first, last].every(Number.isFinite)) return false;

  return first <= last
    ? value >= first && value <= last
    : value >= first || value <= last;
}

function renderTrains() {
  const stationCode = getStationCode();
  if ($("stationCode")) $("stationCode").value = stationCode;
  const start = $("startTime").value;
  const end = $("endTime").value;

  const results = trains
    .filter(train => String(train.stationCode || "").trim().toUpperCase() === stationCode)
    .filter(train => trainRunsOnDay(train, activePlanWindow.day))
    .filter(train =>
      timeInWindow(train.scheduledArrival, start, end) ||
      timeInWindow(train.expectedArrival, start, end)
    )
    .sort((a, b) =>
      toMinutes(a.expectedArrival) - toMinutes(b.expectedArrival)
    );

  // Dashboard metrics must use the same station, operating-day, and time-window
  // filters as the train list, otherwise yesterday's/other-day delays remain visible.
  const stationTrains = results;
  $("trainCount").textContent = results.length;

  $("delayCount").textContent = results.filter(
    train => Number(train.delayMinutes) > 0
  ).length;

  const platformCount = getPlatformCount(stationCode);
  $("availableCount").textContent = platformCount === null
    ? "—"
    : platformCount;

  $("conflictCount").textContent = results.filter(
    train => train.conflict
  ).length;

  $("searchMessage").textContent =
    `${results.length} train(s) found for ${stationCode} in the selected time window.`;

  const table = $("trainTable");

  if (results.length === 0) {
    table.innerHTML = `
      <tr><td colspan="8" class="empty">No trains match this station and time window.</td></tr>
    `;
    return;
  }

  table.innerHTML = results.map(train => {
    const allocation = allocations.get(train.id);
    const platform = allocation?.platform ?? null;
    const timeValue = toMinutes(train.expectedArrival);
    const releaseMinutes = train.movement === "originating"
      ? timeValue
      : train.movement === "destination" || train.movement === "terminating"
        ? timeValue + DESTINATION_MAINTENANCE_MINUTES
        : timeValue + train.haltMinutes;
    const releaseText = Number.isFinite(releaseMinutes) ? formatTime(releaseMinutes) : "—";
    return `
      <tr>
        <td>${escapeHTML(train.number)}</td>
        <td>${escapeHTML(train.name)}</td>
        <td>${escapeHTML(train.scheduledArrival)}</td>
        <td>${escapeHTML(train.expectedArrival)}</td>
        <td>${escapeHTML(releaseText)}</td>
        <td>${platform ? `Platform ${platform}` : "Not allocated"}</td>
        <td>${train.delayMinutes > 0 ? `${train.delayMinutes} min late` : "On schedule"}</td>
        <td>${escapeHTML(movementLabel(train.movement))}</td>
      </tr>
    `;
  }).join("");
}

function renderAll() {
  renderEntryTable();
  renderAllocationTable();
  renderTrains();
  renderDashboardStation();
  renderPlatformVisual();
}

// Manually update a train's revised expected arrival.
function updateDelay(event) {
  event.preventDefault();

  const number = $("delayTrainNumber").value.trim().toLowerCase();
  const revisedArrival = $("revisedArrival").value;
  const reason = $("delayReason").value.trim();

  if (!Number.isFinite(toMinutes(revisedArrival))) {
    setMessage("delayMessage", "Enter a valid revised arrival time.", "error");
    return;
  }

  const matches = trains.filter(
    train => train.number.toLowerCase() === number
  );

  if (matches.length === 0) {
    setMessage(
      "delayMessage",
      "Train not found. Add it in the Train Entry section first.",
      "error"
    );
    return;
  }

  if (matches.length > 1) {
    setMessage(
      "delayMessage",
      "This train number exists at multiple stations. Use a unique train number or select a station-specific record.",
      "error"
    );
    return;
  }

  const train = matches[0];
  const scheduled = toMinutes(train.scheduledArrival);
  const revised = toMinutes(revisedArrival);

  // This prototype uses same-service-day delay calculations.
  // Overnight service handling needs a dated timetable.
  const delayMinutes = revised - scheduled;

  train.expectedArrival = revisedArrival;
  train.delayMinutes = Math.max(0, delayMinutes);
  train.delayReason = reason;
  train.lastUpdated = new Date().toLocaleString();
  train.approvedPlatform = null;
  train.approvalStatus = "Recalculation required";

  $("delayForm").reset();

  setMessage(
    "delayMessage",
    `Train ${train.number} updated. ${train.delayMinutes} minute(s) of delay recorded. Recalculating proposed allocations.`,
    "success"
  );

  saveManualTrains();
  calculateAllocations();
  renderAll();
}

// Station-master approval. Validate the new assignment against
// every other approved or proposed interval before accepting it.
function approvePlatform(id) {
  const train = trains.find(item => item.id === id);
  const select = document.querySelector(`[data-platform-choice="${id}"]`);

  if (!train || !select || !select.value) {
    setMessage("approvalMessage", "Choose a platform first.", "error");
    return;
  }

  const platform = Number(select.value);
  const platformCount = getPlatformCount(train.stationCode);

  if (!platformCount || platform < 1 || platform > platformCount) {
    setMessage("approvalMessage", "Invalid platform selection.", "error");
    return;
  }

  // Approval must validate the interval the planner actually proposes, not
  // the original scheduled interval when the allocation has a delayed entry.
  // Otherwise a feasible platform can be rejected using the old 03:50 time
  // even though the displayed estimated entry is later (for example 04:11).
  const candidate = makeIntervals([train])[0];
  const candidateAllocation = allocations.get(train.id);
  if (candidateAllocation && Number.isFinite(candidateAllocation.estimatedEntry)) {
    const shift = candidateAllocation.estimatedEntry - candidate.start;
    candidate.start += shift;
    candidate.end += shift;
  }

  // Only trains operating on the selected planning day can block this approval.
  // Without this filter, a train that runs on another weekday can falsely block
  // a platform and make the Approve button appear broken.
  const otherIntervals = makeIntervals(
    trains.filter(item =>
      item.id !== id &&
      item.stationCode === train.stationCode &&
      trainRunsOnDay(item, activePlanWindow.day)
    )
  ).map(item => {
    const otherAllocation = allocations.get(item.train.id);
    if (otherAllocation && Number.isFinite(otherAllocation.estimatedEntry)) {
      const shift = otherAllocation.estimatedEntry - item.start;
      item.start += shift;
      item.end += shift;
    }
    return item;
  });

  // Approved assignments are fixed. Other proposals can be recalculated
  // if the station master changes this train's platform.
  const collision = otherIntervals.find(item => {
    const existingAllocation = allocations.get(item.train.id);
    // The current calculated allocation is authoritative. An older approvedPlatform
    // value can be stale after the planner has reassigned a conflict.
    const otherPlatform = existingAllocation?.platform ?? item.train.approvedPlatform;

    return item.train.stationCode === train.stationCode &&
      Number(otherPlatform) === platform &&
      overlaps(candidate.start, candidate.end, item.start, item.end);
  });

  // A rake-sharing link reserves the entire platform continuously between
  // arrival and departure, not only at the two service timestamps. Include
  // those reservations in the final Station Master approval guard as well.
  const rakeCollision = readRakeSharingLinks().some(link => {
    if (String(link.stationCode || "").trim().toUpperCase() !== train.stationCode) return false;
    const linkedNumbers = [String(link.arrivingNumber), String(link.departingNumber)];
    // An incomplete rake link is a data-quality warning, not a valid platform
    // reservation. It must not block unrelated trains until both records exist.
    const arrivingRecord = trains.find(item => item.stationCode === train.stationCode && String(item.number) === linkedNumbers[0]);
    const departingRecord = trains.find(item => item.stationCode === train.stationCode && String(item.number) === linkedNumbers[1]);
    if (!arrivingRecord || !departingRecord) return false;
    const reservation = getRakeReservation(link);
    if (!reservation) return false;
    // The two linked services are assigned together by the rake-sharing rule;
    // approval must not permit an unrelated train to occupy their platform.
    const linkedTrain = linkedNumbers.includes(String(train.number));
    if (linkedTrain) {
      const otherLinkedNumber = linkedNumbers.find(number => number !== String(train.number));
      const otherLinked = trains.find(item => item.stationCode === train.stationCode && String(item.number) === otherLinkedNumber);
      const otherLinkedAllocation = otherLinked ? allocations.get(otherLinked.id) : null;
      const sharedPlatform = link.sharedPlatform ?? otherLinked?.approvedPlatform ?? otherLinkedAllocation?.platform;
      if (Number(sharedPlatform) !== platform) return true;
      return false;
    }
    return intervalConflictsWithReservation(candidate, reservation) &&
      Number(link.sharedPlatform) === platform;
  });

  if (collision || rakeCollision) {
    setMessage(
      "approvalMessage",
      rakeCollision
        ? `Rake-sharing conflict: Platform ${platform} is reserved continuously for a shared rake or this train must use the same platform as its linked service. Choose a feasible platform.`
        : `Conflict detected: Platform ${platform} overlaps ${collision.train.number} — ${collision.train.name} on ${activePlanWindow.day}. Choose another platform or recalculate the plan.`,
      "error"
    );
    return;
  }

  // Store the requested platform, then run the same full allocation engine used
  // by the timetable and platform visual. That engine is the final authority:
  // it may clear an approval if a continuous rake reservation or occupancy
  // interval makes the selected platform infeasible.
  train.approvedPlatform = platform;
  train.proposedPlatform = platform;
  train.approvalStatus = "Approved";
  train.rejected = false;
  saveManualTrains();

  calculateAllocations();
  renderAll();

  const finalAllocation = allocations.get(train.id);
  if (Number(train.approvedPlatform) === platform && Number(finalAllocation?.platform) === platform) {
    setMessage(
      "approvalMessage",
      `Platform ${platform} approved for train ${train.number}. The timetable and platform view have been refreshed.`,
      "success"
    );
  } else {
    const actual = finalAllocation?.platform;
    const detail = finalAllocation?.reason || finalAllocation?.status || "The selected platform failed the final occupancy check.";
    setMessage(
      "approvalMessage",
      `Platform ${platform} was not approved for train ${train.number}. ${detail}${actual ? ` Current feasible suggestion: Platform ${actual}, entry ${formatTime(finalAllocation.estimatedEntry)}.` : " No feasible platform was found in the current planning window."}`,
      "error"
    );
  }
}

function renderStationOptions() {
  const select = $("mainStationSelect");
  if (!select) return;

  if (!stationDataLoaded || stationRecords.length === 0) {
    select.innerHTML = '<option value="">Station list unavailable — check data/stations.json</option>';
    const heading = $("selectedStationHeading");
    const meta = $("selectedStationMeta");
    if (heading) heading.textContent = "Station data unavailable";
    if (meta) meta.textContent = "Check that data/stations.json is beside index.html and open this page using Live Server.";
    return;
  }

  const current = select.value || "BZA";
  const records = [...stationRecords].sort((a, b) =>
    String(a.name || a.station_name || "").localeCompare(String(b.name || b.station_name || ""))
  );
  select.innerHTML = records.map(station => {
    const code = String(station.code ?? station.station_code ?? station.stationCode ?? "").trim().toUpperCase();
    const name = station.name ?? station.station_name ?? station.stationName ?? code;
    const count = getPlatformCount(code);
    return `<option value="${escapeHTML(code)}">${escapeHTML(code)} — ${escapeHTML(name)} (${count ?? "?"} platforms)</option>`;
  }).join("");
  select.value = records.some(station => String(station.code ?? station.station_code ?? station.stationCode ?? "").trim().toUpperCase() === current) ? current : (records.some(station => String(station.code ?? station.station_code ?? station.stationCode ?? "").trim().toUpperCase() === "BZA") ? "BZA" : String(records[0].code ?? records[0].station_code ?? ""));
  syncSelectedStation(select.value);
}

function syncSelectedStation(code) {
  const normalized = String(code || "BZA").trim().toUpperCase();
  if ($("mainStationSelect") && $("mainStationSelect").value !== normalized) $("mainStationSelect").value = normalized;
  if ($("entryStationCode")) $("entryStationCode").value = normalized;
  if ($("stationCode")) $("stationCode").value = normalized;
  updateEntryStationName();
  renderAll();
}

function renderDashboardStation() {
  const code = getStationCode();
  const station = stationRecords.find(item => String(item.code ?? item.station_code ?? "").toUpperCase() === code);
  const name = station?.name ?? station?.station_name ?? code;
  const count = getPlatformCount(code);
  if ($("selectedStationHeading")) $("selectedStationHeading").textContent = `${name} (${code})`;
  if ($("selectedStationMeta")) $("selectedStationMeta").textContent = count
    ? `${count} configured platforms · shared selection across dashboard sections`
    : "Platform count unavailable in station data.";
  if ($("availableCount")) $("availableCount").textContent = count ?? "—";
  if ($("platformCountNote")) $("platformCountNote").textContent =
    station?.data_status === "needs_verification"
      ? "Dataset value · verify against official records"
      : "Configured count from station data";
}

function renderPlatformVisual() {
  const target = $("platformVisual");
  if (!target) return;
  const code = getStationCode();
  const count = getPlatformCount(code);
  if (!count) {
    target.innerHTML = '<p class="empty-state">Platform count is not available for this station.</p>';
    return;
  }
  const stationTrains = trains
    .filter(train => train.stationCode === code)
    .filter(train => trainRunsOnDay(train, activePlanWindow.day))
    .filter(train => timeInWindow(train.expectedArrival, activePlanWindow.start, activePlanWindow.end) ||
                     timeInWindow(train.scheduledArrival, activePlanWindow.start, activePlanWindow.end));
  const lanes = Array.from({ length: count }, (_, index) => {
    const platform = index + 1;
    const assignedTrains = stationTrains.filter(train => {
      const allocation = allocations.get(train.id);
      // An unfeasible approved platform is only a request, not an actual allocation.
      // Do not draw that train on the old platform when allocation.platform is null.
      // The calculated allocation is authoritative. An old approval must not
      // draw a train on a platform if conflict resolution cleared/reassigned it.
      const actualPlatform = allocation?.platform ?? null;
      return actualPlatform === platform;
    });
    const conflict = assignedTrains.some(train => train.conflict);
    const label = assignedTrains.length
      ? assignedTrains.map(train => `${train.number} · ${train.expectedArrival}`).join(" / ")
      : "No train assigned in current plan";
    const fullDetails = assignedTrains.length
      ? `<details class="platform-train-details"><summary>View all ${assignedTrains.length} train(s)</summary><ul>${assignedTrains.slice().sort((a,b) => toMinutes(a.expectedArrival)-toMinutes(b.expectedArrival)).map(train => `<li><strong>${escapeHTML(train.number)}</strong> — ${escapeHTML(train.name || train.trainName || "Name not entered")} <span>${escapeHTML(train.expectedArrival || train.scheduledArrival || "—")}</span></li>`).join("")}</ul></details>`
      : "";
    return `<div class="platform-lane ${assignedTrains.length ? "occupied" : "free"} ${conflict ? "has-conflict" : ""}">
      <div class="platform-number">P${platform}</div>
      <div class="track-line">${"<span class=\"track-sleeper\"></span>".repeat(10)}${assignedTrains.length ? `<span class="track-train" aria-label="Train on platform">🚆</span>` : ""}</div>
      <div class="platform-status-wrap"><div class="platform-status" title="${escapeHTML(label)}">${escapeHTML(label)}</div>${fullDetails}</div>
      <span class="lane-badge">${assignedTrains.length ? (conflict ? "Review" : `${assignedTrains.length} planned`) : "Available in plan"}</span>
    </div>`;
  }).join("");
  const windowStart = $("planStartTime")?.value || activePlanWindow.start;
  const windowEnd = $("planEndTime")?.value || activePlanWindow.end;
  const visibleRakeLinks = readRakeSharingLinks()
    .filter(link => String(link.stationCode || "").toUpperCase() === code)
    .filter(link => timeInWindow(link.arrivalTime, windowStart, windowEnd) || timeInWindow(link.departureTime, windowStart, windowEnd));
  const rakePanel = visibleRakeLinks.length
    ? `<div class="rake-visual-links"><div class="rake-visual-heading">RAKE-SHARING LINKS IN THIS WINDOW</div>${visibleRakeLinks.map(link => {
        const arrivingTrain = trains.find(train => train.stationCode === code && String(train.number) === String(link.arrivingNumber));
        const departingTrain = trains.find(train => train.stationCode === code && String(train.number) === String(link.departingNumber));
        const arrivingAllocation = arrivingTrain ? allocations.get(arrivingTrain.id) : null;
        const departingAllocation = departingTrain ? allocations.get(departingTrain.id) : null;
        const arrivingPlatform = arrivingTrain?.approvedPlatform ?? arrivingAllocation?.platform ?? null;
        const departingPlatform = link.sharedPlatform ?? departingTrain?.approvedPlatform ?? departingAllocation?.platform ?? null;
        return `<div class="rake-visual-link"><strong>${escapeHTML(link.arrivingNumber)} → ${escapeHTML(link.departingNumber)}</strong><span>Rake ${escapeHTML(link.rakeId || "—")}</span><span>${escapeHTML(link.arrivalTime)} → ${escapeHTML(link.departureTime)}</span><span>Arriving: ${arrivingPlatform ? `Platform ${arrivingPlatform}` : "Not assigned"}</span><span>Departing: ${departingPlatform ? `Platform ${departingPlatform}` : "Not assigned"}</span><span>${escapeHTML(link.platformAssignmentStatus || "Awaiting allocation")}</span></div>`;
      }).join("")}</div>`
    : `<div class="rake-visual-links"><div class="rake-visual-heading">RAKE-SHARING LINKS</div><p>No rake-sharing links match this station and time window.</p></div>`;
  const upcoming = stationTrains.slice().sort((a,b) => toMinutes(a.expectedArrival) - toMinutes(b.expectedArrival)).slice(0, 5);
  const arrivalPanel = `<aside class="arrival-board"><div class="arrival-board-head"><span class="arrival-live-dot"></span><strong>NEXT ARRIVALS</strong><span class="arrival-live-label">PLAN LIVE</span></div>${upcoming.length ? upcoming.map((train, index) => {
    const allocation = allocations.get(train.id);
    const platform = allocation?.platform ?? null;
    const isNext = index === 0;
    return `<div class="arrival-row ${isNext ? "arrival-row-next" : ""}"><span class="arrival-train-icon" aria-hidden="true">🚆</span><strong>${escapeHTML(train.number)}</strong><span>${escapeHTML(train.expectedArrival || train.scheduledArrival || "—")}</span><span class="arrival-state">${isNext ? "Next train" : "Scheduled"}</span><b>${platform ? `P${platform}` : "P—"}</b></div>`;
  }).join("") : `<p class="arrival-empty">Add trains to preview the next arrivals.</p>`}<div class="arrival-board-foot">Planning preview · not connected to live railway feeds</div></aside>`;
  target.innerHTML = `<div class="station-scene"><div class="station-photo-wash"></div><div class="station-skyline"><span><span class="scene-live-dot"></span> LIVE-STYLE PLATFORM VIEW</span><span>${count} platforms · ${stationTrains.length} planned services</span></div><div class="platform-lanes">${lanes}</div><div class="platform-scene-bottom">${arrivalPanel}${rakePanel}</div></div>`;
}

function renderTrainLookup(event) {
  event.preventDefault();
  const number = $("lookupTrainNumber").value.trim().toLowerCase();
  const result = $("trainLookupResult");
  const code = getStationCode();
  const train = trains.find(item => item.number.toLowerCase() === number && item.stationCode === code);
  if (!train) {
    result.className = "lookup-result empty-state";
    result.textContent = `Train ${number} was not found in the manually entered plan for ${code}. Add it once in Train Management; live timetable lookup is not connected.`;
    return;
  }
  const allocation = allocations.get(train.id);
  const platform = allocation?.platform ?? null;
  let movementNote;
  if (train.movement === "originating") {
    movementNote = `Planned departure: ${train.expectedArrival}. Target platform entry: ${formatTime(toMinutes(train.expectedArrival) - ORIGINATING_ENTRY_MINUTES)} (30 min before departure).`;
  } else if (train.movement === "destination") {
    movementNote = `Estimated maintenance movement: ${formatTime(toMinutes(train.expectedArrival) + DESTINATION_MAINTENANCE_MINUTES)} (20 min after entered arrival).`;
  } else {
    movementNote = `Estimated occupancy duration: ${train.haltMinutes} minutes, plus a ${PLATFORM_BUFFER_MINUTES}-minute planning buffer.`;
  }
  result.className = "lookup-result";
  result.innerHTML = `<div class="lookup-top"><div><span class="eyebrow">TRAIN FOUND</span><h3>${escapeHTML(train.number)} — ${escapeHTML(train.name)}</h3></div><span class="status-chip">${escapeHTML(movementLabel(train.movement))}</span></div>
    <div class="lookup-facts"><div><small>Station</small><strong>${escapeHTML(code)}</strong></div><div><small>Expected time</small><strong>${escapeHTML(train.expectedArrival)}</strong></div><div><small>Suggested platform</small><strong>${platform ? `Platform ${platform}` : "Not assigned"}</strong></div><div><small>Delay</small><strong>${train.delayMinutes ? `${train.delayMinutes} min` : "No recorded delay"}</strong></div><div><small>Operating days</small><strong>${escapeHTML((Array.isArray(train.serviceDays) ? train.serviceDays : String(train.serviceDays || "MON,TUE,WED,THU,FRI,SAT,SUN").split(",")).join(", "))}</strong></div></div>
    <p class="movement-note">${escapeHTML(movementNote)}</p>`;
}

// Event delegation keeps controls working after table rerenders.
document.addEventListener("click", event => {
  const target = event.target;
  const viewLink = target.closest("[data-view-link]");
  if (viewLink) {
    const view = viewLink.dataset.viewLink;
    document.querySelectorAll("[data-view]").forEach(section => section.classList.toggle("active", section.dataset.view === view));
    document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.viewLink === view));
    if (view === "station-master") renderAllocationTable();
    if (view === "timetable") renderTrains();
  }
  const editTrainButton = target.closest("[data-edit-train]");
  if (editTrainButton) {
    const train = trains.find(item => item.id === Number(editTrainButton.dataset.editTrain));
    if (train) {
      editingTrainId = train.id;
      $("entryStationCode").value = train.stationCode;
      $("entryTrainNumber").value = train.number;
      $("entryTrainName").value = train.name;
      $("entryMovementType").value = train.movement;
      $("entryArrival").value = train.expectedArrival || train.scheduledArrival;
      $("entryHaltMinutes").value = train.haltMinutes;
      $("entryPriority").value = train.priority;
      const days = Array.isArray(train.serviceDays) ? train.serviceDays : String(train.serviceDays || "").split(",");
      document.querySelectorAll('input[name="serviceDay"]').forEach(input => input.checked = days.includes(input.value));
      const submit = $("trainEntryForm")?.querySelector('button[type="submit"]');
      if (submit) submit.textContent = "Save train changes";
      setMessage("entryMessage", `Editing train ${train.number}. Change the fields and click Save train changes.`, "success");
      $("trainEntryForm")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  const removeButton = target.closest("[data-remove-train]");
  const approveButton = target.closest("[data-approve]");
  const rejectButton = target.closest("[data-reject]");
  const reopenButton = target.closest("[data-unapprove]");
  const reviewRakeButton = target.closest("[data-review-rake]");
  const rejectRakeButton = target.closest("[data-reject-rake]");
  const unreviewRakeButton = target.closest("[data-unreview-rake]");
  if (reviewRakeButton || rejectRakeButton || unreviewRakeButton) {
    const index = Number((reviewRakeButton || rejectRakeButton || unreviewRakeButton).dataset.reviewRake ?? (reviewRakeButton || rejectRakeButton || unreviewRakeButton).dataset.rejectRake ?? (reviewRakeButton || rejectRakeButton || unreviewRakeButton).dataset.unreviewRake);
    const links = readRakeSharingLinks();
    if (Number.isInteger(index) && index >= 0 && index < links.length) {
      if (reviewRakeButton) {
        links[index].stationMasterReviewed = true;
        links[index].stationMasterReviewStatus = "Reviewed — details still require official verification";
      } else if (rejectRakeButton) {
        links[index].stationMasterReviewed = false;
        links[index].stationMasterReviewStatus = "Flagged for verification";
      } else {
        links[index].stationMasterReviewed = false;
        links[index].stationMasterReviewStatus = "Awaiting station-master review";
      }
      saveRakeSharingLinks(links);
      renderRakeSharingLinks();
      renderAllocationTable();
      setMessage("approvalMessage", reviewRakeButton ? "Rake-sharing link marked as reviewed. This does not approve a platform or authorize train movement." : rejectRakeButton ? "Rake-sharing link flagged for verification." : "Rake-sharing link returned to review.", "success");
    }
  }
  if (removeButton) removeTrain(Number(removeButton.dataset.removeTrain));
  if (approveButton) approvePlatform(Number(approveButton.dataset.approve));
  if (rejectButton) {
    const train = trains.find(item => item.id === Number(rejectButton.dataset.reject));
    if (train) {
      train.approvedPlatform = null;
      train.approvalStatus = "Rejected — revise proposal";
      train.rejected = true;
      saveManualTrains();
      calculateAllocations();
      setMessage("approvalMessage", `Proposal for train ${train.number} rejected. Review the revised recommendation.`, "success");
    }
  }
  if (reopenButton) {
    const train = trains.find(item => item.id === Number(reopenButton.dataset.unapprove));
    if (train) {
      train.approvedPlatform = null;
      train.approvalStatus = "Not approved";
      saveManualTrains();
      calculateAllocations();
      renderAllocationTable();
    }
  }
});

$("trainEntryForm")?.addEventListener("submit", addTrain);
$("homePlanForm")?.addEventListener("submit", applyHomePlan);
$("entryStationCode")?.addEventListener("input", () => {
  const code = $("entryStationCode").value.trim().toUpperCase();
  const station = stationRecords.find(item =>
    String(item.code ?? item.station_code ?? item.stationCode ?? "").trim().toUpperCase() === code
  );
  if (station) {
    syncSelectedStation(code);
  } else {
    updateEntryStationName();
  }
});
$("mainStationSelect")?.addEventListener("change", event => syncSelectedStation(event.target.value));

$("allocatePlatformsButton")?.addEventListener("click", () => {
  if (trains.length === 0) {
    setMessage("allocationMessage", "Add at least one train first.", "error");
    return;
  }
  calculateAllocations();
  setMessage("allocationMessage", "Allocation calculated. Review the suggested platforms and approve feasible assignments.", "success");
});



// Rake-sharing links are illustrative planning records stored in this browser.
const RAKE_SHARING_STORAGE_KEY = "platformflow.rakeSharingLinks.v1";
function normalizeTrainNumber(value) {
  return String(value ?? "").trim().replace(/\s+/g, "").replace(/^0+(?=\d)/, "");
}
function readRakeSharingLinks() {
  try {
    const saved = JSON.parse(localStorage.getItem(RAKE_SHARING_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Could not read rake-sharing links:", error);
    return [];
  }
}
function saveRakeSharingLinks(links) {
  localStorage.setItem(RAKE_SHARING_STORAGE_KEY, JSON.stringify(links));
  if (window.platformFlowCloud) {
    window.platformFlowCloud.saveState({ trains, rake_links: links });
  }
}

// Repair older saved rake links on startup: a link may exist in localStorage
// without the matching departure train record (the issue shown in the user's screenshot).
function ensureRakeDepartureRecords() {
  const links = readRakeSharingLinks();
  let changed = false;
  for (const link of links) {
    const code = String(link.stationCode || "").trim().toUpperCase();
    const number = String(link.departingNumber || "").trim();
    if (!code || !number) continue;
    let departureTrain = trains.find(train =>
      String(train.stationCode || "").trim().toUpperCase() === code &&
      normalizeTrainNumber(train.number) === normalizeTrainNumber(number)
    );
    // A matching train number may have been saved under a different station code
    // by an earlier form submission. For this link, correct that record's station.
    if (!departureTrain) {
      departureTrain = trains.find(train => normalizeTrainNumber(train.number) === normalizeTrainNumber(number));
      if (departureTrain) {
        departureTrain.stationCode = code;
        changed = true;
      }
    }
    if (departureTrain) continue;

    const arrivingTrain = trains.find(train =>
      String(train.stationCode || "").trim().toUpperCase() === code &&
      normalizeTrainNumber(train.number) === normalizeTrainNumber(link.arrivingNumber)
    );
    const inheritedDays = arrivingTrain
      ? (Array.isArray(arrivingTrain.serviceDays) ? [...arrivingTrain.serviceDays] : String(arrivingTrain.serviceDays || "MON,TUE,WED,THU,FRI,SAT,SUN").split(","))
      : ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    departureTrain = {
      id: nextTrainId++, stationCode: code, number,
      name: String(link.departingName || `Rake-sharing departure ${number}`),
      movement: "originating", serviceDays: inheritedDays,
      scheduledArrival: String(link.departureTime || "06:30"),
      expectedArrival: String(link.departureTime || "06:30"),
      haltMinutes: 5, priority: arrivingTrain?.priority || "normal",
      delayMinutes: 0, delayReason: "", lastUpdated: null,
      proposedPlatform: null, approvedPlatform: null, approvalStatus: "Not approved",
      conflict: false, estimatedEntry: null,
      status: "Planned from rake-sharing link", createdFromRakeLink: true
    };
    trains.push(departureTrain);
    changed = true;
  }
  if (changed) saveManualTrains();
}
function rakeMinutes(time) {
  const parts = String(time || "").split(":").map(Number);
  return parts.length === 2 && parts.every(Number.isFinite) ? parts[0] * 60 + parts[1] : NaN;
}
function formatRakeWindow(arrival, departure) {
  let minutes = rakeMinutes(departure) - rakeMinutes(arrival);
  if (!Number.isFinite(minutes)) return "—";
  if (minutes < 0) minutes += 1440;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
function renderRakeSharingLinks() {
  const tbody = $("rakeSharingTable");
  if (!tbody) return;
  const links = readRakeSharingLinks();
  if (!links.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">No rake-sharing links saved yet. Use the form above to add one.</td></tr>';
    return;
  }
  tbody.innerHTML = links.map((link, index) => `<tr>
    <td><strong>${escapeHTML(link.arrivingNumber)}</strong> — ${escapeHTML(link.arrivingName)}</td>
    <td>${escapeHTML(link.stationCode)} · ${escapeHTML(link.arrivalTime)}</td>
    <td><strong>${escapeHTML(link.departingNumber)}</strong> — ${escapeHTML(link.departingName)}</td>
    <td>${escapeHTML(link.departureTime)}</td>
    <td>${escapeHTML(formatRakeWindow(link.arrivalTime, link.departureTime))}</td>
    <td>${escapeHTML(link.rakeId)}</td>
    <td><span class="rake-status">${escapeHTML(link.stationMasterReviewStatus || "Saved · verify details")}</span></td>
    <td><button type="button" class="rake-edit-button" data-edit-rake="${index}">Edit</button> <button type="button" class="rake-delete-button" data-delete-rake="${index}">Delete</button></td>
  </tr>`).join("");
}
$("rakeSharingForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const arrivalTime = $("rakeArrivalTime").value;
  const departureTime = $("rakeDepartureTime").value;
  const buffer = Number($("rakeBufferMinutes").value);
  if (!arrivalTime || !departureTime || !Number.isInteger(buffer) || buffer < 0 || buffer > 360) {
    setMessage("rakeSharingMessage", "Enter valid times and a buffer from 0 to 360 minutes.", "error");
    return;
  }
  const links = readRakeSharingLinks();
  const rakeRecord = {
    arrivingNumber: $("rakeArrivingTrain").value.trim(),
    arrivingName: $("rakeArrivingName").value.trim(),
    stationCode: $("rakeStationCode").value.trim().toUpperCase(),
    arrivalTime,
    departingNumber: $("rakeDepartingTrain").value.trim(),
    departingName: $("rakeDepartingName").value.trim(),
    departureTime,
    rakeId: $("rakeId").value.trim(),
    bufferMinutes: buffer,
    savedAt: new Date().toISOString()
  };
  if (editingRakeIndex !== null && links[editingRakeIndex]) {
    links[editingRakeIndex] = { ...links[editingRakeIndex], ...rakeRecord, stationMasterReviewed: false, stationMasterReviewStatus: "Edited — verify details" };
  } else {
    links.push(rakeRecord);
  }
  try {
    const link = editingRakeIndex !== null ? links[editingRakeIndex] : links[links.length - 1];
    const arrivingTrain = trains.find(train => train.stationCode === link.stationCode && String(train.number) === String(link.arrivingNumber));
    let departingTrain = trains.find(train => train.stationCode === link.stationCode && String(train.number) === String(link.departingNumber));
    if (!departingTrain && link.departingNumber) {
      const days = arrivingTrain ? [...(Array.isArray(arrivingTrain.serviceDays) ? arrivingTrain.serviceDays : String(arrivingTrain.serviceDays || "MON,TUE,WED,THU,FRI,SAT,SUN").split(","))] : ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
      departingTrain = {
        id: nextTrainId++, stationCode: link.stationCode, number: String(link.departingNumber),
        name: link.departingName || `Rake-sharing departure ${link.departingNumber}`, movement: "originating",
        serviceDays: days, scheduledArrival: link.departureTime, expectedArrival: link.departureTime,
        haltMinutes: 5, priority: arrivingTrain?.priority || "normal", delayMinutes: 0, delayReason: "",
        lastUpdated: null, proposedPlatform: null, approvedPlatform: null, approvalStatus: "Not approved",
        conflict: false, estimatedEntry: null, status: "Planned from rake-sharing link", createdFromRakeLink: true
      };
      trains.push(departingTrain);
      saveManualTrains();
    }
    saveRakeSharingLinks(links);
    editingRakeIndex = null;
    const rakeSubmit = $("rakeSharingForm")?.querySelector('button[type="submit"]');
    if (rakeSubmit) rakeSubmit.textContent = "Save rake-sharing link";
    calculateAllocations();
    renderRakeSharingLinks();
    renderAllocationTable();
    renderPlatformVisual();
    setMessage("rakeSharingMessage", `Saved rake-sharing link: ${links[links.length - 1].arrivingNumber} → ${links[links.length - 1].departingNumber}. Verify the rake ID and timetable before use.`, "success");
    event.target.reset();
    $("rakeStationCode").value = "TPTY";
    $("rakeArrivalTime").value = "04:05";
    $("rakeDepartureTime").value = "06:30";
    $("rakeBufferMinutes").value = "20";
  } catch (error) {
    setMessage("rakeSharingMessage", "Could not save the link in this browser. Check browser storage settings.", "error");
  }
});
document.addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit-rake]");
  if (editButton) {
    const index = Number(editButton.dataset.editRake);
    const link = readRakeSharingLinks()[index];
    if (!link) return;
    editingRakeIndex = index;
    $("rakeArrivingTrain").value = link.arrivingNumber || "";
    $("rakeArrivingName").value = link.arrivingName || "";
    $("rakeStationCode").value = link.stationCode || getStationCode();
    $("rakeArrivalTime").value = link.arrivalTime || "";
    $("rakeDepartingTrain").value = link.departingNumber || "";
    $("rakeDepartingName").value = link.departingName || "";
    $("rakeDepartureTime").value = link.departureTime || "";
    $("rakeId").value = link.rakeId || "";
    $("rakeBufferMinutes").value = link.bufferMinutes ?? 20;
    const submit = $("rakeSharingForm")?.querySelector('button[type="submit"]');
    if (submit) submit.textContent = "Save rake-sharing changes";
    setMessage("rakeSharingMessage", `Editing rake link ${link.arrivingNumber} → ${link.departingNumber}. Save to apply changes.`, "success");
    $("rakeSharingForm")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const button = event.target.closest("[data-delete-rake]");
  if (!button) return;
  const index = Number(button.dataset.deleteRake);
  const links = readRakeSharingLinks();
  if (!Number.isInteger(index) || index < 0 || index >= links.length) return;
  links.splice(index, 1);
  saveRakeSharingLinks(links);
  renderRakeSharingLinks();
  renderAllocationTable();
  renderPlatformVisual();
  setMessage("rakeSharingMessage", "Rake-sharing link deleted.", "success");
});

$("delayForm")?.addEventListener("submit", updateDelay);
$("trainLookupForm")?.addEventListener("submit", renderTrainLookup);
$("searchForm")?.addEventListener("submit", event => {
  event.preventDefault();
  syncSelectedStation($("stationCode").value.trim().toUpperCase());
  renderTrains();
});

loadStations().then(async () => {
  await restoreManualTrains();
  ensureRakeDepartureRecords();
  calculateAllocations();
  renderStationOptions();
  updateEntryStationName();
  renderAll();
  renderRakeSharingLinks();
  setMessage(
    "allocationMessage",
    stationDataLoaded
      ? `Loaded ${stationRecords.length} station records. Add trains and calculate the allocation.`
      : "Using built-in demonstration platform counts. Check data/stations.json if counts are incorrect.",
    "success"
  );
});
