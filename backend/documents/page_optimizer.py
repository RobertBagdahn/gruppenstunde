"""Page optimizer: adjusts layout parameters to fit content into target page count."""

from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Callable

from pdf_builder import LayoutParams, trial_build_pages


@dataclass
class ParamBounds:
    """Min/max bounds and step for an optimizable parameter."""

    attr: str
    min_val: float
    max_val: float
    step: float
    label: str  # for logging


# Priority order: least visible change first
COMPRESSION_ORDER: list[ParamBounds] = [
    ParamBounds("paragraph_spacing", 4.0, 8.0, 0.5, "Absatzabstand"),
    ParamBounds("block_spacing", 3.0, 12.0, 1.0, "Blockabstand"),
    ParamBounds("leading_factor", 1.1, 1.4, 0.05, "Zeilenhöhe"),
    ParamBounds("body_font_size", 9.0, 12.0, 0.5, "Schriftgröße"),
    ParamBounds("header_font_size", 14.0, 20.0, 1.0, "Überschrift"),
    ParamBounds("margin_top", 15.0, 25.0, 1.0, "Rand oben"),
    ParamBounds("margin_bottom", 15.0, 25.0, 1.0, "Rand unten"),
]


def optimize_layout(
    build_flowables_fn: Callable[[LayoutParams], list],
    target_pages: int,
    initial_params: LayoutParams | None = None,
) -> tuple[LayoutParams, list, list[str]]:
    """Optimize layout parameters to fit content into target_pages.

    Args:
        build_flowables_fn: Function that takes LayoutParams and returns flowables
        target_pages: Desired number of pages
        initial_params: Starting parameters (defaults used if None)

    Returns:
        Tuple of (optimized params, flowables, log messages)

    Raises:
        RuntimeError: If content cannot fit into target pages
    """
    params = copy.deepcopy(initial_params or LayoutParams())
    original_params = copy.deepcopy(params)
    log: list[str] = []

    flowables = build_flowables_fn(params)
    current_pages = trial_build_pages(flowables, params)

    if current_pages == target_pages:
        return params, flowables, log

    if current_pages > target_pages:
        # Compress
        for bounds in COMPRESSION_ORDER:
            current_val = getattr(params, bounds.attr)
            while current_pages > target_pages and current_val > bounds.min_val:
                current_val = max(current_val - bounds.step, bounds.min_val)
                setattr(params, bounds.attr, current_val)
                flowables = build_flowables_fn(params)
                current_pages = trial_build_pages(flowables, params)

            if current_pages <= target_pages:
                break

        if current_pages > target_pages:
            raise RuntimeError(
                f"Inhalt passt nicht auf {target_pages} Seite(n) "
                f"(minimum: {current_pages} Seiten). "
                f"Empfehlung: layout.pages auf {current_pages} setzen oder Texte kürzen."
            )
    else:
        # Expand (content too short for target pages)
        for bounds in reversed(COMPRESSION_ORDER):
            current_val = getattr(params, bounds.attr)
            while current_pages < target_pages and current_val < bounds.max_val:
                current_val = min(current_val + bounds.step, bounds.max_val)
                setattr(params, bounds.attr, current_val)
                flowables = build_flowables_fn(params)
                current_pages = trial_build_pages(flowables, params)

            if current_pages >= target_pages:
                break

    # Build log of changed parameters
    for bounds in COMPRESSION_ORDER:
        orig_val = getattr(original_params, bounds.attr)
        new_val = getattr(params, bounds.attr)
        if abs(orig_val - new_val) > 0.01:
            unit = "mm" if "spacing" in bounds.attr or "margin" in bounds.attr else "pt"
            if bounds.attr == "leading_factor":
                unit = "x"
            log.append(f"{bounds.label} {orig_val}{unit} → {new_val}{unit}")

    return params, flowables, log
