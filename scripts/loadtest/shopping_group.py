"""Group-shopping load probe for the shared shopping list.

Simulates N phones on one list: each polls the pulse every few seconds, syncs when the change marker moves
(shopping mode: the compact `board`; `--mode detail`: the full list), and one phone checks an item
off every few seconds. With `--event-slug`, a team member (dev login, local only) also polls the event's shopping plan
(`GET /api/shopping-events/{slug}/plan/`): the first calls compute it per worker, the later ones must come from the cache. Prints requests, status codes and p50/p95/max per endpoint; exits 1 when a threshold fails.

Run against a local, production-like stack (see README.md):

    uv run --project backend python scripts/loadtest/shopping_group.py --invite-token <uuid>
"""

from __future__ import annotations

import argparse
import asyncio
import math
import random
import sys
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
SYNC_LABEL = "sync_board"
FULL_LABEL = "detail_full"
PLAN_FIRST_LABEL = "plan_first"
PLAN_CACHED_LABEL = "plan_cached"
# The cache lives per worker process: the first calls warm every worker and are reported separately.
PLAN_WARMUP_CALLS = 6


@dataclass
class Samples:
    """Latencies (seconds) and status codes per endpoint label."""

    latencies: dict[str, list[float]] = field(default_factory=lambda: defaultdict(list))
    statuses: dict[str, Counter] = field(default_factory=lambda: defaultdict(Counter))

    def add(self, label: str, status: int, seconds: float) -> None:
        self.latencies[label].append(seconds)
        self.statuses[label][status] += 1

    def count_429(self) -> int:
        return sum(counter[429] for counter in self.statuses.values())


def percentile(values: list[float], fraction: float) -> float:
    """Nearest-rank percentile; 0.0 for no samples."""
    if not values:
        return 0.0
    ordered = sorted(values)
    return ordered[min(len(ordered), max(1, math.ceil(fraction * len(ordered)))) - 1]


def evaluate(samples: Samples, p95_sync: float, p95_full: float, p95_plan: float = 0.3) -> list[str]:
    """Violated thresholds; a latency threshold only applies when the endpoint was used."""
    failures: list[str] = []
    if (rejected := samples.count_429()) > 0:
        failures.append(f"{rejected} responses with HTTP 429 (limit 0)")
    for label, limit in ((SYNC_LABEL, p95_sync), (FULL_LABEL, p95_full), (PLAN_CACHED_LABEL, p95_plan)):
        values = samples.latencies.get(label)
        if values and (value := percentile(values, 0.95)) > limit:
            failures.append(f"p95 of {label} is {value:.2f} s (limit {limit:.2f} s)")
    return failures


def format_report(samples: Samples) -> str:
    lines = [f"{'endpoint':<14}{'requests':>9}{'p50 s':>9}{'p95 s':>9}{'max s':>9}  statuses"]
    for label in sorted(samples.latencies):
        values = samples.latencies[label]
        statuses = ", ".join(f"{status}×{count}" for status, count in sorted(samples.statuses[label].items()))
        lines.append(
            f"{label:<14}{len(values):>9}{percentile(values, 0.5):>9.2f}{percentile(values, 0.95):>9.2f}"
            f"{max(values):>9.2f}  {statuses}"
        )
    return "\n".join(lines)


def is_production_url(base_url: str) -> bool:
    host = urlparse(base_url).hostname or ""
    return host not in LOCAL_HOSTS and not host.endswith(".localhost")


class Device:
    """One phone: joins through the invitation link, polls, syncs, optionally checks items off."""

    def __init__(self, index: int, args: argparse.Namespace, samples: Samples, stop: asyncio.Event) -> None:
        self.index = index
        self.args = args
        self.samples = samples
        self.stop = stop
        self.client = httpx.AsyncClient(base_url=args.base_url, timeout=90.0)
        self.list_id = 0
        self.headers: dict[str, str] = {}
        self.stamp = ""
        self.items: dict[int, dict] = {}
        self.toggled: dict[int, bool] = {}

    async def call(self, label: str, method: str, path: str, **kwargs) -> httpx.Response | None:
        started = time.perf_counter()
        try:
            response = await self.client.request(method, path, headers=self.headers, **kwargs)
        except httpx.HTTPError:
            self.samples.add(label, 0, time.perf_counter() - started)
            return None
        self.samples.add(label, response.status_code, time.perf_counter() - started)
        return response

    async def join(self) -> bool:
        response = await self.call(
            "join",
            "POST",
            f"/api/shopping-lists/shared/{self.args.invite_token}/join/",
            json={"name": f"Lasttest {self.index + 1}"},
        )
        if response is None or response.status_code != 200:
            return False
        body = response.json()
        self.list_id = body["list_id"]
        self.headers = {"X-Guest-Token": body["guest_token"]}
        if csrf := self.client.cookies.get("csrftoken"):
            self.headers["X-CSRFToken"] = csrf
        return await self.full_reload()

    async def full_reload(self) -> bool:
        """Load the whole state: the board in shopping mode, the full detail otherwise."""
        if self.args.mode == "board":
            response = await self.call(SYNC_LABEL, "GET", f"/api/shopping-lists/{self.list_id}/board/")
        else:
            response = await self.call(FULL_LABEL, "GET", f"/api/shopping-lists/{self.list_id}/")
        if response is None or response.status_code != 200:
            return False
        body = response.json()
        self.stamp = body["stamp"]
        self.items = {item["id"]: item for item in body["items"]}
        return True

    async def poll(self) -> None:
        await asyncio.sleep(random.uniform(0, self.args.pulse_interval))
        while not self.stop.is_set():
            response = await self.call("pulse", "GET", f"/api/shopping-lists/{self.list_id}/pulse/")
            if response is not None and response.status_code == 200:
                if response.json()["stamp"] != self.stamp:
                    await self.full_reload()
            await self.sleep(self.args.pulse_interval)

    async def check_off(self) -> None:
        await self.sleep(self.args.check_interval)
        while not self.stop.is_set() and self.items:
            item_id = random.choice(list(self.items))
            state = not self.items[item_id]["is_checked"]
            response = await self.call(
                "check_off", "PATCH", f"/api/shopping-lists/{self.list_id}/items/{item_id}/", json={"is_checked": state}
            )
            if response is not None and response.status_code == 200:
                self.items[item_id] = response.json()
                self.stamp = ""  # our own change moves the marker; the next pulse resyncs like on a real phone
                self.toggled[item_id] = state
            await self.sleep(self.args.check_interval)

    async def restore(self) -> None:
        """Undo the toggles so the list is unchanged afterwards."""
        for item_id, state in self.toggled.items():
            await self.call(
                "restore",
                "PATCH",
                f"/api/shopping-lists/{self.list_id}/items/{item_id}/",
                json={"is_checked": not state},
            )

    async def sleep(self, seconds: float) -> None:
        try:
            await asyncio.wait_for(self.stop.wait(), timeout=seconds)
        except TimeoutError:
            pass


class Planner:
    """A team member watching the event's shopping plan; the first call fills the cache, later ones hit it."""

    def __init__(self, args: argparse.Namespace, samples: Samples, stop: asyncio.Event) -> None:
        self.args = args
        self.samples = samples
        self.stop = stop
        self.client = httpx.AsyncClient(base_url=args.base_url, timeout=90.0)

    async def login(self) -> bool:
        """Dev login exists on local stacks only; it is what keeps this probe away from production accounts."""
        csrf = (await self.client.get("/api/auth/csrf/")).json()["csrfToken"]
        response = await self.client.post(
            "/api/auth/dev-login/",
            json={"email": self.args.planner_email},
            headers={"X-CSRFToken": csrf, "Referer": self.args.base_url + "/"},
        )
        return response.status_code == 200

    async def poll(self) -> None:
        calls = 0
        while not self.stop.is_set():
            started = time.perf_counter()
            try:
                response = await self.client.get(f"/api/shopping-events/{self.args.event_slug}/plan/")
                status = response.status_code
            except httpx.HTTPError:
                status = 0
            warming = calls < PLAN_WARMUP_CALLS
            self.samples.add(PLAN_FIRST_LABEL if warming else PLAN_CACHED_LABEL, status, time.perf_counter() - started)
            calls += 1
            try:
                await asyncio.wait_for(self.stop.wait(), timeout=0.2 if warming else self.args.pulse_interval)
            except TimeoutError:
                pass


async def run(args: argparse.Namespace) -> Samples:
    samples = Samples()
    stop = asyncio.Event()
    devices = [Device(index, args, samples, stop) for index in range(args.devices)]
    joined = await asyncio.gather(*(device.join() for device in devices))
    if not all(joined):
        raise SystemExit(f"{joined.count(False)} of {args.devices} devices could not join the list (token valid?)")
    tasks = [asyncio.create_task(device.poll()) for device in devices]
    tasks.append(asyncio.create_task(devices[0].check_off()))
    planner = Planner(args, samples, stop) if args.event_slug else None
    if planner is not None:
        if not await planner.login():
            raise SystemExit("planner could not log in (dev login only works on a local stack; check --planner-email)")
        tasks.append(asyncio.create_task(planner.poll()))
    await asyncio.sleep(args.duration)
    stop.set()
    await asyncio.gather(*tasks)
    await devices[0].restore()
    await asyncio.gather(*(device.client.aclose() for device in devices))
    if planner is not None:
        await planner.client.aclose()
    return samples


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--invite-token", required=True, help="share token of the list (seed_loadtest_shopping_list)")
    parser.add_argument("--devices", type=int, default=6)
    parser.add_argument("--pulse-interval", type=float, default=5.0, help="seconds between pulse requests")
    parser.add_argument("--check-interval", type=float, default=10.0, help="seconds between check-offs (device 1)")
    parser.add_argument("--duration", type=float, default=600.0, help="seconds")
    parser.add_argument(
        "--mode", choices=("board", "detail"), default="board", help="what a device reloads on change (default: board)"
    )
    parser.add_argument("--p95-sync", type=float, default=1.0, help="limit for p95 of sync_board, seconds")
    parser.add_argument("--p95-full", type=float, default=3.0, help="limit for p95 of detail_full, seconds")
    parser.add_argument("--event-slug", help="also poll the shopping plan of this event (seed: --event-meals)")
    parser.add_argument(
        "--planner-email", default="loadtest-owner@example.invalid", help="team member for --event-slug"
    )
    parser.add_argument("--p95-plan", type=float, default=0.3, help="limit for p95 of plan_cached, seconds")
    parser.add_argument("--confirm-production", action="store_true", help="allow a non-local --base-url")
    args = parser.parse_args(argv)
    if is_production_url(args.base_url) and not args.confirm_production:
        parser.error("--base-url is not local; pass --confirm-production (off-peak, explicit approval only)")
    if args.devices < 1:
        parser.error("--devices must be at least 1")
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    print(
        f"{args.devices} devices, pulse {args.pulse_interval} s, check-off {args.check_interval} s, {args.duration} s"
    )
    samples = asyncio.run(run(args))
    print(format_report(samples))
    failures = evaluate(samples, args.p95_sync, args.p95_full, args.p95_plan)
    for failure in failures:
        print(f"FAIL: {failure}")
    print("PASSED" if not failures else "FAILED")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
