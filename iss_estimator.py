#!/usr/bin/env python3
"""
ISS (Inspection Selection System) Score Estimator

PDF-faithful implementation based on FMCSA "ISS Algorithm Description" (December 2012).
This module estimates ISS scores for carriers based on their BASIC alert patterns.

The ISS algorithm assigns carriers to groups (1-13) based on their alert patterns,
then maps those groups to score ranges:
- Groups 1-5: "Inspect" bucket (scores 75-99)
- Groups 7-12: "Optional" bucket (scores 50-74)
- Group 13: "Pass" bucket (scores 1-49)

For carriers with insufficient data, a separate algorithm applies based on
inspection counts and fleet size.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any
import random
import math


class ISSBucket(Enum):
    """ISS recommendation buckets."""
    INSPECT = "Inspect"      # Score 75-100, high priority for inspection
    OPTIONAL = "Optional"    # Score 50-74, inspector discretion
    PASS = "Pass"            # Score 1-49, low priority


class ISSSource(Enum):
    """Source algorithm used to calculate ISS score."""
    SAFETY = "SAFETY"                # Safety Algorithm (has sufficient data)
    INSUFFICIENT = "INSUFFICIENT"    # Insufficient Data Algorithm


@dataclass
class ISSResult:
    """Result of ISS estimation."""
    iss_score: int                   # 1-100
    bucket: ISSBucket                # Inspect/Optional/Pass
    source: ISSSource                # Which algorithm was used
    group: Optional[int] = None      # Group 1-13 (Safety Algorithm only)
    case: Optional[str] = None       # Case D2-D5 (Insufficient Data only)
    alerts: Dict[str, bool] = field(default_factory=dict)  # Which BASICs have alerts
    confidence: str = "estimated"    # Always "estimated" since we don't have real ISS


@dataclass
class ISSConfig:
    """Configuration for ISS estimation."""
    run_date: datetime = field(default_factory=datetime.now)
    seed: Optional[int] = None  # For reproducible random scores within ranges

    # Column mappings for BASIC percentiles (from basic.csv)
    col_unsafe: str = 'UNSAFE_DRIV_MEASURE'
    col_hos: str = 'HOS_DRIV_MEASURE'
    col_driver_fit: str = 'DRIV_FIT_MEASURE'
    col_csaa: str = 'CONTR_SUBST_MEASURE'
    col_veh_maint: str = 'VEH_MAINT_MEASURE'
    col_hm: str = 'HM_MEASURE'
    col_crash: str = 'CRASH_MEASURE'

    # Column mappings for BASIC alerts
    col_alert_unsafe: str = 'UNSAFE_DRIV_ALERT'
    col_alert_hos: str = 'HOS_DRIV_ALERT'
    col_alert_driver_fit: str = 'DRIV_FIT_ALERT'
    col_alert_csaa: str = 'CONTR_SUBST_ALERT'
    col_alert_veh_maint: str = 'VEH_MAINT_ALERT'
    col_alert_hm: str = 'HM_ALERT'
    col_alert_crash: str = 'CRASH_ALERT'


# Roadside BASICs (can be assessed during roadside inspection)
ROADSIDE_BASICS = {'HOS', 'DRIVER_FIT', 'CSAA', 'VEH_MAINT', 'HM'}

# All BASICs
ALL_BASICS = {'UNSAFE', 'HOS', 'DRIVER_FIT', 'CSAA', 'VEH_MAINT', 'HM', 'CRASH'}


def get_alert(row: Dict, col: str) -> bool:
    """Check if a BASIC has an alert (Y/Yes/True/1)."""
    val = str(row.get(col, '') or '').strip().upper()
    return val in ('Y', 'YES', 'TRUE', '1', 'X')


def get_percentile(row: Dict, col: str) -> Optional[float]:
    """Get BASIC percentile value (0-100), or None if not available."""
    val = row.get(col, '')
    if val is None or val == '':
        return None
    try:
        pct = float(str(val).strip())
        if 0 <= pct <= 100:
            return pct
        return None
    except (ValueError, TypeError):
        return None


def get_int(row: Dict, col: str, default: int = 0) -> int:
    """Get integer value from row."""
    val = row.get(col, '')
    if val is None or val == '':
        return default
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return default


def assign_group(alerts: Dict[str, bool], percentiles: Dict[str, Optional[float]],
                 n_alert_total: int, n_alert_roadside: int) -> Optional[int]:
    """
    Assign carrier to ISS group (1-13) based on alert patterns.

    Returns None if carrier has no BASIC data (insufficient data case).

    Group definitions from FMCSA ISS Algorithm Description:
    - Group 1: 4+ total alerts OR 2+ alerts with Unsafe/HOS/Crash at 85%+
    - Group 2: 3+ roadside alerts
    - Group 3: 2 roadside alerts
    - Group 4: 2+ total alerts with 1 roadside alert
    - Group 5: Single HOS alert only
    - Group 7: Single Unsafe Driving alert only
    - Group 8: Single Crash alert only
    - Group 9: Single Vehicle Maintenance alert only
    - Group 10: Single Driver Fitness alert only
    - Group 11: Single Controlled Substances/Alcohol alert only
    - Group 12: Single Hazardous Materials alert only
    - Group 13: Has BASIC data but no alerts
    """
    alert_unsafe = alerts.get('UNSAFE', False)
    alert_hos = alerts.get('HOS', False)
    alert_driver_fit = alerts.get('DRIVER_FIT', False)
    alert_csaa = alerts.get('CSAA', False)
    alert_veh_maint = alerts.get('VEH_MAINT', False)
    alert_hm = alerts.get('HM', False)
    alert_crash = alerts.get('CRASH', False)

    pct_unsafe = percentiles.get('UNSAFE')
    pct_hos = percentiles.get('HOS')
    pct_crash = percentiles.get('CRASH')

    # Check if carrier has any BASIC data
    has_any_percentile = any(p is not None for p in percentiles.values())

    if not has_any_percentile:
        return None  # Insufficient data - no BASIC scores at all

    # Group 1: High-risk carriers
    # 4+ total alerts OR 2+ alerts with Unsafe/HOS/Crash at 85%+
    if n_alert_total >= 4:
        return 1

    high_risk_alerts = 0
    if alert_unsafe and pct_unsafe is not None and pct_unsafe >= 85:
        high_risk_alerts += 1
    if alert_hos and pct_hos is not None and pct_hos >= 85:
        high_risk_alerts += 1
    if alert_crash and pct_crash is not None and pct_crash >= 85:
        high_risk_alerts += 1

    if n_alert_total >= 2 and high_risk_alerts >= 2:
        return 1

    # Group 2: 3+ roadside alerts
    if n_alert_roadside >= 3:
        return 2

    # Group 3: 2 roadside alerts
    if n_alert_roadside == 2:
        return 3

    # Group 4: 2+ total alerts with 1 roadside alert
    if n_alert_total >= 2 and n_alert_roadside == 1:
        return 4

    # Single alert groups (5, 7-12)
    if n_alert_total == 1:
        if alert_hos:
            return 5   # HOS only
        if alert_unsafe:
            return 7   # Unsafe Driving only
        if alert_crash:
            return 8   # Crash only
        if alert_veh_maint:
            return 9   # Vehicle Maintenance only
        if alert_driver_fit:
            return 10  # Driver Fitness only
        if alert_csaa:
            return 11  # Controlled Substances/Alcohol only
        if alert_hm:
            return 12  # Hazardous Materials only

    # Group 13: Has BASIC data but no alerts
    if has_any_percentile and n_alert_total == 0:
        return 13

    # Fallback - shouldn't reach here
    return 13


def safety_algorithm_score(group: int, rng: random.Random) -> int:
    """
    Calculate ISS score for Safety Algorithm based on group.

    Score ranges by group:
    - Groups 1-5 (Inspect): 75-99
    - Groups 7-12 (Optional): 50-74
    - Group 13 (Pass): 1-49

    Within each range, score is randomized for variation.
    """
    if group in (1, 2, 3, 4, 5):
        # Inspect bucket: 75-99
        # Higher groups get slightly lower scores within range
        base = 99 - (group - 1) * 4  # Group 1: ~99, Group 5: ~83
        variation = rng.randint(-3, 3)
        return max(75, min(99, base + variation))

    elif group in (7, 8, 9, 10, 11, 12):
        # Optional bucket: 50-74
        # Map groups 7-12 to descending scores
        base = 74 - (group - 7) * 4  # Group 7: ~74, Group 12: ~54
        variation = rng.randint(-3, 3)
        return max(50, min(74, base + variation))

    elif group == 13:
        # Pass bucket: 1-49
        # Randomize within range
        return rng.randint(25, 49)

    else:
        # Unknown group - default to middle of Optional
        return 62


def calculate_credibility(vehicle_insp_ct: int, driver_insp_ct: int) -> float:
    """
    Calculate credibility factor based on inspection counts.

    Credibility increases with more inspections, maxing out at 1.0.
    Based on FMCSA credibility standards.
    """
    # Vehicle inspections: full credibility at 5+
    veh_cred = min(1.0, vehicle_insp_ct / 5.0)

    # Driver inspections: full credibility at 3+
    drv_cred = min(1.0, driver_insp_ct / 3.0)

    # Combined credibility (weighted average)
    return (veh_cred + drv_cred) / 2.0


def insufficient_data_algorithm(carrier: Dict, basic_row: Dict,
                                 config: ISSConfig, rng: random.Random) -> ISSResult:
    """
    Calculate ISS score using Insufficient Data Algorithm.

    Cases (from FMCSA ISS Algorithm Description):
    - D2: Minimum inspections met (5 vehicle OR 3 driver) -> Score 50
    - D3: One-away from minimum (4 vehicle OR 2 driver) -> Score 55-62
    - D4: Zero inspections -> Score based on fleet size (63-69)
    - D5: Some inspections but below threshold -> Score 50-69 based on ranking
    """
    # Get inspection counts
    vehicle_insp_ct = get_int(basic_row, 'VEHICLE_INSP_CT', 0)
    driver_insp_ct = get_int(basic_row, 'DRIVER_INSP_CT', 0)

    # Get fleet size for D4 case
    power_units = get_int(carrier, 'POWER_UNITS', 0)
    if power_units == 0:
        power_units = get_int(carrier, 'TRUCK_UNITS', 0)
    if power_units == 0:
        power_units = get_int(carrier, 'TOT_PWR', 1)

    # Case D2: Minimum inspections met
    if vehicle_insp_ct >= 5 or driver_insp_ct >= 3:
        return ISSResult(
            iss_score=50,
            bucket=ISSBucket.OPTIONAL,
            source=ISSSource.INSUFFICIENT,
            case="D2",
            confidence="estimated"
        )

    # Case D3: One-away from minimum
    if vehicle_insp_ct == 4 or driver_insp_ct == 2:
        score = rng.randint(55, 62)
        return ISSResult(
            iss_score=score,
            bucket=ISSBucket.OPTIONAL,
            source=ISSSource.INSUFFICIENT,
            case="D3",
            confidence="estimated"
        )

    # Case D4: Zero inspections
    if vehicle_insp_ct == 0 and driver_insp_ct == 0:
        # Score based on fleet size (larger fleets = higher score)
        if power_units >= 100:
            score = 69
        elif power_units >= 50:
            score = 68
        elif power_units >= 20:
            score = 67
        elif power_units >= 10:
            score = 66
        elif power_units >= 5:
            score = 65
        elif power_units >= 2:
            score = 64
        else:
            score = 63

        return ISSResult(
            iss_score=score,
            bucket=ISSBucket.OPTIONAL,
            source=ISSSource.INSUFFICIENT,
            case="D4",
            confidence="estimated"
        )

    # Case D5: Some inspections but below threshold
    # Score based on a 20-bin ranking (50-69)
    total_insp = vehicle_insp_ct + driver_insp_ct
    bin_score = min(19, total_insp * 3)  # Map to 0-19 range
    score = 50 + bin_score

    return ISSResult(
        iss_score=score,
        bucket=ISSBucket.OPTIONAL,
        source=ISSSource.INSUFFICIENT,
        case="D5",
        confidence="estimated"
    )


def estimate_iss(carrier: Dict, basic_row: Optional[Dict],
                 config: Optional[ISSConfig] = None) -> ISSResult:
    """
    Estimate ISS score for a carrier.

    Args:
        carrier: Carrier record from census data
        basic_row: BASIC scores record (may be None if no data)
        config: ISS configuration (uses defaults if None)

    Returns:
        ISSResult with estimated score, bucket, and metadata
    """
    if config is None:
        config = ISSConfig()

    # Initialize random number generator
    dot = str(carrier.get('DOT_NUMBER', ''))
    seed = config.seed if config.seed else hash(dot) % (2**31)
    rng = random.Random(seed)

    # If no BASIC data, use Insufficient Data Algorithm
    if basic_row is None:
        return insufficient_data_algorithm(carrier, {}, config, rng)

    # Extract alerts
    alerts = {
        'UNSAFE': get_alert(basic_row, config.col_alert_unsafe),
        'HOS': get_alert(basic_row, config.col_alert_hos),
        'DRIVER_FIT': get_alert(basic_row, config.col_alert_driver_fit),
        'CSAA': get_alert(basic_row, config.col_alert_csaa),
        'VEH_MAINT': get_alert(basic_row, config.col_alert_veh_maint),
        'HM': get_alert(basic_row, config.col_alert_hm),
        'CRASH': get_alert(basic_row, config.col_alert_crash),
    }

    # Extract percentiles
    percentiles = {
        'UNSAFE': get_percentile(basic_row, config.col_unsafe),
        'HOS': get_percentile(basic_row, config.col_hos),
        'DRIVER_FIT': get_percentile(basic_row, config.col_driver_fit),
        'CSAA': get_percentile(basic_row, config.col_csaa),
        'VEH_MAINT': get_percentile(basic_row, config.col_veh_maint),
        'HM': get_percentile(basic_row, config.col_hm),
        'CRASH': get_percentile(basic_row, config.col_crash),
    }

    # Count alerts
    n_alert_total = sum(1 for a in alerts.values() if a)
    n_alert_roadside = sum(1 for basic, alert in alerts.items()
                          if alert and basic in ROADSIDE_BASICS)

    # Assign group
    group = assign_group(alerts, percentiles, n_alert_total, n_alert_roadside)

    # If no group assigned (no BASIC data), use Insufficient Data Algorithm
    if group is None:
        return insufficient_data_algorithm(carrier, basic_row, config, rng)

    # Calculate score using Safety Algorithm
    score = safety_algorithm_score(group, rng)

    # Determine bucket
    if score >= 75:
        bucket = ISSBucket.INSPECT
    elif score >= 50:
        bucket = ISSBucket.OPTIONAL
    else:
        bucket = ISSBucket.PASS

    return ISSResult(
        iss_score=score,
        bucket=bucket,
        source=ISSSource.SAFETY,
        group=group,
        alerts=alerts,
        confidence="estimated"
    )


def get_iss_display_data(carrier: Dict, basic_row: Optional[Dict],
                         config: Optional[ISSConfig] = None) -> Dict[str, Any]:
    """
    Get ISS data formatted for template display.

    Returns a dictionary with:
    - iss_score: Numeric score (1-100)
    - iss_bucket: "Inspect", "Optional", or "Pass"
    - iss_source: "SAFETY" or "INSUFFICIENT"
    - iss_group: Group number (1-13) or None
    - iss_alerts: Dict of BASIC -> bool
    - iss_confidence: "estimated"
    """
    result = estimate_iss(carrier, basic_row, config)

    return {
        'iss_score': result.iss_score,
        'iss_bucket': result.bucket.value,
        'iss_source': result.source.value,
        'iss_group': result.group,
        'iss_case': result.case,
        'iss_alerts': result.alerts,
        'iss_confidence': result.confidence,
    }
