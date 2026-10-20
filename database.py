"""
PlatformFlow - Database Connection & SQLite Storage Layer
Provides SQLite database persistence with indexed tables for high-speed queries.
"""

import sqlite3
import json
import os
from typing import List, Dict, Any, Optional
from pathlib import Path

DB_FILE = Path(__file__).resolve().parent / "platformflow.db"


def get_db_connection() -> sqlite3.Connection:
    """Return a connection to the SQLite database with Row factory enabled."""
    conn = sqlite3.connect(str(DB_FILE), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")  # High concurrency performance
    return conn


def init_db():
    """Create all necessary database tables and performance indices."""
    conn = get_db_connection()
    with conn:
        # 1. Stations table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS stations (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                zone TEXT NOT NULL DEFAULT 'NR',
                division TEXT DEFAULT '',
                state TEXT DEFAULT '',
                platform_count INTEGER NOT NULL CHECK(platform_count >= 1),
                platforms_json TEXT NOT NULL DEFAULT '[]',
                latitude REAL,
                longitude REAL,
                data_status TEXT NOT NULL DEFAULT 'VERIFIED_DEMO'
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_stations_zone ON stations(zone);")

        # 2. Trains table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS trains (
                train_number TEXT PRIMARY KEY,
                train_name TEXT NOT NULL,
                train_type TEXT NOT NULL DEFAULT 'Superfast',
                source_code TEXT NOT NULL,
                dest_code TEXT NOT NULL,
                origin_dep TEXT NOT NULL,
                dest_arr TEXT NOT NULL,
                coaches INTEGER NOT NULL DEFAULT 22,
                service_days TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI,SAT,SUN',
                data_source TEXT NOT NULL DEFAULT 'DEMO_VALIDATED_DATASET',
                verified_date TEXT NOT NULL DEFAULT '2026-10-17'
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_trains_name ON trains(train_name);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_trains_type ON trains(train_type);")

        # 3. Stops / Timetable table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS stops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                train_number TEXT NOT NULL,
                station_code TEXT NOT NULL,
                stop_sequence INTEGER NOT NULL,
                arrival_time TEXT,       -- 'HH:MM'
                departure_time TEXT,     -- 'HH:MM'
                halt_minutes INTEGER NOT NULL DEFAULT 0,
                distance_km REAL NOT NULL DEFAULT 0.0,
                day_offset INTEGER NOT NULL DEFAULT 0,
                preferred_platform INTEGER,
                assigned_platform INTEGER,
                FOREIGN KEY (train_number) REFERENCES trains(train_number) ON DELETE CASCADE,
                FOREIGN KEY (station_code) REFERENCES stations(code) ON DELETE CASCADE
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_stops_station ON stops(station_code);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_stops_train ON stops(train_number);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_stops_times ON stops(station_code, arrival_time, departure_time);")

        # 4. Live / Simulated Delays table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS delays (
                station_code TEXT NOT NULL,
                train_number TEXT NOT NULL,
                expected_arr TEXT,
                expected_dep TEXT,
                delay_minutes INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                source TEXT NOT NULL,
                PRIMARY KEY (station_code, train_number)
            );
        """)

        # 5. Railway Network Edges (for BFS/DFS graph reachability)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS network_edges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_station TEXT NOT NULL,
                to_station TEXT NOT NULL,
                distance_km REAL NOT NULL,
                line_type TEXT NOT NULL DEFAULT 'Double Electrified',
                typical_speed_kmh INTEGER NOT NULL DEFAULT 110,
                UNIQUE(from_station, to_station)
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_edges_from ON network_edges(from_station);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_edges_to ON network_edges(to_station);")

        # 6. Operational Manual Platform Overrides
        conn.execute("""
            CREATE TABLE IF NOT EXISTS platform_overrides (
                station_code TEXT NOT NULL,
                train_number TEXT NOT NULL,
                assigned_platform INTEGER NOT NULL,
                override_by TEXT DEFAULT 'Staff Operator',
                updated_at TEXT NOT NULL,
                notes TEXT,
                PRIMARY KEY (station_code, train_number)
            );
        """)
    conn.close()


def reset_database():
    """Wipe tables and re-create schema."""
    if os.path.exists(str(DB_FILE)):
        try:
            os.remove(str(DB_FILE))
        except Exception:
            pass
    init_db()
