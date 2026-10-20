// PlatformFlow Frontend API Client

import type {
  Station,
  TrainDetail,
  TimetableResponse,
  PlatformTimelineResponse,
  WhatIfComparisonResponse,
  NetworkPathResponse,
  NetworkDfsResponse,
  AlgorithmExplanation
} from './types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to reach backend health endpoint');
  return res.json();
}

export async function searchStations(query: string): Promise<Station[]> {
  const res = await fetch(`${API_BASE}/stations?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search stations');
  const data = await res.json();
  return data.stations;
}

export async function getStationDetail(code: string): Promise<Station> {
  const res = await fetch(`${API_BASE}/stations/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error(`Station ${code} not found`);
  return res.json();
}

export async function searchTrains(query: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/trains?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search trains');
  const data = await res.json();
  return data.trains;
}

export async function getTrainDetail(trainNumber: string): Promise<TrainDetail> {
  const res = await fetch(`${API_BASE}/trains/${encodeURIComponent(trainNumber)}`);
  if (!res.ok) throw new Error(`Train ${trainNumber} not found`);
  return res.json();
}

export async function getTimetable(
  stationCode: string,
  startTime: string = '00:00',
  endTime: string = '23:59',
  day?: string,
  trainType?: string
): Promise<TimetableResponse> {
  let url = `${API_BASE}/timetable?station_code=${encodeURIComponent(stationCode)}&start_time=${startTime}&end_time=${endTime}`;
  if (day) url += `&day=${encodeURIComponent(day)}`;
  if (trainType && trainType !== 'All') url += `&train_type=${encodeURIComponent(trainType)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch timetable');
  return res.json();
}

export async function getPlatformTimeline(
  stationCode: string,
  startTime: string = '00:00',
  endTime: string = '23:59',
  bufferMinutes: number = 10
): Promise<PlatformTimelineResponse> {
  const url = `${API_BASE}/platforms/${encodeURIComponent(stationCode)}/timeline?start_time=${startTime}&end_time=${endTime}&headway_buffer_minutes=${bufferMinutes}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch platform timeline');
  return res.json();
}

export async function runGreedyAllocation(payload: {
  station_code: string;
  start_time: string;
  end_time: string;
  headway_buffer_minutes: number;
  manual_overrides?: Record<string, number>;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/platforms/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to execute platform allocation');
  return res.json();
}

export async function simulateManualAssignment(payload: {
  station_code: string;
  train_number: string;
  target_platform: number;
  start_time: string;
  end_time: string;
  buffer_minutes: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/platforms/simulate-assignment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to simulate platform assignment');
  return res.json();
}

export async function getWhatIfComparison(
  stationCode: string,
  startTime: string = '16:00',
  endTime: string = '21:00',
  bufferMinutes: number = 10
): Promise<WhatIfComparisonResponse> {
  const res = await fetch(`${API_BASE}/platforms/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      station_code: stationCode,
      start_time: startTime,
      end_time: endTime,
      buffer_minutes: bufferMinutes
    })
  });
  if (!res.ok) throw new Error('Failed to calculate what-if analysis');
  return res.json();
}

export async function findNetworkRoute(
  origin: string,
  destination: string,
  algorithm: 'BFS' | 'DFS' = 'BFS'
): Promise<NetworkPathResponse | NetworkDfsResponse> {
  const url = `${API_BASE}/network/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&algorithm=${algorithm}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No track route found between ${origin} and ${destination}`);
  return res.json();
}

export async function getNetworkGraphTopology(): Promise<any> {
  const res = await fetch(`${API_BASE}/network/graph`);
  if (!res.ok) throw new Error('Failed to load network graph topology');
  return res.json();
}

export async function getDSAExplanations(): Promise<{ algorithms: AlgorithmExplanation[] }> {
  const res = await fetch(`${API_BASE}/dsa/explanations`);
  if (!res.ok) throw new Error('Failed to fetch DSA explanations');
  return res.json();
}

export async function uploadStationsFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/data/import/stations`, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function uploadTrainsFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/data/import/trains`, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function uploadDelaysFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/data/import/delays`, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function resetDemoData(): Promise<any> {
  const res = await fetch(`${API_BASE}/data/reset-demo`, {
    method: 'POST'
  });
  return res.json();
}
