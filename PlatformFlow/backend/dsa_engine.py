"""
PlatformFlow - Data Structures & Algorithms (DSA) Engine
Provides core algorithms:
1. Hash Maps (O(1) lookups & Inverted Search Indices)
2. Timetable Sorting (O(N log N))
3. Interval-Overlap Detection & Midnight Window Handling
4. Min-Heap Event Queue (O(N log K) chronological simulation)
5. Greedy Platform Allocation & Interval Coloring
6. Conflict Detection & Avoidable Delay Computation
"""

import heapq
from typing import List, Dict, Any, Optional, Tuple, Set


# ---------------------------------------------------------------------------
# 1. Time & Interval Utilities with Midnight Handling
# ---------------------------------------------------------------------------

def time_to_minutes(time_str: Optional[str]) -> int:
    """
    Convert 'HH:MM' string to minutes from midnight (0 to 1439).
    Returns -1 if time_str is None or invalid.
    """
    if not time_str or ":" not in time_str:
        return -1
    try:
        parts = time_str.strip().split(":")
        h = int(parts[0])
        m = int(parts[1])
        return (h % 24) * 60 + (m % 60)
    except (ValueError, IndexError):
        return -1


def minutes_to_time(minutes: int) -> str:
    """Convert minutes (can be >= 1440 or negative) into normalized 'HH:MM' string."""
    m_normalized = minutes % 1440
    if m_normalized < 0:
        m_normalized += 1440
    h = m_normalized // 60
    m = m_normalized % 60
    return f"{h:02d}:{m:02d}"


def is_overnight_window(start_time: str, end_time: str) -> bool:
    """Check if window crosses midnight (e.g., 22:00 to 04:00)."""
    s = time_to_minutes(start_time)
    e = time_to_minutes(end_time)
    if s == -1 or e == -1:
        return False
    return s > e


def time_falls_in_window(time_str: Optional[str], start_str: str, end_str: str) -> bool:
    """
    Check if a specific time point falls within [start_str, end_str].
    Correctly handles windows crossing midnight (e.g. 22:00 -> 04:00).
    """
    t = time_to_minutes(time_str)
    s = time_to_minutes(start_str)
    e = time_to_minutes(end_str)
    if t == -1 or s == -1 or e == -1:
        return False

    if s <= e:
        # Same day window, e.g., 08:00 to 16:00
        return s <= t <= e
    else:
        # Overnight window, e.g., 22:00 to 04:00 (spans midnight)
        return t >= s or t <= e


def interval_intersects_window(
    arr_str: Optional[str],
    dep_str: Optional[str],
    window_start: str,
    window_end: str
) -> bool:
    """
    Determine whether a train's occupancy interval [arr, dep] intersects the query window.
    Accurately handles:
    - Trains crossing midnight (e.g., arr 23:50, dep 00:20)
    - Windows crossing midnight (e.g., window 21:00 to 03:00)
    - Originating trains (arr is None) or Terminating trains (dep is None)
    """
    w_start = time_to_minutes(window_start)
    w_end = time_to_minutes(window_end)
    if w_start == -1 or w_end == -1:
        return True

    arr_m = time_to_minutes(arr_str)
    dep_m = time_to_minutes(dep_str)

    # Handle Originating train (no arrival, only departure)
    if arr_m == -1 and dep_m != -1:
        arr_m = dep_m
    # Handle Terminating train (no departure, only arrival)
    if dep_m == -1 and arr_m != -1:
        dep_m = arr_m

    if arr_m == -1 and dep_m == -1:
        return False

    # Adjust if train crosses midnight (e.g., arr 23:50, dep 00:30)
    train_crosses_midnight = dep_m < arr_m

    # Windows on same day
    if w_start <= w_end:
        if not train_crosses_midnight:
            # Both train and window are same-day intervals
            return max(arr_m, w_start) <= min(dep_m, w_end)
        else:
            # Train spans midnight: Part 1: [arr_m, 1439], Part 2: [0, dep_m]
            part1_overlap = max(arr_m, w_start) <= min(1439, w_end)
            part2_overlap = max(0, w_start) <= min(dep_m, w_end)
            return part1_overlap or part2_overlap
    else:
        # Overnight window [w_start, 1439] U [0, w_end]
        if not train_crosses_midnight:
            partA_overlap = max(arr_m, w_start) <= min(dep_m, 1439)
            partB_overlap = max(arr_m, 0) <= min(dep_m, w_end)
            return partA_overlap or partB_overlap
        else:
            # Both train and window cross midnight -> guaranteed intersection around 00:00!
            return True


def check_interval_overlap(
    start1: int, end1: int,
    start2: int, end2: int,
    buffer_minutes: int = 10
) -> Tuple[bool, int]:
    """
    Check if two continuous minute intervals [start1, end1 + buffer] and [start2, end2 + buffer] overlap.
    Returns (has_overlap, overlap_duration_in_minutes).
    Condition: max(start1, start2) < min(end1 + buffer, end2 + buffer)
    """
    eff_end1 = end1 + buffer_minutes
    eff_end2 = end2 + buffer_minutes

    overlap_start = max(start1, start2)
    overlap_end = min(eff_end1, eff_end2)

    if overlap_start < overlap_end:
        return True, (overlap_end - overlap_start)
    return False, 0


# ---------------------------------------------------------------------------
# 2. Hash Maps & Inverted Search Index
# ---------------------------------------------------------------------------

class InvertedSearchIndex:
    """
    Inverted search index for sub-millisecond search over stations and trains.
    Supports prefix matching, token-based matching, and code exact match.
    """
    def __init__(self):
        self.station_code_map: Dict[str, Dict[str, Any]] = {}
        self.station_tokens: Dict[str, Set[str]] = {}
        self.train_number_map: Dict[str, Dict[str, Any]] = {}
        self.train_tokens: Dict[str, Set[str]] = {}

    def index_station(self, station: Dict[str, Any]):
        code = station["code"].upper()
        self.station_code_map[code] = station

        # Tokenize code, name, state, zone
        text = f"{code} {station['name']} {station.get('zone', '')} {station.get('state', '')}".lower()
        tokens = set(text.replace("-", " ").replace(".", " ").split())
        for token in tokens:
            if token not in self.station_tokens:
                self.station_tokens[token] = set()
            self.station_tokens[token].add(code)

    def index_train(self, train: Dict[str, Any]):
        num = train["train_number"].strip()
        self.train_number_map[num] = train

        text = f"{num} {train['train_name']} {train.get('train_type', '')} {train.get('source_code', '')} {train.get('dest_code', '')}".lower()
        tokens = set(text.replace("-", " ").replace(".", " ").split())
        for token in tokens:
            if token not in self.train_tokens:
                self.train_tokens[token] = set()
            self.train_tokens[token].add(num)

    def search_stations(self, query: str, limit: int = 15) -> List[Dict[str, Any]]:
        q = query.strip().upper()
        if not q:
            return list(self.station_code_map.values())[:limit]

        # 1. Exact or prefix match on station code -> highest priority
        matched_codes: List[str] = []
        if q in self.station_code_map:
            matched_codes.append(q)

        for code in self.station_code_map:
            if code.startswith(q) and code not in matched_codes:
                matched_codes.append(code)

        # 2. Substring match on station name
        q_lower = query.strip().lower()
        for code, st in self.station_code_map.items():
            if code not in matched_codes and (q_lower in st["name"].lower() or q_lower in st.get("state", "").lower()):
                matched_codes.append(code)

        return [self.station_code_map[c] for c in matched_codes[:limit]]

    def search_trains(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        q = query.strip()
        if not q:
            return list(self.train_number_map.values())[:limit]

        matched_nums: List[str] = []
        # Exact match
        if q in self.train_number_map:
            matched_nums.append(q)

        # Prefix number match
        for num in self.train_number_map:
            if num.startswith(q) and num not in matched_nums:
                matched_nums.append(num)

        # Substring name match
        q_lower = q.lower()
        for num, tr in self.train_number_map.items():
            if num not in matched_nums and (q_lower in tr["train_name"].lower() or q_lower in tr.get("train_type", "").lower()):
                matched_nums.append(num)

        return [self.train_number_map[n] for n in matched_nums[:limit]]


# ---------------------------------------------------------------------------
# 3. Min-Heap Event Queue for Discrete Railway Simulation
# ---------------------------------------------------------------------------

class MinHeapEventQueue:
    """
    Min-Heap Priority Queue for chronological railway event processing.
    Time complexity: O(log K) for push and pop operations.
    Maintains simulated real-time station platform occupancies.
    """
    def __init__(self):
        self._heap: List[Tuple[int, int, str, Dict[str, Any]]] = []
        self._counter: int = 0  # Tie-breaker for equal timestamps

    def push(self, event_time_minutes: int, event_type: str, data: Dict[str, Any]):
        """Push an event: event_type can be 'ARRIVAL' (0) or 'DEPARTURE' (1)."""
        type_priority = 0 if event_type == "ARRIVAL" else 1
        self._counter += 1
        heapq.heappush(self._heap, (event_time_minutes, type_priority, self._counter, data))

    def pop(self) -> Optional[Dict[str, Any]]:
        """Pop the earliest event from the min-heap."""
        if not self._heap:
            return None
        t, prio, _, data = heapq.heappop(self._heap)
        data["event_time"] = t
        return data

    def peek_time(self) -> Optional[int]:
        if not self._heap:
            return None
        return self._heap[0][0]

    def is_empty(self) -> bool:
        return len(self._heap) == 0

    def __len__(self):
        return len(self._heap)


# ---------------------------------------------------------------------------
# 4. Greedy Platform Allocation & Interval Coloring Algorithm
# ---------------------------------------------------------------------------

class GreedyPlatformAllocator:
    """
    Greedy Interval Scheduling & Allocation Engine for Railway Platforms.
    
    Mathematical Formulation:
    - Given N trains with occupancy intervals [arr_i, dep_i] and coach requirements C_i.
    - Given K platforms with capacity Cap_k, track type T_k, and minimum safety headway H.
    - Objective: Assign each train i to a feasible platform P(i) in {1..K} such that:
        1. Cap_{P(i)} >= C_i (Platform Length Constraint)
        2. For any two trains i, j on the same platform:
           arr_j >= dep_i + H  (Safety Headway Buffer)
        3. P(i) == Preferred(i) if feasible, else assign earliest available platform.
    
    Complexity:
    - Time: O(N log N) sorting + O(N * K) allocation checks
    - Space: O(N + K) auxiliary storage
    """

    def __init__(
        self,
        platform_count: int,
        platform_capacities: Optional[Dict[int, int]] = None,
        headway_buffer_minutes: int = 10
    ):
        self.platform_count = platform_count
        self.buffer = headway_buffer_minutes
        self.capacities = platform_capacities or {p: 24 for p in range(1, platform_count + 1)}

    def allocate(
        self,
        train_intervals: List[Dict[str, Any]],
        manual_overrides: Optional[Dict[str, int]] = None
    ) -> Dict[str, Any]:
        """
        Allocate platforms for a batch of trains.
        train_intervals dict format:
        {
            "train_number": str,
            "train_name": str,
            "train_type": str,
            "start_minutes": int,
            "end_minutes": int,
            "coaches": int,
            "preferred_platform": Optional[int],
            "role": str
        }
        """
        overrides = manual_overrides or {}

        # 1. Sort by arrival time (O(N log N))
        sorted_trains = sorted(train_intervals, key=lambda x: (x["start_minutes"], x["end_minutes"]))

        # Platform tracking: platform_id -> List of assigned intervals
        platform_assignments: Dict[int, List[Dict[str, Any]]] = {
            p: [] for p in range(1, self.platform_count + 1)
        }
        conflicts: List[Dict[str, Any]] = []
        assigned_results: List[Dict[str, Any]] = []

        for train in sorted_trains:
            t_num = train["train_number"]
            s_min = train["start_minutes"]
            e_min = train["end_minutes"]
            coaches = train.get("coaches", 22)
            preferred = train.get("preferred_platform")

            # Check manual override first
            if t_num in overrides:
                chosen_p = overrides[t_num]
                # Check if this override creates a conflict
                conflict_found, overlap_dur, overlapping_train = self._check_platform_conflict(
                    platform_assignments[chosen_p], s_min, e_min
                )
                if conflict_found:
                    conflict_id = f"CONF-{t_num}-{chosen_p}"
                    conf = {
                        "conflict_id": conflict_id,
                        "platform_number": chosen_p,
                        "train_a_number": overlapping_train["train_number"],
                        "train_a_name": overlapping_train["train_name"],
                        "train_a_interval": f"{minutes_to_time(overlapping_train['start_minutes'])} - {minutes_to_time(overlapping_train['end_minutes'])}",
                        "train_b_number": t_num,
                        "train_b_name": train["train_name"],
                        "train_b_interval": f"{minutes_to_time(s_min)} - {minutes_to_time(e_min)}",
                        "overlap_duration_minutes": overlap_dur,
                        "conflict_type": "DIRECT_COLLISION" if overlap_dur > self.buffer else "HEADWAY_VIOLATION",
                        "severity": "CRITICAL" if overlap_dur > self.buffer else "WARNING",
                        "resolution_suggestion": f"Manual override forced on Platform {chosen_p}. Recommend moving {t_num} to an alternative open platform."
                    }
                    conflicts.append(conf)

                assigned_record = dict(train)
                assigned_record["platform"] = chosen_p
                assigned_record["has_conflict"] = conflict_found
                platform_assignments[chosen_p].append(assigned_record)
                assigned_results.append(assigned_record)
                continue

            # Check if preferred platform is available and compatible
            assigned_platform = None
            if preferred and 1 <= preferred <= self.platform_count:
                if self.capacities.get(preferred, 24) >= coaches:
                    has_conf, _, _ = self._check_platform_conflict(
                        platform_assignments[preferred], s_min, e_min
                    )
                    if not has_conf:
                        assigned_platform = preferred

            # Greedy scan: find earliest feasible platform without conflict
            if assigned_platform is None:
                for p in range(1, self.platform_count + 1):
                    if self.capacities.get(p, 24) < coaches:
                        continue  # Train too long for this platform

                    has_conf, _, _ = self._check_platform_conflict(
                        platform_assignments[p], s_min, e_min
                    )
                    if not has_conf:
                        assigned_platform = p
                        break

            # If all platforms conflict, pick the platform with minimum conflict duration
            if assigned_platform is None:
                best_p = 1
                min_overlap = float("inf")
                worst_conf_data = None

                for p in range(1, self.platform_count + 1):
                    if self.capacities.get(p, 24) < coaches:
                        continue
                    has_conf, overlap_dur, other_tr = self._check_platform_conflict(
                        platform_assignments[p], s_min, e_min
                    )
                    if overlap_dur < min_overlap:
                        min_overlap = overlap_dur
                        best_p = p
                        worst_conf_data = (other_tr, overlap_dur)

                assigned_platform = best_p
                if worst_conf_data:
                    other_tr, overlap_dur = worst_conf_data
                    conflict_id = f"CONF-{t_num}-P{assigned_platform}"
                    conf = {
                        "conflict_id": conflict_id,
                        "platform_number": assigned_platform,
                        "train_a_number": other_tr["train_number"],
                        "train_a_name": other_tr["train_name"],
                        "train_a_interval": f"{minutes_to_time(other_tr['start_minutes'])} - {minutes_to_time(other_tr['end_minutes'])}",
                        "train_b_number": t_num,
                        "train_b_name": train["train_name"],
                        "train_b_interval": f"{minutes_to_time(s_min)} - {minutes_to_time(e_min)}",
                        "overlap_duration_minutes": overlap_dur,
                        "conflict_type": "DIRECT_COLLISION" if overlap_dur > self.buffer else "HEADWAY_VIOLATION",
                        "severity": "CRITICAL" if overlap_dur > self.buffer else "WARNING",
                        "resolution_suggestion": f"Platform congestion at P{assigned_platform}. Hold {t_num} at home signal or adjust halt duration."
                    }
                    conflicts.append(conf)

            assigned_record = dict(train)
            assigned_record["platform"] = assigned_platform
            assigned_record["has_conflict"] = any(
                c["train_b_number"] == t_num or c["train_a_number"] == t_num for c in conflicts
            )
            platform_assignments[assigned_platform].append(assigned_record)
            assigned_results.append(assigned_record)

        # Build timelines
        timelines = []
        for p in range(1, self.platform_count + 1):
            occ_list = []
            for item in platform_assignments[p]:
                occ_list.append({
                    "train_number": item["train_number"],
                    "train_name": item["train_name"],
                    "train_type": item["train_type"],
                    "platform": p,
                    "start_minutes": item["start_minutes"],
                    "end_minutes": item["end_minutes"],
                    "start_time_str": minutes_to_time(item["start_minutes"]),
                    "end_time_str": minutes_to_time(item["end_minutes"]),
                    "role": item.get("role", "Intermediate halt"),
                    "coaches": item.get("coaches", 22),
                    "has_conflict": item.get("has_conflict", False)
                })
            timelines.append({
                "platform_number": p,
                "length_coaches": self.capacities.get(p, 24),
                "track_type": "Main line" if p in (1, 2) else "Loop line",
                "occupancies": occ_list
            })

        return {
            "assigned_trains": assigned_results,
            "timelines": timelines,
            "conflicts": conflicts
        }

    def _check_platform_conflict(
        self,
        assigned_list: List[Dict[str, Any]],
        start_min: int,
        end_min: int
    ) -> Tuple[bool, int, Optional[Dict[str, Any]]]:
        """Check if [start_min, end_min] overlaps with any already assigned train on this platform."""
        for tr in assigned_list:
            has_overlap, dur = check_interval_overlap(
                tr["start_minutes"], tr["end_minutes"],
                start_min, end_min,
                self.buffer
            )
            if has_overlap:
                return True, dur, tr
        return False, 0, None


# ---------------------------------------------------------------------------
# 5. Avoidable Waiting Analysis
# ---------------------------------------------------------------------------

def calculate_avoidable_waiting(
    baseline_conflicts: List[Dict[str, Any]],
    optimized_conflicts: List[Dict[str, Any]],
    total_trains: int
) -> Dict[str, Any]:
    """
    Compute estimated avoidable waiting minutes based on conflict resolution.
    Assumptions:
    - Each direct collision requires holding a train at outer signal for overlap_duration + 5 min safety clearance.
    - Each headway violation requires caution aspect travel costing ~6 min holding.
    - Resolving conflicts via intelligent platform reallocation recovers these wasted operational minutes.
    """
    baseline_delay = 0
    for c in baseline_conflicts:
        dur = c.get("overlap_duration_minutes", 15)
        if c.get("conflict_type") == "DIRECT_COLLISION":
            baseline_delay += (dur + 5)
        else:
            baseline_delay += max(6, dur)

    optimized_delay = 0
    for c in optimized_conflicts:
        dur = c.get("overlap_duration_minutes", 15)
        if c.get("conflict_type") == "DIRECT_COLLISION":
            optimized_delay += (dur + 5)
        else:
            optimized_delay += max(6, dur)

    minutes_saved = max(0, baseline_delay - optimized_delay)
    resolved_count = max(0, len(baseline_conflicts) - len(optimized_conflicts))

    return {
        "baseline_conflict_count": len(baseline_conflicts),
        "optimized_conflict_count": len(optimized_conflicts),
        "conflicts_resolved": resolved_count,
        "baseline_waiting_minutes": baseline_delay,
        "optimized_waiting_minutes": optimized_delay,
        "estimated_minutes_saved": minutes_saved,
        "assumptions": (
            "Model estimates avoidable holding time based on a standard 10-minute headway clearance buffer. "
            "Trains held outside home signals under collision warnings incur overlap duration + 5 min restart caution. "
            "Real-world dispatch depends on yard interlocking, points configuration, and signal aspect status."
        )
    }
