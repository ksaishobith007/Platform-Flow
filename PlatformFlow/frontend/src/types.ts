// PlatformFlow TypeScript Type Definitions

export interface Station {
  code: string;
  name: string;
  zone: string;
  division?: string;
  state?: string;
  platform_count: number;
  platforms?: Array<{
    platform_number: number;
    length_coaches: number;
    track_type: string;
    electrified: boolean;
    accessible: boolean;
  }>;
  latitude?: number;
  longitude?: number;
  data_status?: string;
}

export interface StopDetail {
  stop_sequence: number;
  station_code: string;
  station_name: string;
  arrival_time: string | null;
  departure_time: string | null;
  halt_minutes: number;
  distance_km: number;
  day_offset: number;
  preferred_platform?: number | null;
  assigned_platform?: number | null;
}

export interface TrainDetail {
  train_number: string;
  train_name: string;
  train_type: string;
  source_station_code: string;
  source_station_name: string;
  destination_station_code: string;
  destination_station_name: string;
  origin_departure_time: string;
  destination_arrival_time: string;
  total_coaches: number;
  service_days: string;
  data_source: string;
  verified_date: string;
  total_stops: number;
  stops: StopDetail[];
}

export interface TimetableItem {
  train_number: string;
  train_name: string;
  train_type: string;
  scheduled_arrival: string | null;
  scheduled_departure: string | null;
  expected_arrival: string | null;
  expected_departure: string | null;
  delay_minutes: number;
  role: string;
  stop_sequence: number;
  day_offset: number;
  service_days: string;
  coaches: number;
  preferred_platform: number | null;
  assigned_platform: number | null;
  crosses_midnight: boolean;
  source_station_code: string;
  source_station_name: string;
  destination_station_code: string;
  destination_station_name: string;
}

export interface TimetableResponse {
  station_code: string;
  station_name: string;
  platform_count: number;
  query_start_time: string;
  query_end_time: string;
  query_day: string | null;
  is_overnight_window: boolean;
  total_trains: number;
  delayed_trains: number;
  trains: TimetableItem[];
}

export interface OccupancyInterval {
  train_number: string;
  train_name: string;
  train_type: string;
  platform: number;
  start_minutes: number;
  end_minutes: number;
  start_time_str: string;
  end_time_str: string;
  role: string;
  coaches: number;
  has_conflict: boolean;
}

export interface PlatformTimeline {
  platform_number: number;
  length_coaches: number;
  track_type: string;
  occupancies: OccupancyInterval[];
}

export interface PlatformConflict {
  conflict_id: string;
  platform_number: number;
  train_a_number: string;
  train_a_name: string;
  train_a_interval: string;
  train_b_number: string;
  train_b_name: string;
  train_b_interval: string;
  overlap_duration_minutes: number;
  conflict_type: string;
  severity: "CRITICAL" | "WARNING";
  resolution_suggestion: string;
}

export interface PlatformTimelineResponse {
  station_code: string;
  station_name: string;
  platform_count: number;
  buffer_minutes: number;
  total_trains: number;
  conflicts_count: number;
  conflicts: PlatformConflict[];
  timelines: PlatformTimeline[];
  execution_time_ms: number;
}

export interface WhatIfComparisonResponse {
  station_code: string;
  time_window: string;
  total_trains_analyzed: number;
  baseline_conflicts_count: number;
  baseline_conflicts: PlatformConflict[];
  avoidable_waiting_analysis: {
    baseline_conflict_count: number;
    optimized_conflict_count: number;
    conflicts_resolved: number;
    baseline_waiting_minutes: number;
    optimized_waiting_minutes: number;
    estimated_minutes_saved: number;
    assumptions: string;
  };
  alternative_plans: Array<{
    plan_id: string;
    title: string;
    conflicts: number;
    description: string;
  }>;
}

export interface RouteHop {
  station_code: string;
  station_name: string;
  distance_from_prev_km: number;
  cumulative_distance_km: number;
  line_type: string;
}

export interface NetworkPathResponse {
  origin: string;
  destination: string;
  algorithm: string;
  hops_count: number;
  total_distance_km: number;
  path: RouteHop[];
  nodes_explored: number;
  traversal_order: string[];
  time_complexity: string;
  space_complexity: string;
}

export interface NetworkDfsResponse {
  origin: string;
  destination: string;
  algorithm: string;
  routes_count: number;
  routes: Array<{
    origin: string;
    destination: string;
    algorithm: string;
    hops_count: number;
    total_distance_km: number;
    path: RouteHop[];
    nodes_explored: number;
  }>;
}

export interface AlgorithmExplanation {
  id: string;
  name: string;
  use_case: string;
  time_complexity: string;
  space_complexity: string;
  explanation: string;
}
