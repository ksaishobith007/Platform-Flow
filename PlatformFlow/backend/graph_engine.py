"""
PlatformFlow - Railway Network Graph Engine (BFS & DFS)
Implements:
1. Adjacency List representation of nationwide railway track topology
2. BFS for minimum station hops / junction shortest path
3. DFS for alternative route exploration and track reachability
4. Graph serialization for visual network maps
"""

from collections import deque
from typing import List, Dict, Any, Optional, Set, Tuple


class TrackEdge:
    def __init__(
        self,
        to_station: str,
        distance_km: float,
        line_type: str = "Double Electrified",
        typical_speed_kmh: int = 110
    ):
        self.to_station = to_station.upper()
        self.distance_km = distance_km
        self.line_type = line_type
        self.typical_speed_kmh = typical_speed_kmh

    def to_dict(self) -> Dict[str, Any]:
        return {
            "to_station": self.to_station,
            "distance_km": self.distance_km,
            "line_type": self.line_type,
            "typical_speed_kmh": self.typical_speed_kmh
        }


class RailwayGraph:
    """
    Adjacency list representation of nationwide railway network.
    Adjacency structure:
    adj_list: { station_code -> List[TrackEdge] }
    """

    def __init__(self):
        self.adj_list: Dict[str, List[TrackEdge]] = {}
        self.station_info: Dict[str, Dict[str, Any]] = {}

    def add_station(self, code: str, name: str, zone: str = "NR", state: str = "", lat: float = None, lon: float = None):
        c = code.upper()
        if c not in self.adj_list:
            self.adj_list[c] = []
        self.station_info[c] = {
            "code": c,
            "name": name,
            "zone": zone,
            "state": state,
            "lat": lat,
            "lon": lon
        }

    def add_track(
        self,
        from_code: str,
        to_code: str,
        distance_km: float,
        line_type: str = "Double Electrified",
        bidirectional: bool = True
    ):
        u = from_code.upper()
        v = to_code.upper()

        if u not in self.adj_list:
            self.adj_list[u] = []
        if v not in self.adj_list:
            self.adj_list[v] = []

        # Avoid duplicate parallel edges
        if not any(e.to_station == v for e in self.adj_list[u]):
            self.adj_list[u].append(TrackEdge(v, distance_km, line_type))

        if bidirectional:
            if not any(e.to_station == u for e in self.adj_list[v]):
                self.adj_list[v].append(TrackEdge(u, distance_km, line_type))

    # -----------------------------------------------------------------------
    # Breadth-First Search (BFS) - Minimum Junction Hops
    # -----------------------------------------------------------------------
    def bfs_shortest_path(self, origin: str, destination: str) -> Optional[Dict[str, Any]]:
        """
        BFS Traversal to find path with minimum intermediate station hops.
        Time Complexity: O(V + E)
        Space Complexity: O(V)
        """
        src = origin.upper()
        dst = destination.upper()

        if src not in self.adj_list or dst not in self.adj_list:
            return None

        if src == dst:
            return {
                "origin": src,
                "destination": dst,
                "algorithm": "BFS (Breadth-First Search)",
                "hops_count": 0,
                "total_distance_km": 0.0,
                "path": [{
                    "station_code": src,
                    "station_name": self.station_info.get(src, {}).get("name", src),
                    "distance_from_prev_km": 0.0,
                    "cumulative_distance_km": 0.0,
                    "line_type": "Station Terminal"
                }],
                "nodes_explored": 1,
                "traversal_order": [src],
                "time_complexity": "O(V + E)",
                "space_complexity": "O(V)"
            }

        queue = deque([src])
        visited: Set[str] = {src}
        parent_map: Dict[str, Tuple[str, float, str]] = {}  # curr -> (parent, dist, line_type)
        traversal_order: List[str] = []

        found = False
        while queue:
            curr = queue.popleft()
            traversal_order.append(curr)

            if curr == dst:
                found = True
                break

            for edge in self.adj_list.get(curr, []):
                nxt = edge.to_station
                if nxt not in visited:
                    visited.add(nxt)
                    parent_map[nxt] = (curr, edge.distance_km, edge.line_type)
                    queue.append(nxt)

        if not found:
            return None

        # Reconstruct path from dst to src
        path_nodes: List[Dict[str, Any]] = []
        curr = dst
        total_dist = 0.0
        backtrack = []

        while curr != src:
            p, dist, ltype = parent_map[curr]
            backtrack.append((curr, dist, ltype))
            total_dist += dist
            curr = p

        backtrack.reverse()

        # Origin station
        cum_dist = 0.0
        path_nodes.append({
            "station_code": src,
            "station_name": self.station_info.get(src, {}).get("name", src),
            "distance_from_prev_km": 0.0,
            "cumulative_distance_km": 0.0,
            "line_type": "Origin Terminal"
        })

        for node, dist, ltype in backtrack:
            cum_dist += dist
            path_nodes.append({
                "station_code": node,
                "station_name": self.station_info.get(node, {}).get("name", node),
                "distance_from_prev_km": dist,
                "cumulative_distance_km": round(cum_dist, 1),
                "line_type": ltype
            })

        return {
            "origin": src,
            "destination": dst,
            "algorithm": "BFS (Breadth-First Search - Shortest Hops)",
            "hops_count": len(path_nodes) - 1,
            "total_distance_km": round(total_dist, 1),
            "path": path_nodes,
            "nodes_explored": len(traversal_order),
            "traversal_order": traversal_order,
            "time_complexity": "O(V + E) - optimal for unweighted or hop-count shortest paths",
            "space_complexity": "O(V) queue & visited set"
        }

    # -----------------------------------------------------------------------
    # Depth-First Search (DFS) - Alternative Route Exploration
    # -----------------------------------------------------------------------
    def dfs_find_routes(
        self,
        origin: str,
        destination: str,
        max_depth: int = 12,
        max_routes: int = 3
    ) -> List[Dict[str, Any]]:
        """
        DFS to explore distinct alternative routes between stations.
        Time Complexity: O(V + E) with bounded backtracking.
        Space Complexity: O(V) recursion stack.
        """
        src = origin.upper()
        dst = destination.upper()

        if src not in self.adj_list or dst not in self.adj_list:
            return []

        all_routes: List[Dict[str, Any]] = []
        visited_nodes_count = [0]

        def dfs_visit(
            curr: str,
            current_path: List[Tuple[str, float, str]],
            visited: Set[str],
            depth: int
        ):
            if len(all_routes) >= max_routes or depth > max_depth:
                return

            visited_nodes_count[0] += 1

            if curr == dst:
                # Build complete path
                path_hops = []
                cum_dist = 0.0
                path_hops.append({
                    "station_code": src,
                    "station_name": self.station_info.get(src, {}).get("name", src),
                    "distance_from_prev_km": 0.0,
                    "cumulative_distance_km": 0.0,
                    "line_type": "Origin Terminal"
                })
                for code, dist, ltype in current_path:
                    cum_dist += dist
                    path_hops.append({
                        "station_code": code,
                        "station_name": self.station_info.get(code, {}).get("name", code),
                        "distance_from_prev_km": dist,
                        "cumulative_distance_km": round(cum_dist, 1),
                        "line_type": ltype
                    })

                all_routes.append({
                    "origin": src,
                    "destination": dst,
                    "algorithm": f"DFS Route Option #{len(all_routes) + 1}",
                    "hops_count": len(path_hops) - 1,
                    "total_distance_km": round(cum_dist, 1),
                    "path": path_hops,
                    "nodes_explored": visited_nodes_count[0],
                    "time_complexity": "O(V + E) bounded backtracking",
                    "space_complexity": "O(V) call stack"
                })
                return

            for edge in self.adj_list.get(curr, []):
                nxt = edge.to_station
                if nxt not in visited:
                    visited.add(nxt)
                    current_path.append((nxt, edge.distance_km, edge.line_type))
                    dfs_visit(nxt, current_path, visited, depth + 1)
                    current_path.pop()
                    visited.remove(nxt)

        dfs_visit(src, [], {src}, 0)
        return all_routes

    # -----------------------------------------------------------------------
    # Graph Topology Export for Visual Rendering
    # -----------------------------------------------------------------------
    def export_graph_topology(self) -> Dict[str, Any]:
        """Export nodes and links for front-end SVG/Canvas visualization."""
        nodes = []
        for code, info in self.station_info.items():
            nodes.append({
                "id": code,
                "label": f"{code} - {info['name']}",
                "name": info["name"],
                "zone": info.get("zone", "NR"),
                "state": info.get("state", ""),
                "degree": len(self.adj_list.get(code, [])),
                "lat": info.get("lat"),
                "lon": info.get("lon")
            })

        edges = []
        seen_edges: Set[Tuple[str, str]] = set()
        for u, edge_list in self.adj_list.items():
            for e in edge_list:
                v = e.to_station
                edge_pair = tuple(sorted([u, v]))
                if edge_pair not in seen_edges:
                    seen_edges.add(edge_pair)
                    edges.append({
                        "source": u,
                        "target": v,
                        "distance_km": e.distance_km,
                        "line_type": e.line_type
                    })

        return {
            "total_stations": len(nodes),
            "total_tracks": len(edges),
            "nodes": nodes,
            "edges": edges
        }
