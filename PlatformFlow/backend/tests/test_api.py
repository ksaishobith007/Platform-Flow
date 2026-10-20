"""
PlatformFlow - API Integration Tests
Tests:
1. Health endpoint and seeded database checks
2. Nationwide station search (not limited to 3 stations)
3. Nationwide train search and full timetable stops
4. Timetable time-window filtering including overnight midnight crossing
5. Platform timeline and greedy platform allocation
6. Manual platform assignment simulation and conflict warnings
7. Graph network route search (BFS & DFS)
8. CSV/JSON import and validation error handling
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app, on_startup

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    on_startup()


def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    # Verify nationwide dataset is loaded (> 30 stations, not just 3!)
    assert data["stations_loaded"] >= 50
    assert data["trains_loaded"] >= 25


def test_nationwide_station_search():
    # 1. Search by code
    res = client.get("/api/stations?q=NDLS")
    assert res.status_code == 200
    stations = res.json()["stations"]
    assert len(stations) >= 1
    assert stations[0]["code"] == "NDLS"

    # 2. Search by city name across zones
    res_mum = client.get("/api/stations?q=Mumbai")
    assert res_mum.status_code == 200
    assert len(res_mum.json()["stations"]) >= 1

    res_kol = client.get("/api/stations?q=Howrah")
    assert res_kol.status_code == 200
    assert any(s["code"] == "HWH" for s in res_kol.json()["stations"])

    res_south = client.get("/api/stations?q=Chennai")
    assert res_south.status_code == 200
    assert any(s["code"] == "MAS" for s in res_south.json()["stations"])

    res_tpty = client.get("/api/stations?q=TPTY")
    assert res_tpty.status_code == 200
    assert res_tpty.json()["stations"][0]["code"] == "TPTY"


def test_nationwide_train_search():
    # Search by number
    res = client.get("/api/trains?q=12951")
    assert res.status_code == 200
    trains = res.json()["trains"]
    assert len(trains) >= 1
    assert "Tejas Rajdhani" in trains[0]["train_name"]

    # Search by train type / name
    res_vb = client.get("/api/trains?q=Vande Bharat")
    assert res_vb.status_code == 200
    assert len(res_vb.json()["trains"]) >= 2

    # Fetch detailed train route
    res_det = client.get("/api/trains/12951")
    assert res_det.status_code == 200
    det = res_det.json()
    assert det["train_number"] == "12951"
    assert len(det["stops"]) >= 4
    assert det["stops"][0]["station_code"] == "MMCT"


def test_station_timetable_with_midnight_window():
    # Query overnight window: 21:00 to 05:00 at RTM (Ratlam) where Rajdhani passes around 00:25!
    res = client.get("/api/timetable?station_code=RTM&start_time=21:00&end_time=05:00")
    assert res.status_code == 200
    data = res.json()
    assert data["is_overnight_window"] is True
    assert data["total_trains"] >= 1
    train_nums = [t["train_number"] for t in data["trains"]]
    assert "12951" in train_nums or "12952" in train_nums


def test_platform_timeline_and_allocation():
    res = client.get("/api/platforms/NDLS/timeline?start_time=05:00&end_time=23:59")
    assert res.status_code == 200
    data = res.json()
    assert data["station_code"] == "NDLS"
    assert data["platform_count"] >= 16
    assert len(data["timelines"]) == data["platform_count"]


def test_simulate_manual_assignment():
    # Simulate assigning train 12951 to Platform 2 at NDLS
    payload = {
        "station_code": "NDLS",
        "train_number": "12951",
        "target_platform": 2,
        "start_time": "08:00",
        "end_time": "12:00",
        "buffer_minutes": 10
    }
    res = client.post("/api/platforms/simulate-assignment", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "is_feasible" in data
    assert "safety_disclaimer" in data


def test_network_graph_route_bfs_and_dfs():
    # Route from NDLS to CSMT via BFS
    res_bfs = client.get("/api/network/route?origin=NDLS&destination=CSMT&algorithm=BFS")
    assert res_bfs.status_code == 200
    data = res_bfs.json()
    assert data["origin"] == "NDLS"
    assert data["destination"] == "CSMT"
    assert data["hops_count"] > 0
    assert len(data["path"]) >= 2

    # Route from NDLS to HWH via DFS
    res_dfs = client.get("/api/network/route?origin=NDLS&destination=HWH&algorithm=DFS")
    assert res_dfs.status_code == 200
    data_dfs = res_dfs.json()
    assert data_dfs["routes_count"] >= 1


def test_import_validation():
    # Test valid stations CSV
    valid_csv = "code,name,zone,state,platform_count\nTEST1,Test Station One,NR,Delhi,5\n"
    res = client.post(
        "/api/data/import/stations",
        files={"file": ("stations.csv", valid_csv, "text/csv")}
    )
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Test invalid CSV header
    bad_csv = "random_col1,random_col2\nfoo,bar\n"
    res_bad = client.post(
        "/api/data/import/stations",
        files={"file": ("bad.csv", bad_csv, "text/csv")}
    )
    assert res_bad.status_code == 200
    assert res_bad.json()["success"] is False


def test_dsa_explanations():
    res = client.get("/api/dsa/explanations")
    assert res.status_code == 200
    data = res.json()
    assert len(data["algorithms"]) == 5


def test_root_serves_frontend():
    res = client.get("/")
    assert res.status_code == 200
    assert "PlatformFlow" in res.text

