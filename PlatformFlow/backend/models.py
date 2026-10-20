"""
PlatformFlow - Data Models & Pydantic Schemas
Defines structured schemas for stations, trains, schedules, platform allocation,
conflict analysis, and graph route searches.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Station Schemas
# ---------------------------------------------------------------------------

class PlatformInfo(BaseModel):
    platform_number: int
    length_coaches: int = 24
    track_type: str = "Main line"  # "Main line" or "Loop line"
    electrified: bool = True
    accessible: bool = True


class StationBase(BaseModel):
    code: str = Field(..., description="Indian Railway station code, e.g., NDLS")
    name: str = Field(..., description="Full station name, e.g., New Delhi")
    zone: str = Field("NR", description="Railway Zone, e.g., NR, WR, SR, CR")
    division: str = Field("", description="Railway Division")
    state: str = Field("", description="State or UT")
    platform_count: int = Field(..., ge=1, le=40, description="Total number of platforms")
    platforms: List[PlatformInfo] = Field(default_factory=list)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    data_status: str = Field("VERIFIED_DEMO", description="DEMO_SEED, IMPORTED, or OPERATIONAL")


class StationResponse(StationBase):
    pass


class StationSearchQuery(BaseModel):
    query: str
    limit: int = 20


# ---------------------------------------------------------------------------
# Train & Timetable Schemas
# ---------------------------------------------------------------------------

class StopDetail(BaseModel):
    stop_sequence: int
    station_code: str
    station_name: str
    arrival_time: Optional[str] = None      # "HH:MM" or None for origin
    departure_time: Optional[str] = None    # "HH:MM" or None for destination
    halt_minutes: int = 0
    distance_km: float = 0.0
    day_offset: int = 0                    # 0 for Day 1, 1 for Day 2, etc.
    preferred_platform: Optional[int] = None
    assigned_platform: Optional[int] = None


class TrainBase(BaseModel):
    train_number: str = Field(..., description="Train number, e.g., 12951")
    train_name: str = Field(..., description="Official train name")
    train_type: str = Field("Superfast", description="Rajdhani, Vande Bharat, Shatabdi, Superfast, Express")
    source_station_code: str
    destination_station_code: str
    origin_departure_time: str
    destination_arrival_time: str
    total_coaches: int = 22
    service_days: str = "MON,TUE,WED,THU,FRI,SAT,SUN"  # Days of operation
    data_source: str = "DEMO_VALIDATED_DATASET"
    verified_date: str = "2026-10-17"


class TrainDetailResponse(TrainBase):
    source_station_name: str = ""
    destination_station_name: str = ""
    stops: List[StopDetail] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Station Timetable & Time-Window Filtering
# ---------------------------------------------------------------------------

class TimetableItem(BaseModel):
    train_number: str
    train_name: str
    train_type: str
    scheduled_arrival: Optional[str] = None
    scheduled_departure: Optional[str] = None
    expected_arrival: Optional[str] = None
    expected_departure: Optional[str] = None
    delay_minutes: int = 0
    role: str = "Intermediate halt"  # "Originating", "Terminating", "Intermediate halt"
    stop_sequence: int = 1
    day_offset: int = 0
    service_days: str = "MON,TUE,WED,THU,FRI,SAT,SUN"
    coaches: int = 22
    preferred_platform: Optional[int] = None
    assigned_platform: Optional[int] = None
    crosses_midnight: bool = False
    source_station_code: str = ""
    source_station_name: str = ""
    destination_station_code: str = ""
    destination_station_name: str = ""


class TimetableResponse(BaseModel):
    station_code: str
    station_name: str
    platform_count: int
    query_start_time: str
    query_end_time: str
    query_day: Optional[str] = None
    is_overnight_window: bool
    total_trains: int
    delayed_trains: int
    trains: List[TimetableItem]


# ---------------------------------------------------------------------------
# Platform Allocation, Occupancy & Conflicts
# ---------------------------------------------------------------------------

class OccupancyInterval(BaseModel):
    train_number: str
    train_name: str
    train_type: str
    platform: int
    start_minutes: int        # Absolute minutes from day start (or window start)
    end_minutes: int
    start_time_str: str       # "HH:MM"
    end_time_str: str         # "HH:MM"
    role: str
    coaches: int
    has_conflict: bool = False
    conflict_notes: Optional[str] = None


class PlatformTimeline(BaseModel):
    platform_number: int
    length_coaches: int
    track_type: str
    occupancies: List[OccupancyInterval] = Field(default_factory=list)


class PlatformConflict(BaseModel):
    conflict_id: str
    platform_number: int
    train_a_number: str
    train_a_name: str
    train_a_interval: str
    train_b_number: str
    train_b_name: str
    train_b_interval: str
    overlap_duration_minutes: int
    conflict_type: str        # "DIRECT_COLLISION", "HEADWAY_VIOLATION", "LENGTH_LIMIT_EXCEEDED"
    severity: str             # "CRITICAL", "WARNING"
    resolution_suggestion: str


class PlatformAllocationResult(BaseModel):
    station_code: str
    algorithm_used: str = "Greedy Interval Coloring with Min-Heap & Buffer Constraints"
    buffer_minutes: int = 10
    total_trains: int
    assigned_count: int
    unassigned_count: int
    conflicts_detected: int
    conflicts: List[PlatformConflict]
    timelines: List[PlatformTimeline]
    execution_time_ms: float
    time_complexity: str = "O(N log N + N * K) where N = trains, K = platforms"
    space_complexity: str = "O(N + K)"


class WhatIfComparison(BaseModel):
    station_code: str
    baseline_conflicts: int
    optimized_conflicts: int
    conflicts_resolved: int
    estimated_avoidable_waiting_minutes: int
    utilization_balance_score: float
    explanation_assumptions: str
    alternative_plans: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Railway Network Graph & Search
# ---------------------------------------------------------------------------

class RouteHop(BaseModel):
    station_code: str
    station_name: str
    distance_from_prev_km: float = 0.0
    cumulative_distance_km: float = 0.0
    line_type: str = "Double Electrified"


class NetworkPath(BaseModel):
    origin: str
    destination: str
    algorithm: str            # "BFS" or "DFS"
    hops_count: int
    total_distance_km: float
    path: List[RouteHop]
    nodes_explored: int
    traversal_order: List[str]


# ---------------------------------------------------------------------------
# Import and Validation Schemas
# ---------------------------------------------------------------------------

class ImportValidationReport(BaseModel):
    entity_type: str          # "stations", "trains", "delays"
    total_records_read: int
    valid_records_count: int
    invalid_records_count: int
    errors: List[str] = Field(default_factory=list)
    success: bool
    message: str
