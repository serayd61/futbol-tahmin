#!/usr/bin/env python3
"""n8n workflow JSON üretici.

_src/ altındaki JS dosyalarını okuyup 3 adet workflow JSON üretir:
  workflow1-fixtures-sync.json
  workflow2-team-stats-rebuild.json
  workflow3-predictions-compute.json
"""
import json
import os
import uuid
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "_src"
OUT = ROOT


def jsfile(name: str) -> str:
    return (SRC / name).read_text(encoding="utf-8")


def nid() -> str:
    return str(uuid.uuid4())


# -------------------------------------------------------------
# Yardımcı node fabrikaları
# -------------------------------------------------------------
def node_manual(name, x, y):
    return {
        "parameters": {},
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.manualTrigger",
        "typeVersion": 1,
        "position": [x, y],
    }


def node_schedule(name, cron_expr, x, y):
    return {
        "parameters": {
            "rule": {
                "interval": [
                    {"field": "cronExpression", "expression": cron_expr}
                ]
            }
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.scheduleTrigger",
        "typeVersion": 1.2,
        "position": [x, y],
    }


def node_code(name, js_code, x, y):
    return {
        "parameters": {"jsCode": js_code},
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [x, y],
    }


def node_http_get(name, url, x, y, *, query=None, headers=None):
    qparams = [{"name": k, "value": v} for k, v in (query or {}).items()]
    hparams = [{"name": k, "value": v} for k, v in (headers or {}).items()]
    params = {
        "method": "GET",
        "url": url,
        "options": {"timeout": 30000},
    }
    if qparams:
        params["sendQuery"] = True
        params["queryParameters"] = {"parameters": qparams}
    if hparams:
        params["sendHeaders"] = True
        params["headerParameters"] = {"parameters": hparams}
    return {
        "parameters": params,
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [x, y],
    }


def node_supabase_post(name, table, body_expr, x, y, *, on_conflict=None):
    """Supabase REST upsert (POST + Prefer: merge-duplicates)."""
    url = "={{ $env.SUPABASE_URL }}/rest/v1/" + table
    if on_conflict:
        url += "?on_conflict=" + on_conflict
    return {
        "parameters": {
            "method": "POST",
            "url": url,
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "apikey",        "value": "={{ $env.SUPABASE_SERVICE_KEY }}"},
                    {"name": "Authorization", "value": "=Bearer {{ $env.SUPABASE_SERVICE_KEY }}"},
                    {"name": "Content-Type",  "value": "application/json"},
                    {"name": "Prefer",        "value": "resolution=merge-duplicates,return=minimal"},
                ]
            },
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": body_expr,
            "options": {"timeout": 30000},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [x, y],
    }


def node_supabase_get(name, query_url, x, y):
    """Supabase REST GET (anahtar header'larıyla)."""
    return {
        "parameters": {
            "method": "GET",
            "url": "={{ $env.SUPABASE_URL }}/rest/v1/" + query_url,
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "apikey",        "value": "={{ $env.SUPABASE_SERVICE_KEY }}"},
                    {"name": "Authorization", "value": "=Bearer {{ $env.SUPABASE_SERVICE_KEY }}"},
                ]
            },
            "options": {"timeout": 30000},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [x, y],
    }


def chain(*names):
    """Düz zincir: a -> b -> c -> ... bağlantı sözlüğü."""
    conns = {}
    for i in range(len(names) - 1):
        conns[names[i]] = {
            "main": [[{"node": names[i + 1], "type": "main", "index": 0}]]
        }
    return conns


def merge_connections(*dicts):
    """Birden çok connections sözlüğünü birleştir."""
    out = {}
    for d in dicts:
        for src, val in d.items():
            if src not in out:
                out[src] = val
            else:
                # main listelerinin ilk grubunu birleştir
                existing = out[src]["main"][0]
                new = val["main"][0]
                seen = {(x["node"], x["index"]) for x in existing}
                for n in new:
                    if (n["node"], n["index"]) not in seen:
                        existing.append(n)
    return out


# -------------------------------------------------------------
# WORKFLOW 1 — daily-fixtures-sync
# -------------------------------------------------------------
def workflow1():
    nodes = [
        node_manual("Manual Trigger", 240, 200),
        node_schedule("Schedule 03:00", "0 3 * * *", 240, 360),
        node_code("Date Range", jsfile("date_range.js"), 480, 280),

        # --- Football-Data.org ---
        node_http_get(
            "Get FD Matches",
            "https://api.football-data.org/v4/matches",
            720, 280,
            query={
                "dateFrom": "={{ $json.dateFrom }}",
                "dateTo":   "={{ $json.dateTo }}",
            },
            headers={"X-Auth-Token": "={{ $env.FOOTBALL_DATA_API_KEY }}"},
        ),
        node_code("Transform FD", jsfile("transform_fd.js"), 960, 280),
        node_supabase_post(
            "Upsert Leagues (FD)", "leagues",
            "={{ $json.leagues }}", 1200, 160,
        ),
        node_supabase_post(
            "Upsert Teams (FD)", "teams",
            "={{ $('Transform FD').first().json.teams }}", 1200, 280,
        ),
        node_supabase_post(
            "Upsert Fixtures (FD)", "fixtures",
            "={{ $('Transform FD').first().json.fixtures }}", 1200, 400,
        ),

        # --- API-Football (direkt api-sports.io) — bugünkü maçlar ---
        node_http_get(
            "Get AF Fixtures",
            "https://v3.football.api-sports.io/fixtures",
            1440, 280,
            query={"date": "={{ $('Date Range').first().json.todayDate }}"},
            headers={
                "x-apisports-key": "={{ $env.APIFOOTBALL_DIRECT_KEY }}",
            },
        ),
        node_code("Transform AF", jsfile("transform_af.js"), 1680, 280),
        node_supabase_post(
            "Upsert Leagues (AF)", "leagues",
            "={{ $json.leagues }}", 1920, 160,
        ),
        node_supabase_post(
            "Upsert Teams (AF)", "teams",
            "={{ $('Transform AF').first().json.teams }}", 1920, 280,
        ),
        node_supabase_post(
            "Upsert Fixtures (AF)", "fixtures",
            "={{ $('Transform AF').first().json.fixtures }}", 1920, 400,
        ),
    ]

    connections = merge_connections(
        # Triggerlar → Date Range
        {"Manual Trigger":   {"main": [[{"node": "Date Range", "type": "main", "index": 0}]]}},
        {"Schedule 03:00":   {"main": [[{"node": "Date Range", "type": "main", "index": 0}]]}},
        chain(
            "Date Range",
            "Get FD Matches",
            "Transform FD",
            "Upsert Leagues (FD)",
            "Upsert Teams (FD)",
            "Upsert Fixtures (FD)",
            "Get AF Fixtures",
            "Transform AF",
            "Upsert Leagues (AF)",
            "Upsert Teams (AF)",
            "Upsert Fixtures (AF)",
        ),
    )

    return {
        "name": "1 — daily-fixtures-sync",
        "nodes": nodes,
        "pinData": {},
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "versionId": nid(),
        "meta": {"templateCredsSetupCompleted": True},
        "tags": [{"name": "futbol-tahmin"}],
    }


# -------------------------------------------------------------
# WORKFLOW 2 — team-stats-rebuild
# -------------------------------------------------------------
def workflow2():
    # PostgREST RPC dönüşü iç içe değil düz array. order=utc_date.asc, limit=10000
    fixtures_url = (
        "fixtures?select=id,league_id,utc_date,status,home_team_id,away_team_id,"
        "home_goals,away_goals&status=eq.FINISHED"
        "&utc_date=gte.{{ $now.minus({days: 30}).toUTC().toISO() }}"
        "&order=utc_date.asc&limit=10000"
    )

    nodes = [
        node_manual("Manual Trigger", 240, 200),
        node_schedule("Schedule 04:00", "0 4 * * *", 240, 360),
        node_supabase_get("Get Last 30d Fixtures", fixtures_url, 480, 280),
        node_code("Aggregate Stats", jsfile("aggregate_stats.js"), 720, 280),
        node_supabase_post(
            "Upsert Team Stats", "team_stats",
            "={{ $json.team_stats }}", 960, 280,
        ),
    ]
    connections = merge_connections(
        {"Manual Trigger":   {"main": [[{"node": "Get Last 30d Fixtures", "type": "main", "index": 0}]]}},
        {"Schedule 04:00":   {"main": [[{"node": "Get Last 30d Fixtures", "type": "main", "index": 0}]]}},
        chain(
            "Get Last 30d Fixtures",
            "Aggregate Stats",
            "Upsert Team Stats",
        ),
    )
    return {
        "name": "2 — team-stats-rebuild",
        "nodes": nodes,
        "pinData": {},
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "versionId": nid(),
        "meta": {"templateCredsSetupCompleted": True},
        "tags": [{"name": "futbol-tahmin"}],
    }


# -------------------------------------------------------------
# WORKFLOW 3 — predictions-compute
# -------------------------------------------------------------
def workflow3():
    upcoming_url = (
        "fixtures?select=id,league_id,utc_date,home_team_id,away_team_id,status"
        "&status=eq.SCHEDULED"
        "&utc_date=gte.{{ $now.toUTC().toISO() }}"
        "&utc_date=lte.{{ $now.plus({days: 7}).toUTC().toISO() }}"
        "&order=utc_date.asc&limit=2000"
    )
    stats_url = "team_stats?select=*&limit=10000"

    nodes = [
        node_manual("Manual Trigger", 240, 200),
        node_schedule("Schedule 05:00", "0 5 * * *", 240, 360),
        node_supabase_get("Get Upcoming Fixtures", upcoming_url, 480, 200),
        node_supabase_get("Get Team Stats", stats_url, 480, 360),
        node_code("Poisson Predict", jsfile("poisson_predict.js"), 720, 280),
        node_supabase_post(
            "Upsert Predictions", "predictions",
            "={{ $json.predictions }}", 960, 280,
        ),
    ]
    connections = merge_connections(
        {"Manual Trigger": {"main": [[{"node": "Get Upcoming Fixtures", "type": "main", "index": 0}]]}},
        {"Schedule 05:00": {"main": [[{"node": "Get Upcoming Fixtures", "type": "main", "index": 0}]]}},
        {"Get Upcoming Fixtures": {"main": [[{"node": "Get Team Stats", "type": "main", "index": 0}]]}},
        {"Get Team Stats": {"main": [[{"node": "Poisson Predict", "type": "main", "index": 0}]]}},
        {"Poisson Predict": {"main": [[{"node": "Upsert Predictions", "type": "main", "index": 0}]]}},
    )
    return {
        "name": "3 — predictions-compute",
        "nodes": nodes,
        "pinData": {},
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "versionId": nid(),
        "meta": {"templateCredsSetupCompleted": True},
        "tags": [{"name": "futbol-tahmin"}],
    }


# -------------------------------------------------------------
# main
# -------------------------------------------------------------
def main():
    files = {
        "workflow1-fixtures-sync.json":      workflow1(),
        "workflow2-team-stats-rebuild.json": workflow2(),
        "workflow3-predictions-compute.json": workflow3(),
    }
    for name, data in files.items():
        path = OUT / name
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"  ✓ {name}  ({len(data['nodes'])} nodes)")
    print("Done.")


if __name__ == "__main__":
    main()
