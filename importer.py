"""
PlatformFlow - Data Import & Integrity Validation Module
Supports CSV and JSON import for Stations, Train Timetables, and Delay Feeds
with strict schema validation, row-level error reporting, and DEMO labelling.
"""

import csv
import json
import io
from typing import Dict, Any, List, Tuple
from backend.database import get_db_connection
from backend.dsa_engine import time_to_minutes


def validate_time_format(val: Any) -> bool:
    """Validate that val is either empty/None or in 'HH:MM' 24-hr format."""
    if val is None or val == "" or str(val).strip().lower() in ("none", "null", "-"):
        return True
    s = str(val).strip()
    if ":" not in s:
        return False
    parts = s.split(":")
    if len(parts) != 2:
        return False
    try:
        h = int(parts[0])
        m = int(parts[1])
        return 0 <= h <= 23 and 0 <= m <= 59
    except ValueError:
        return False


def import_stations_csv(csv_content: str) -> Dict[str, Any]:
    """Import stations from CSV text."""
    reader = csv.DictReader(io.StringIO(csv_content.strip()))
    required_cols = {"code", "name"}
    fieldnames = {f.strip().lower(): f for f in (reader.fieldnames or [])}

    if not required_cols.issubset(set(fieldnames.keys())):
        return {
            "success": False,
            "total_records_read": 0,
            "valid_records_count": 0,
            "invalid_records_count": 0,
            "errors": [f"Missing required CSV columns. Required: {required_cols}. Found: {list(fieldnames.keys())}"],
            "message": "CSV header validation failed."
        }

    valid_rows = []
    errors = []
    row_num = 1

    for row in reader:
        row_num += 1
        code = row.get(fieldnames.get("code", "code"), "").strip().upper()
        name = row.get(fieldnames.get("name", "name"), "").strip()

        if not code or len(code) < 2 or len(code) > 8:
            errors.append(f"Row {row_num}: Invalid station code '{code}'. Must be 2-8 alphanumeric chars.")
            continue

        if not name:
            errors.append(f"Row {row_num}: Station name cannot be empty for code '{code}'.")
            continue

        p_count_raw = row.get(fieldnames.get("platform_count", "platforms"), "4").strip()
        try:
            p_count = max(1, int(p_count_raw))
        except ValueError:
            p_count = 4

        zone = row.get(fieldnames.get("zone", "zone"), "NR").strip().upper()
        state = row.get(fieldnames.get("state", "state"), "").strip()

        platforms_list = [
            {
                "platform_number": p,
                "length_coaches": 24 if p <= 2 else 20,
                "track_type": "Main line" if p in (1, 2) else "Loop line",
                "electrified": True,
                "accessible": True
            }
            for p in range(1, p_count + 1)
        ]

        valid_rows.append((
            code, name, zone, "", state, p_count,
            json.dumps(platforms_list), None, None, "IMPORTED_DATASET"
        ))

    if not valid_rows and errors:
        return {
            "success": False,
            "total_records_read": row_num - 1,
            "valid_records_count": 0,
            "invalid_records_count": len(errors),
            "errors": errors[:25],
            "message": "No valid stations could be imported."
        }

    conn = get_db_connection()
    with conn:
        for r in valid_rows:
            conn.execute("""
                INSERT INTO stations (code, name, zone, division, state, platform_count, platforms_json, latitude, longitude, data_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(code) DO UPDATE SET
                    name = excluded.name,
                    zone = excluded.zone,
                    state = excluded.state,
                    platform_count = excluded.platform_count,
                    platforms_json = excluded.platforms_json,
                    data_status = 'IMPORTED_DATASET';
            """, r)
    conn.close()

    return {
        "success": True,
        "total_records_read": row_num - 1,
        "valid_records_count": len(valid_rows),
        "invalid_records_count": len(errors),
        "errors": errors[:15],
        "message": f"Successfully imported {len(valid_rows)} station(s)."
    }


def import_trains_csv(csv_content: str) -> Dict[str, Any]:
    """
    Import train timetable stops from CSV text.
    Compatible with the existing trains.csv format:
    train_number,train_name,station_code,station_name,arrival,departure,halt_minutes,route_sequence,service_days,data_source,verified
    """
    reader = csv.DictReader(io.StringIO(csv_content.strip()))
    fieldnames = {f.strip().lower(): f for f in (reader.fieldnames or [])}

    required = {"train_number", "station_code"}
    if not required.issubset(set(fieldnames.keys())):
        return {
            "success": False,
            "total_records_read": 0,
            "valid_records_count": 0,
            "invalid_records_count": 0,
            "errors": [f"Missing required CSV columns. Required: {required}. Found: {list(fieldnames.keys())}"],
            "message": "Train CSV header validation failed."
        }

    valid_trains = {}
    valid_stops = []
    errors = []
    row_num = 1

    for row in reader:
        row_num += 1
        num = row.get(fieldnames.get("train_number", "train_number"), "").strip()
        st_code = row.get(fieldnames.get("station_code", "station_code"), "").strip().upper()
        t_name = row.get(fieldnames.get("train_name", "train_name"), f"Train {num}").strip()
        arr = row.get(fieldnames.get("arrival", "arrival"), "").strip() or None
        dep = row.get(fieldnames.get("departure", "departure"), "").strip() or None

        if not num:
            errors.append(f"Row {row_num}: Missing train number.")
            continue
        if not st_code:
            errors.append(f"Row {row_num}: Missing station code.")
            continue

        if arr and not validate_time_format(arr):
            errors.append(f"Row {row_num}: Invalid arrival time '{arr}'. Expected HH:MM.")
            continue
        if dep and not validate_time_format(dep):
            errors.append(f"Row {row_num}: Invalid departure time '{dep}'. Expected HH:MM.")
            continue

        halt_raw = row.get(fieldnames.get("halt_minutes", "halt_minutes"), "5").strip()
        try:
            halt_min = max(0, int(halt_raw))
        except ValueError:
            halt_min = 5

        seq_raw = row.get(fieldnames.get("route_sequence", "route_sequence"), "1").strip()
        try:
            seq = max(1, int(seq_raw))
        except ValueError:
            seq = len([s for s in valid_stops if s["train_number"] == num]) + 1

        service_days = row.get(fieldnames.get("service_days", "service_days"), "MON,TUE,WED,THU,FRI,SAT,SUN").strip()

        if num not in valid_trains:
            valid_trains[num] = {
                "train_number": num,
                "train_name": t_name,
                "train_type": "Superfast" if "superfast" in t_name.lower() or "sf" in t_name.lower() else "Express",
                "source_code": st_code,
                "dest_code": st_code,
                "origin_dep": dep or "08:00",
                "dest_arr": arr or "20:00",
                "coaches": 22,
                "service_days": service_days,
                "data_source": "IMPORTED_USER_DATASET",
                "verified_date": "2026-10-17"
            }

        valid_stops.append({
            "train_number": num,
            "station_code": st_code,
            "stop_sequence": seq,
            "arrival_time": arr,
            "departure_time": dep,
            "halt_minutes": halt_min,
            "distance_km": 0.0,
            "day_offset": 0,
            "preferred_platform": 1,
            "assigned_platform": 1
        })

    if not valid_stops and errors:
        return {
            "success": False,
            "total_records_read": row_num - 1,
            "valid_records_count": 0,
            "invalid_records_count": len(errors),
            "errors": errors[:25],
            "message": "No valid train stops could be parsed."
        }

    # Save to SQLite
    conn = get_db_connection()
    with conn:
        # Insert trains
        for num, tr in valid_trains.items():
            conn.execute("""
                INSERT INTO trains (train_number, train_name, train_type, source_code, dest_code, origin_dep, dest_arr, coaches, service_days, data_source, verified_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(train_number) DO UPDATE SET
                    train_name = excluded.train_name,
                    train_type = excluded.train_type,
                    data_source = 'IMPORTED_USER_DATASET';
            """, (
                tr["train_number"], tr["train_name"], tr["train_type"],
                tr["source_code"], tr["dest_code"], tr["origin_dep"],
                tr["dest_arr"], tr["coaches"], tr["service_days"],
                tr["data_source"], tr["verified_date"]
            ))

        # Insert stops
        for st in valid_stops:
            conn.execute("""
                INSERT INTO stops (train_number, station_code, stop_sequence, arrival_time, departure_time, halt_minutes, distance_km, day_offset, preferred_platform, assigned_platform)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                st["train_number"], st["station_code"], st["stop_sequence"],
                st["arrival_time"], st["departure_time"], st["halt_minutes"],
                st["distance_km"], st["day_offset"], st["preferred_platform"],
                st["assigned_platform"]
            ))

    conn.close()

    return {
        "success": True,
        "total_records_read": row_num - 1,
        "valid_records_count": len(valid_stops),
        "invalid_records_count": len(errors),
        "errors": errors[:15],
        "message": f"Successfully imported {len(valid_trains)} train(s) with {len(valid_stops)} stop records."
    }


def import_delay_feed_json(json_content: str) -> Dict[str, Any]:
    """
    Import simulated or authorized delay feed updates.
    Shape per schema:
    [
      {
        "stationCode": "TPTY",
        "trainNumber": "17015",
        "expectedArrival": "16:45",
        "expectedDeparture": "17:05",
        "delayMinutes": 35,
        "updatedAt": "2026-10-17T16:20:00+05:30",
        "source": "Simulated Feed"
      }
    ]
    """
    try:
        data = json.loads(json_content)
    except Exception as e:
        return {
            "success": False,
            "total_records_read": 0,
            "valid_records_count": 0,
            "invalid_records_count": 0,
            "errors": [f"Malformed JSON: {str(e)}"],
            "message": "JSON parsing error."
        }

    if not isinstance(data, list):
        return {
            "success": False,
            "total_records_read": 0,
            "valid_records_count": 0,
            "invalid_records_count": 0,
            "errors": ["Root element must be a JSON Array of delay objects."],
            "message": "Schema mismatch."
        }

    valid_delays = []
    errors = []

    for idx, item in enumerate(data):
        st_code = item.get("stationCode", "").strip().upper()
        t_num = item.get("trainNumber", "").strip()
        exp_arr = item.get("expectedArrival")
        exp_dep = item.get("expectedDeparture")
        delay_m = item.get("delayMinutes", 0)
        source = item.get("source", "SIMULATED_FEED_DEMO")
        updated_at = item.get("updatedAt", "2026-10-17T23:00:00+05:30")

        if not st_code or not t_num:
            errors.append(f"Item {idx}: stationCode and trainNumber are required.")
            continue

        try:
            delay_int = int(delay_m)
        except ValueError:
            delay_int = 0

        valid_delays.append((st_code, t_num, exp_arr, exp_dep, delay_int, updated_at, source))

    conn = get_db_connection()
    with conn:
        for r in valid_delays:
            conn.execute("""
                INSERT INTO delays (station_code, train_number, expected_arr, expected_dep, delay_minutes, updated_at, source)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(station_code, train_number) DO UPDATE SET
                    expected_arr = excluded.expected_arr,
                    expected_dep = excluded.expected_dep,
                    delay_minutes = excluded.delay_minutes,
                    updated_at = excluded.updated_at,
                    source = excluded.source;
            """, r)
    conn.close()

    return {
        "success": True,
        "total_records_read": len(data),
        "valid_records_count": len(valid_delays),
        "invalid_records_count": len(errors),
        "errors": errors[:15],
        "message": f"Successfully ingested {len(valid_delays)} delay update record(s)."
    }
