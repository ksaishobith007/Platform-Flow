"""
PlatformFlow - DSA Unit Tests
Tests:
1. Time conversion and normalization
2. Midnight window intersection logic
3. Interval overlap condition with buffer
4. Min-Heap event queue
5. Greedy platform allocator (capacity, headway buffer, fallback preference)
6. Graph BFS & DFS algorithms
"""

import pytest
from backend.dsa_engine import (
    time_to_minutes, minutes_to_time, is_overnight_window,
    time_falls_in_window, interval_intersects_window,
    check_interval_overlap, InvertedSearchIndex,
    MinHeapEventQueue, GreedyPlatformAllocator, calculate_avoidable_waiting
)
from backend.graph_engine import RailwayGraph


def test_time_conversions():
    assert time_to_minutes("00:00") == 0
    assert time_to_minutes("01:30") == 90
    assert time_to_minutes("12:00") == 720
    assert time_to_minutes("23:59") == 1439
    assert time_to_minutes(None) == -1
    assert time_to_minutes("invalid") == -1

    assert minutes_to_time(0) == "00:00"
    assert minutes_to_time(90) == "01:30"
    assert minutes_to_time(1440) == "00:00"
    assert minutes_to_time(1470) == "00:30"


def test_overnight_window_detection():
    # Normal same-day window
    assert not is_overnight_window("08:00", "16:00")
    assert not is_overnight_window("10:00", "10:00")

    # Overnight windows crossing midnight
    assert is_overnight_window("22:00", "04:00")
    assert is_overnight_window("23:30", "01:00")


def test_time_falls_in_window_midnight():
    # Normal window
    assert time_falls_in_window("12:00", "10:00", "14:00")
    assert not time_falls_in_window("09:59", "10:00", "14:00")

    # Midnight crossing window: 22:00 to 04:00
    assert time_falls_in_window("23:30", "22:00", "04:00")
    assert time_falls_in_window("00:15", "22:00", "04:00")
    assert time_falls_in_window("03:59", "22:00", "04:00")
    assert not time_falls_in_window("05:00", "22:00", "04:00")
    assert not time_falls_in_window("21:59", "22:00", "04:00")


def test_interval_intersects_window_midnight():
    # Train arriving 23:50 and departing 00:20 (crosses midnight)
    # Window A: 23:00 to 02:00 (crosses midnight) -> must intersect
    assert interval_intersects_window("23:50", "00:20", "23:00", "02:00")

    # Window B: 23:00 to 23:55 (before midnight) -> must intersect (overlap 23:50 to 23:55)
    assert interval_intersects_window("23:50", "00:20", "23:00", "23:55")

    # Window C: 00:10 to 01:00 (after midnight) -> must intersect (overlap 00:10 to 00:20)
    assert interval_intersects_window("23:50", "00:20", "00:10", "01:00")

    # Window D: 10:00 to 12:00 (completely outside) -> must NOT intersect
    assert not interval_intersects_window("23:50", "00:20", "10:00", "12:00")


def test_interval_overlap_detection():
    # Train 1: 10:00 (600) to 10:30 (630)
    # Train 2: 10:25 (625) to 11:00 (660)
    # Buffer: 10 minutes
    # Overlap occurs
    has_overlap, dur = check_interval_overlap(600, 630, 625, 660, buffer_minutes=10)
    assert has_overlap
    assert dur > 0

    # Train 1: 10:00 (600) to 10:30 (630)
    # Train 3: 10:45 (645) to 11:15 (675)
    # With 10 min buffer: Train 1 clears at 640. Train 3 arrives at 645 -> No overlap!
    has_overlap, dur = check_interval_overlap(600, 630, 645, 675, buffer_minutes=10)
    assert not has_overlap
    assert dur == 0

    # With 20 min buffer: Train 1 effective end is 650. Train 3 arrives at 645 -> Overlap!
    has_overlap, dur = check_interval_overlap(600, 630, 645, 675, buffer_minutes=20)
    assert has_overlap


def test_min_heap_priority_queue():
    heap = MinHeapEventQueue()
    assert heap.is_empty()

    heap.push(300, "DEPARTURE", {"id": "D1"})
    heap.push(100, "ARRIVAL", {"id": "A1"})
    heap.push(200, "ARRIVAL", {"id": "A2"})

    assert len(heap) == 3
    assert heap.peek_time() == 100

    first = heap.pop()
    assert first["id"] == "A1"
    assert first["event_time"] == 100

    second = heap.pop()
    assert second["id"] == "A2"
    assert second["event_time"] == 200

    third = heap.pop()
    assert third["id"] == "D1"
    assert third["event_time"] == 300

    assert heap.is_empty()


def test_greedy_platform_allocation():
    # Station with 2 platforms
    allocator = GreedyPlatformAllocator(
        platform_count=2,
        platform_capacities={1: 24, 2: 18},
        headway_buffer_minutes=10
    )

    trains = [
        # Train A: 10:00 (600) to 10:30 (630), 22 coaches, prefers P1
        {
            "train_number": "1001",
            "train_name": "Express 1",
            "train_type": "Express",
            "start_minutes": 600,
            "end_minutes": 630,
            "coaches": 22,
            "preferred_platform": 1,
            "role": "Intermediate halt"
        },
        # Train B: 10:15 (615) to 10:45 (645), 16 coaches, prefers P1 (conflicts with A on P1!)
        {
            "train_number": "1002",
            "train_name": "Express 2",
            "train_type": "Express",
            "start_minutes": 615,
            "end_minutes": 645,
            "coaches": 16,
            "preferred_platform": 1,
            "role": "Intermediate halt"
        },
        # Train C: 10:45 (645) to 11:15 (675), 24 coaches (must get P1 due to length capacity!)
        {
            "train_number": "1003",
            "train_name": "Express 3",
            "train_type": "Express",
            "start_minutes": 645,
            "end_minutes": 675,
            "coaches": 24,
            "preferred_platform": 1,
            "role": "Intermediate halt"
        }
    ]

    result = allocator.allocate(trains)

    assigned = {t["train_number"]: t["platform"] for t in result["assigned_trains"]}
    # Train A should get Platform 1
    assert assigned["1001"] == 1
    # Train B should be greedily moved to Platform 2 to avoid conflict with Train A!
    assert assigned["1002"] == 2
    # Train C arrives at 645. On P1, Train A cleared at 630 + 10 buffer = 640. So Train C safely fits on P1!
    assert assigned["1003"] == 1

    # Zero conflicts should occur because greedy allocator placed Train B on P2!
    assert len(result["conflicts"]) == 0


def test_graph_bfs_and_dfs():
    graph = RailwayGraph()
    # Build diamond network: NDLS -> CNB -> DDU -> HWH
    #                        NDLS -> AGC -> BPL -> HWH
    graph.add_station("NDLS", "New Delhi")
    graph.add_station("CNB", "Kanpur Central")
    graph.add_station("DDU", "Pt Deen Dayal")
    graph.add_station("HWH", "Howrah")
    graph.add_station("AGC", "Agra Cantt")
    graph.add_station("BPL", "Bhopal")

    graph.add_track("NDLS", "CNB", 440.0)
    graph.add_track("CNB", "DDU", 346.0)
    graph.add_track("DDU", "HWH", 670.0)

    graph.add_track("NDLS", "AGC", 195.0)
    graph.add_track("AGC", "BPL", 510.0)
    graph.add_track("BPL", "HWH", 1200.0)

    # BFS from NDLS to HWH
    bfs_res = graph.bfs_shortest_path("NDLS", "HWH")
    assert bfs_res is not None
    assert bfs_res["hops_count"] == 3  # NDLS -> CNB -> DDU -> HWH
    path_codes = [h["station_code"] for h in bfs_res["path"]]
    assert path_codes == ["NDLS", "CNB", "DDU", "HWH"]

    # DFS alternative routes
    dfs_routes = graph.dfs_find_routes("NDLS", "HWH", max_depth=6, max_routes=3)
    assert len(dfs_routes) >= 2


def test_avoidable_waiting_analysis():
    # 2 baseline conflicts vs 0 optimized conflicts
    baseline_confs = [
        {"conflict_type": "DIRECT_COLLISION", "overlap_duration_minutes": 15},
        {"conflict_type": "HEADWAY_VIOLATION", "overlap_duration_minutes": 8}
    ]
    res = calculate_avoidable_waiting(baseline_confs, [], total_trains=10)
    assert res["conflicts_resolved"] == 2
    assert res["estimated_minutes_saved"] > 0
    assert "headway clearance buffer" in res["assumptions"]
