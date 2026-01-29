#!/usr/bin/env python3
"""
FRED Score Data Processing Pipeline

This script combines data from FMCSA files (census, basic, crashes, inspections, violations),
filters out carriers with no power units or passenger-only authorization,
calculates safety rankings, and exports to JSON, SQLite, CSV, and PostgreSQL.

Usage:
    python3 fred_postgres.py              # Full run
    python3 fred_postgres.py --sample 100 # Process only 100 carriers (for testing)
    python3 fred_postgres.py --no-postgres  # Skip PostgreSQL export

Output:
    - fred_data.js (JavaScript format for browser)
    - fred_scores.db (SQLite database)
    - fred_scores.csv (CSV export)
    - PostgreSQL database (fred_carriers table)
"""

import os
import sys
import json
import sqlite3
import csv
import re
import gc
import argparse
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Optional, Tuple, Any, Set
import statistics

# Polars for fast data loading
try:
    import polars as pl
    HAS_POLARS = True
except ImportError:
    HAS_POLARS = False
    print("WARNING: polars not installed. Run: pip install polars")
    print("Falling back to slow CSV loading...")

# Optional PostgreSQL support
try:
    import psycopg2
    from psycopg2.extras import execute_values
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

# Import ISS estimator
try:
    from iss_estimator import get_iss_display_data, ISSConfig
    HAS_ISS = True
except ImportError:
    HAS_ISS = False
    print("Warning: iss_estimator.py not found, ISS scores will not be calculated")

# ============================================================================
# CONFIGURATION
# ============================================================================

DATA_DIR = "fmcsa_data"
OUTPUT_JS = "fred_data.js"
OUTPUT_SQLITE = "fred_scores.db"
OUTPUT_CSV = "fred_scores.csv"
OUTPUT_DASHBOARD = "fred_dashboard.html"

# PostgreSQL connection settings
PG_HOST = os.environ.get('PG_HOST', 'localhost')
PG_PORT = os.environ.get('PG_PORT', '5432')
PG_DB = os.environ.get('PG_DB', 'fred_scores')
PG_USER = os.environ.get('PG_USER', 'postgres')
PG_PASS = os.environ.get('PG_PASS', '')

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def safe_int(value: Any, default: int = 0) -> int:
    """Safely convert value to integer."""
    if value is None or value == '':
        return default
    try:
        return int(float(str(value).strip().strip('"')))
    except (ValueError, TypeError):
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert value to float."""
    if value is None or value == '':
        return default
    try:
        return float(str(value).strip().strip('"'))
    except (ValueError, TypeError):
        return default


def is_true_value(value: str) -> bool:
    """Check if a value represents true/yes/1."""
    if value is None:
        return False
    return str(value).upper().strip() in ('Y', 'YES', 'TRUE', '1', 'X')


def safe_str(value: Any, default: str = '') -> str:
    """Safely convert value to string, handling None."""
    if value is None:
        return default
    return str(value)


def get_any(row: Dict, *keys, default=None) -> Any:
    """Get first matching key from row."""
    for key in keys:
        if key in row and row[key] not in (None, ''):
            return row[key]
    return default


def normalize_fieldname(name: str) -> str:
    """Normalize CSV header names for tolerant lookups."""
    if name is None:
        return ''
    name = name.strip().lower()
    name = re.sub(r'[^a-z0-9]+', '_', name)
    return name.strip('_')


def augment_row_with_normalized_keys(row: Dict[str, Any]) -> Dict[str, Any]:
    """Add normalized-key aliases to a DictReader row."""
    augmented = dict(row)
    for original_key, value in row.items():
        normalized = normalize_fieldname(original_key)
        if normalized and normalized not in augmented:
            augmented[normalized] = value
    return augmented


# ============================================================================
# DATA LOADING FUNCTIONS (Polars-optimized)
# ============================================================================

def load_csv_polars(filename: str, key_field: str = None, keeper_dots: Set[str] = None) -> Tuple[pl.DataFrame, Dict[str, List[Dict]]]:
    """Load a CSV using Polars with optional filtering by DOT numbers."""
    filepath = os.path.join(DATA_DIR, filename)
    filter_mode = keeper_dots is not None
    print(f"Loading {filepath}{' [filtered]' if filter_mode else ''}...", flush=True)

    if not os.path.exists(filepath):
        print(f"  WARNING: File not found: {filepath}")
        return pl.DataFrame(), {}

    # Use scan_csv for lazy evaluation (memory efficient)
    df = pl.scan_csv(
        filepath,
        encoding='utf8-lossy',
        infer_schema_length=10000,
        ignore_errors=True,
    )

    # Find the DOT column
    dot_col = None
    if key_field:
        # Get column names from a small sample
        sample_cols = pl.read_csv(filepath, n_rows=1, infer_schema_length=10000, ignore_errors=True).columns
        for candidate in [key_field, 'DOT_NUMBER', 'DOT_Number', 'dot_number']:
            if candidate in sample_cols:
                dot_col = candidate
                break

    # Filter to keeper DOTs if provided
    if filter_mode and dot_col:
        # Convert keeper_dots to a list for Polars
        keeper_list = list(keeper_dots)
        df = df.filter(pl.col(dot_col).cast(pl.Utf8).str.strip_chars().is_in(keeper_list))

    # Collect the dataframe
    df = df.collect()
    row_count = len(df)

    print(f"  Loaded {row_count:,} rows", flush=True)

    # Build index by DOT number if key_field provided
    indexed: Dict[str, List[Dict]] = defaultdict(list)
    if dot_col and row_count > 0:
        # Convert to dicts and index
        rows = df.to_dicts()
        for row in rows:
            dot = str(row.get(dot_col, '') or '').strip()
            if dot:
                indexed[dot].append(row)
        print(f"  Indexed {len(indexed):,} unique DOTs", flush=True)

    return df, dict(indexed)


def load_csv_filtered_polars(filename: str, keeper_dots: Set[str], select_cols: List[str] = None) -> Dict[str, List[Dict]]:
    """Load a CSV and return only rows matching keeper DOT numbers, indexed by DOT.

    Args:
        filename: CSV file to load
        keeper_dots: Set of DOT numbers to keep
        select_cols: Optional list of columns to keep (reduces memory for large files)
    """
    filepath = os.path.join(DATA_DIR, filename)
    print(f"Loading {filepath} [filtered mode]...", flush=True)

    if not os.path.exists(filepath):
        print(f"  WARNING: File not found: {filepath}")
        return {}

    # Get column names (use same error handling as main read)
    sample_cols = pl.read_csv(filepath, n_rows=1, infer_schema_length=10000, ignore_errors=True).columns
    dot_col = None
    for candidate in ['DOT_NUMBER', 'DOT_Number', 'dot_number']:
        if candidate in sample_cols:
            dot_col = candidate
            break

    if not dot_col:
        print(f"  WARNING: No DOT column found in {filename}")
        return {}

    # Convert keeper_dots to list of strings for Polars
    keeper_list = [str(d) for d in keeper_dots]

    # Build lazy query
    lazy_df = pl.scan_csv(
        filepath,
        encoding='utf8-lossy',
        infer_schema_length=10000,
        ignore_errors=True,
    ).filter(
        pl.col(dot_col).cast(pl.Utf8).str.strip_chars().is_in(keeper_list)
    )

    # Select only needed columns if specified (reduces memory dramatically)
    if select_cols:
        # Always include DOT column
        cols_to_select = [dot_col] + [c for c in select_cols if c != dot_col and c in sample_cols]
        lazy_df = lazy_df.select(cols_to_select)

    df = lazy_df.collect()

    row_count = len(df)
    print(f"  Kept {row_count:,} rows for {len(keeper_dots):,} target carriers", flush=True)

    if row_count == 0:
        return {}

    # Index by DOT - convert to dicts once then group
    print(f"  Converting to dicts and indexing...", flush=True)

    # Get DOT values as a list for fast lookup
    dot_values = df[dot_col].cast(pl.Utf8).str.strip_chars().to_list()
    rows = df.to_dicts()

    # Build index using zip (faster than repeated dict access)
    indexed: Dict[str, List[Dict]] = defaultdict(list)
    for dot, row in zip(dot_values, rows):
        if dot:
            indexed[dot].append(row)

    print(f"  Indexed into {len(indexed):,} DOT groups", flush=True)
    return dict(indexed)


# Legacy functions for fallback when Polars not available
def load_csv(filename: str, key_field: Any = None, index_only: bool = False) -> Tuple[List[Dict], Dict]:
    """Load a CSV and optionally index it by a key field (legacy, slow)."""
    filepath = os.path.join(DATA_DIR, filename)
    print(f"Loading {filepath}{'  [index-only mode]' if index_only else ''} [SLOW MODE]...", flush=True)

    if not os.path.exists(filepath):
        print(f"  WARNING: File not found: {filepath}")
        return [], {}

    candidates: List[str]
    if key_field is None:
        candidates = []
    elif isinstance(key_field, (list, tuple, set)):
        candidates = [str(k) for k in key_field if k]
    else:
        candidates = [str(key_field)]

    rows: List[Dict[str, Any]] = []
    indexed: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    row_count = 0

    with open(filepath, 'r', encoding='utf-8', errors='replace', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            row_count += 1
            if index_only:
                if candidates:
                    key = ''
                    for k in candidates:
                        if k in row and row[k]:
                            key = str(row[k]).strip()
                            break
                    if key:
                        indexed[key].append(row)
            else:
                row = augment_row_with_normalized_keys(row)
                rows.append(row)
                if candidates:
                    key = str(get_any(row, *candidates, default='') or '').strip()
                    if key:
                        indexed[key].append(row)

    print(f"  Loaded {row_count:,} rows{f' ({len(indexed):,} unique keys)' if index_only else ''}", flush=True)
    return rows, dict(indexed)


def load_csv_filtered(filename: str, key_fields: List[str], keeper_dots: Set[str]) -> Tuple[List[Dict], Dict]:
    """Load a CSV and index only rows matching keeper DOT numbers (legacy, slow)."""
    filepath = os.path.join(DATA_DIR, filename)
    print(f"Loading {filepath} [filtered mode] [SLOW MODE]...", flush=True)

    if not os.path.exists(filepath):
        print(f"  WARNING: File not found: {filepath}")
        return [], {}

    indexed: Dict[str, List[Dict]] = defaultdict(list)
    row_count = 0
    kept_count = 0

    with open(filepath, 'r', encoding='utf-8', errors='replace', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            row_count += 1

            dot = ''
            for k in key_fields:
                if k in row and row[k]:
                    dot = str(row[k]).strip()
                    break

            if dot and dot in keeper_dots:
                indexed[dot].append(row)
                kept_count += 1

            if row_count % 1000000 == 0:
                print(f"  Processed {row_count:,} rows, kept {kept_count:,}...", flush=True)

    print(f"  Loaded {row_count:,} rows, kept {kept_count:,} for {len(indexed):,} carriers", flush=True)
    return [], dict(indexed)


def should_exclude_carrier(carrier: Dict) -> Tuple[bool, str]:
    """Filter for FOR-HIRE PROPERTY (motor truck) carriers only."""
    # Rule 1: EXCLUDE inactive / not-in-service
    status_code = safe_str(carrier.get('STATUS_CODE', '')).upper().strip()
    if status_code and status_code != 'A':
        return True, 'inactive_status'

    # Rule 2: EXCLUDE passenger carriers
    classdef_upper = safe_str(carrier.get('CLASSDEF', '')).upper()
    if 'PRIVATE PASSENGER' in classdef_upper or 'PASSENGER' in classdef_upper.split(';'):
        return True, 'passenger_operation'

    if is_true_value(carrier.get('CRGO_PASSENGERS', '')):
        return True, 'passenger_operation'

    passenger_equipment_fields = [
        'OWNCOACH', 'TRMCOACH', 'TRPCOACH', 'OWNBUS_16', 'TRMBUS_16', 'TRPBUS_16',
        'OWNSCHOOL_1_8', 'OWNSCHOOL_9_15', 'OWNSCHOOL_16',
        'TRMSCHOOL_1_8', 'TRMSCHOOL_9_15', 'TRMSCHOOL_16',
        'TRPSCHOOL_1_8', 'TRPSCHOOL_9_15', 'TRPSCHOOL_16',
        'OWNVAN_1_8', 'OWNVAN_9_15', 'TRMVAN_1_8', 'TRMVAN_9_15', 'TRPVAN_1_8', 'TRPVAN_9_15',
        'OWNLIMO_1_8', 'OWNLIMO_9_15', 'OWNLIMO_16',
        'TRMLIMO_1_8', 'TRMLIMO_9_15', 'TRMLIMO_16',
        'TRPLIMO_1_8', 'TRPLIMO_9_15', 'TRPLIMO_16',
    ]
    total_passenger_equipment = sum(safe_int(carrier.get(f, '')) for f in passenger_equipment_fields)
    if total_passenger_equipment > 0:
        return True, 'passenger_operation'

    if is_true_value(carrier.get('PRIVATE_PASSENGER_BUSINESS', '')):
        return True, 'passenger_operation'
    if is_true_value(carrier.get('PRIVATE_PASSENGER_NONBUSINESS', '')):
        return True, 'passenger_operation'

    # Rule 3: EXCLUDE entities with no truck/tractor power
    truck_power_fields = [
        'TRUCK_UNITS', 'POWER_UNITS',
        'OWNTRUCK', 'OWNTRACT', 'TRMTRUCK', 'TRMTRACT', 'TRPTRUCK', 'TRPTRACT'
    ]
    total_truck_power = sum(safe_int(carrier.get(f, '')) for f in truck_power_fields)
    if total_truck_power <= 0:
        return True, 'no_truck_power'

    # Rule 4: Check for-hire authority
    classdef = safe_str(carrier.get('CLASSDEF', '')).upper()
    has_authorized_for_hire = 'AUTHORIZED FOR HIRE' in classdef
    has_exempt_for_hire = 'EXEMPT FOR HIRE' in classdef
    has_private_property = 'PRIVATE PROPERTY' in classdef
    has_us_mail = 'U. S. MAIL' in classdef or 'U.S. MAIL' in classdef or 'US MAIL' in classdef

    if has_authorized_for_hire or has_exempt_for_hire:
        return False, ''

    if has_us_mail:
        return False, ''

    if has_private_property:
        return True, 'private_not_for_hire'

    # Fallback: Check legacy authority fields
    is_private_property = is_true_value(carrier.get('PRIVATE_PROPERTY', ''))
    is_authorized_for_hire = is_true_value(carrier.get('AUTHORIZED_FOR_HIRE', ''))
    is_exempt_for_hire = is_true_value(carrier.get('EXEMPT_FOR_HIRE', ''))

    if is_private_property and not is_authorized_for_hire and not is_exempt_for_hire:
        return True, 'private_not_for_hire'

    if is_authorized_for_hire or is_exempt_for_hire:
        return False, ''

    other_authority = (
        is_true_value(carrier.get('US_MAIL', '')) or
        is_true_value(carrier.get('FEDERAL_GOVERNMENT', '')) or
        is_true_value(carrier.get('STATE_GOVERNMENT', '')) or
        is_true_value(carrier.get('LOCAL_GOVERNMENT', '')) or
        is_true_value(carrier.get('INDIAN_TRIBE', '')) or
        is_true_value(carrier.get('MIGRANT', ''))
    )
    if other_authority:
        return False, ''

    return True, 'no_for_hire_authority'


def parse_fmcsa_date(date_str: str) -> Optional[datetime]:
    """Parse FMCSA date format (DD-MMM-YY) to datetime."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip('"'), '%d-%b-%y')
    except ValueError:
        return None


def get_quarter_period(dt: datetime) -> str:
    """Get the quarter period label (e.g., 'Q1 2024')."""
    quarter = (dt.month - 1) // 3 + 1
    return f"Q{quarter} {dt.year}"


def load_violation_trends_polars(keeper_dots: Optional[Set[str]] = None) -> Dict[str, Dict]:
    """Load violations and aggregate by DOT number, BASIC category, and quarterly period using Polars."""
    filepath = os.path.join(DATA_DIR, 'violations.csv')
    filter_mode = keeper_dots is not None
    print(f"Loading violation trends from {filepath}{' [filtered]' if filter_mode else ''}...", flush=True)

    if not os.path.exists(filepath):
        print(f"  WARNING: File not found: {filepath}")
        return {}

    cutoff_date = datetime.now() - timedelta(days=730)

    # Read with Polars - only the columns we need
    needed_cols = ['DOT_Number', 'Insp_Date', 'BASIC_Desc', 'Severity_Weight']

    df = pl.scan_csv(
        filepath,
        encoding='utf8-lossy',
        infer_schema_length=10000,
        ignore_errors=True,
    )

    # Get actual column names
    sample_cols = pl.read_csv(filepath, n_rows=1, infer_schema_length=10000, ignore_errors=True).columns
    cols_to_select = [c for c in needed_cols if c in sample_cols]

    if not cols_to_select:
        print(f"  WARNING: Required columns not found")
        return {}

    df = df.select(cols_to_select)

    # Filter to keeper DOTs if provided
    if filter_mode:
        keeper_list = list(keeper_dots)
        df = df.filter(pl.col('DOT_Number').cast(pl.Utf8).str.strip_chars().is_in(keeper_list))

    # Collect
    df = df.collect()
    total_rows = len(df)
    print(f"  Loaded {total_rows:,} violation records", flush=True)

    if total_rows == 0:
        return {}

    # Parse dates and filter to last 2 years
    # FMCSA date format: DD-MMM-YY (e.g., "15-Jan-24")
    df = df.with_columns([
        pl.col('DOT_Number').cast(pl.Utf8).str.strip_chars().alias('dot'),
        pl.col('BASIC_Desc').cast(pl.Utf8).str.strip_chars().alias('category'),
        pl.col('Severity_Weight').cast(pl.Int32, strict=False).fill_null(0).alias('severity'),
    ])

    # Try to parse the date
    df = df.with_columns([
        pl.col('Insp_Date').str.to_date('%d-%b-%y', strict=False).alias('date')
    ])

    # Filter to valid dates in last 2 years
    df = df.filter(
        (pl.col('date').is_not_null()) &
        (pl.col('date') >= cutoff_date.date())
    )

    filtered_rows = len(df)
    print(f"  {filtered_rows:,} violations in last 2 years", flush=True)

    if filtered_rows == 0:
        return {}

    # Add quarter period column
    df = df.with_columns([
        (pl.lit('Q') + ((pl.col('date').dt.month() - 1) // 3 + 1).cast(pl.Utf8) +
         pl.lit(' ') + pl.col('date').dt.year().cast(pl.Utf8)).alias('period')
    ])

    # Aggregate: count violations by DOT, category, period
    trends_df = df.group_by(['dot', 'category', 'period']).agg([
        pl.len().alias('count'),
        (pl.col('severity') >= 7).sum().alias('critical_count')
    ])

    # Convert to nested dict structure
    trends: Dict[str, Dict[str, Dict[str, int]]] = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    critical_trends: Dict[str, Dict[str, Dict[str, int]]] = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    included_count = 0
    critical_count = 0

    for row in trends_df.to_dicts():
        dot = row['dot']
        category = row['category']
        period = row['period']
        count = row['count']
        crit = row['critical_count']

        if dot and category and period:
            trends[dot][category][period] = count
            included_count += count
            if crit > 0:
                critical_trends[dot][category][period] = crit
                critical_count += crit

    print(f"  {included_count:,} total violations, {critical_count:,} critical", flush=True)
    print(f"  Trends available for {len(trends):,} carriers", flush=True)

    result = {}
    all_dots = set(trends.keys()) | set(critical_trends.keys())
    for dot in all_dots:
        result[dot] = {
            'trends': {cat: dict(periods) for cat, periods in trends[dot].items()},
            'critical_trends': {cat: dict(periods) for cat, periods in critical_trends[dot].items()},
            'critical_details': {}
        }

    return result


def load_inspection_trends_polars(keeper_dots: Optional[Set[str]] = None) -> Dict[str, Dict[str, Dict[str, int]]]:
    """Load inspections and aggregate by DOT number and quarterly period using Polars.

    Returns dict of {dot: {period: {'count': N, 'oos': M}}}
    """
    filepath = os.path.join(DATA_DIR, 'inspections.csv')
    filter_mode = keeper_dots is not None
    print(f"Loading inspection trends from {filepath}{' [filtered]' if filter_mode else ''}...", flush=True)

    if not os.path.exists(filepath):
        print(f"  WARNING: File not found: {filepath}")
        return {}

    cutoff_date = datetime.now() - timedelta(days=730)

    # Read with Polars - only the columns we need
    needed_cols = ['DOT_NUMBER', 'INSP_DATE', 'OOS_TOTAL']

    df = pl.scan_csv(
        filepath,
        encoding='utf8-lossy',
        infer_schema_length=10000,
        ignore_errors=True,
    )

    # Get actual column names
    sample_cols = pl.read_csv(filepath, n_rows=1, infer_schema_length=10000, ignore_errors=True).columns
    cols_to_select = [c for c in needed_cols if c in sample_cols]

    if len(cols_to_select) < 2:
        print(f"  WARNING: Required columns not found")
        return {}

    df = df.select(cols_to_select)

    # Filter to keeper DOTs if provided
    if filter_mode:
        keeper_list = [str(d) for d in keeper_dots]
        df = df.filter(pl.col('DOT_NUMBER').cast(pl.Utf8).str.strip_chars().is_in(keeper_list))

    # Collect
    df = df.collect()
    total_rows = len(df)
    print(f"  Loaded {total_rows:,} inspection records", flush=True)

    if total_rows == 0:
        return {}

    # Parse dates and OOS flag
    df = df.with_columns([
        pl.col('DOT_NUMBER').cast(pl.Utf8).str.strip_chars().alias('dot'),
        pl.col('OOS_TOTAL').cast(pl.Int32, strict=False).fill_null(0).alias('oos_count'),
    ])

    # Try to parse the date (FMCSA format: YYYYMMDD like "20230128")
    df = df.with_columns([
        pl.col('INSP_DATE').cast(pl.Utf8).str.to_date('%Y%m%d', strict=False).alias('date')
    ])

    # Filter to valid dates in last 2 years
    df = df.filter(
        (pl.col('date').is_not_null()) &
        (pl.col('date') >= cutoff_date.date())
    )

    filtered_rows = len(df)
    print(f"  {filtered_rows:,} inspections in last 2 years", flush=True)

    if filtered_rows == 0:
        return {}

    # Add quarter period column
    df = df.with_columns([
        (pl.lit('Q') + ((pl.col('date').dt.month() - 1) // 3 + 1).cast(pl.Utf8) +
         pl.lit(' ') + pl.col('date').dt.year().cast(pl.Utf8)).alias('period')
    ])

    # Aggregate: count inspections and OOS by DOT and period
    trends_df = df.group_by(['dot', 'period']).agg([
        pl.len().alias('count'),
        (pl.col('oos_count') > 0).sum().alias('oos')
    ])

    # Convert to nested dict structure: {dot: {period: {'count': N, 'oos': M}}}
    result: Dict[str, Dict[str, Dict[str, int]]] = defaultdict(dict)

    for row in trends_df.to_dicts():
        dot = row['dot']
        period = row['period']
        count = row['count']
        oos = row['oos']
        if dot and period:
            result[dot][period] = {'count': count, 'oos': oos}

    print(f"  Inspection trends available for {len(result):,} carriers", flush=True)
    return dict(result)


def load_violation_trends(keeper_dots: Optional[Set[str]] = None) -> Dict[str, Dict]:
    """Load violations and aggregate by DOT number, BASIC category, and quarterly period (legacy, slow)."""
    filepath = os.path.join(DATA_DIR, 'violations.csv')
    filter_mode = keeper_dots is not None
    print(f"Loading violation trends from {filepath}{' [filtered mode]' if filter_mode else ''} [SLOW MODE]...", flush=True)

    if not os.path.exists(filepath):
        print(f"  WARNING: File not found: {filepath}")
        return {}

    cutoff_date = datetime.now() - timedelta(days=730)

    trends: Dict[str, Dict[str, Dict[str, int]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(int))
    )
    critical_trends: Dict[str, Dict[str, Dict[str, int]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(int))
    )

    row_count = 0
    included_count = 0
    critical_count = 0

    with open(filepath, 'r', encoding='utf-8', errors='replace', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            row_count += 1

            date_str = row.get('Insp_Date', '')
            dt = parse_fmcsa_date(date_str)
            if not dt or dt < cutoff_date:
                continue

            dot = str(row.get('DOT_Number', '') or '').strip().strip('"')
            category = str(row.get('BASIC_Desc', '') or '').strip().strip('"')

            if not dot or not category:
                continue

            if filter_mode and dot not in keeper_dots:
                continue

            period = get_quarter_period(dt)
            trends[dot][category][period] += 1
            included_count += 1

            try:
                severity = int(str(row.get('Severity_Weight', '0') or '0').strip().strip('"'))
            except ValueError:
                severity = 0

            if severity >= 7:
                critical_trends[dot][category][period] += 1
                critical_count += 1

            if row_count % 1000000 == 0:
                print(f"  Processed {row_count:,} violations...", flush=True)

    print(f"  Processed {row_count:,} violations, {included_count:,} in last 2 years ({critical_count:,} critical)", flush=True)
    print(f"  Trends available for {len(trends):,} carriers", flush=True)

    result = {}
    all_dots = set(trends.keys()) | set(critical_trends.keys())
    for dot in all_dots:
        result[dot] = {
            'trends': {cat: dict(periods) for cat, periods in trends[dot].items()},
            'critical_trends': {cat: dict(periods) for cat, periods in critical_trends[dot].items()},
            'critical_details': {}
        }

    return result


def prefilter_census_polars(df: 'pl.DataFrame') -> 'pl.DataFrame':
    """Apply fast Polars-native pre-filtering to eliminate most non-qualifying carriers."""
    original_count = len(df)
    cols = set(df.columns)

    # Filter 1: Active status only
    if 'STATUS_CODE' in cols:
        df = df.filter(
            (pl.col('STATUS_CODE').is_null()) |
            (pl.col('STATUS_CODE').cast(pl.Utf8).str.strip_chars().str.to_uppercase() == 'A') |
            (pl.col('STATUS_CODE').cast(pl.Utf8).str.strip_chars() == '')
        )
        print(f"    After status filter: {len(df):,} rows", flush=True)

    # Filter 2: Must have truck power units > 0
    truck_cols = ['OWNTRUCK', 'OWNTRACT', 'TRMTRUCK', 'TRMTRACT', 'TRPTRUCK', 'TRPTRACT', 'TRUCK_UNITS', 'POWER_UNITS']
    avail_truck = [c for c in truck_cols if c in cols]
    if avail_truck:
        expr = pl.lit(0)
        for c in avail_truck:
            expr = expr + pl.col(c).cast(pl.Int64, strict=False).fill_null(0)
        df = df.filter(expr > 0)
        print(f"    After truck power filter: {len(df):,} rows", flush=True)

    # Filter 3: Exclude passenger equipment (buses, coaches, schools, limos, vans)
    pass_cols = ['OWNCOACH', 'TRMCOACH', 'TRPCOACH', 'OWNBUS_16', 'TRMBUS_16', 'TRPBUS_16',
                 'OWNSCHOOL_1_8', 'OWNSCHOOL_9_15', 'OWNSCHOOL_16',
                 'TRMSCHOOL_1_8', 'TRMSCHOOL_9_15', 'TRMSCHOOL_16',
                 'TRPSCHOOL_1_8', 'TRPSCHOOL_9_15', 'TRPSCHOOL_16',
                 'OWNVAN_1_8', 'OWNVAN_9_15', 'TRMVAN_1_8', 'TRMVAN_9_15', 'TRPVAN_1_8', 'TRPVAN_9_15',
                 'OWNLIMO_1_8', 'OWNLIMO_9_15', 'OWNLIMO_16',
                 'TRMLIMO_1_8', 'TRMLIMO_9_15', 'TRMLIMO_16',
                 'TRPLIMO_1_8', 'TRPLIMO_9_15', 'TRPLIMO_16']
    avail_pass = [c for c in pass_cols if c in cols]
    if avail_pass:
        expr = pl.lit(0)
        for c in avail_pass:
            expr = expr + pl.col(c).cast(pl.Int64, strict=False).fill_null(0)
        df = df.filter(expr == 0)
        print(f"    After passenger equip filter: {len(df):,} rows", flush=True)

    # Filter 4: Exclude PRIVATE PASSENGER in CLASSDEF
    if 'CLASSDEF' in cols:
        df = df.filter(
            ~pl.col('CLASSDEF').cast(pl.Utf8).str.to_uppercase().str.contains('PRIVATE PASSENGER')
        )
        print(f"    After private passenger filter: {len(df):,} rows", flush=True)

    # Filter 5: Must have for-hire authority (keep if CLASSDEF contains FOR HIRE, US MAIL, or certain flags)
    if 'CLASSDEF' in cols:
        classdef_ok = (
            pl.col('CLASSDEF').cast(pl.Utf8).str.to_uppercase().str.contains('FOR HIRE') |
            pl.col('CLASSDEF').cast(pl.Utf8).str.to_uppercase().str.contains('U.S. MAIL') |
            pl.col('CLASSDEF').cast(pl.Utf8).str.to_uppercase().str.contains('US MAIL') |
            pl.col('CLASSDEF').cast(pl.Utf8).str.to_uppercase().str.contains('U. S. MAIL')
        )
        # Also check authority flag columns if present
        auth_cols = ['AUTHORIZED_FOR_HIRE', 'EXEMPT_FOR_HIRE', 'US_MAIL', 'FEDERAL_GOVERNMENT',
                     'STATE_GOVERNMENT', 'LOCAL_GOVERNMENT', 'INDIAN_TRIBE', 'MIGRANT']
        avail_auth = [c for c in auth_cols if c in cols]
        for c in avail_auth:
            classdef_ok = classdef_ok | (pl.col(c).cast(pl.Utf8).str.to_uppercase().is_in(['Y', 'YES', 'TRUE', '1', 'X']))

        df = df.filter(classdef_ok)
        print(f"    After for-hire authority filter: {len(df):,} rows", flush=True)

    print(f"  Pre-filter: {original_count:,} -> {len(df):,} ({100*len(df)/original_count:.1f}%)", flush=True)
    return df


def load_all_data(sample_size: int = 0) -> Dict[str, Any]:
    """Load all FMCSA data files with early filtering to save memory.

    Args:
        sample_size: If > 0, only load related data for first N carriers (for testing).
    """
    print("\n" + "=" * 60)
    print(f"LOADING DATA FILES {'(Polars - FAST)' if HAS_POLARS else '(csv - SLOW)'}")
    print("=" * 60)

    # Step 1: Load SMS Census index first (needed for filtering)
    print("Loading SMS Census index for filtering...")
    sms_census_by_dot: Dict[str, Dict] = {}
    sms_path = os.path.join(DATA_DIR, 'sms_census.csv')

    if HAS_POLARS and os.path.exists(sms_path):
        sms_df = pl.read_csv(sms_path, encoding='utf8-lossy', infer_schema_length=10000, ignore_errors=True)
        for row in sms_df.to_dicts():
            dot = str(row.get('DOT_NUMBER', '') or '').strip()
            if dot:
                sms_census_by_dot[dot] = row
        print(f"  Indexed {len(sms_census_by_dot):,} SMS records")
        del sms_df
    elif os.path.exists(sms_path):
        with open(sms_path, 'r', encoding='utf-8', errors='replace', newline='') as f:
            reader = csv.DictReader(f)
            for row in reader:
                dot = str(row.get('DOT_NUMBER', '') or '').strip()
                if dot:
                    sms_census_by_dot[dot] = row
        print(f"  Indexed {len(sms_census_by_dot):,} SMS records")

    authority_fields = [
        'AUTHORIZED_FOR_HIRE', 'EXEMPT_FOR_HIRE', 'PRIVATE_PROPERTY',
        'PRIVATE_PASSENGER_BUSINESS', 'PRIVATE_PASSENGER_NONBUSINESS',
        'PRIVATE_ONLY', 'MIGRANT', 'US_MAIL', 'FEDERAL_GOVERNMENT',
        'STATE_GOVERNMENT', 'LOCAL_GOVERNMENT', 'INDIAN_TRIBE', 'OP_OTHER'
    ]

    # Step 2: Load and filter census.csv
    print("Loading and filtering census.csv (for-hire property carriers only)...")
    census_rows: List[Dict] = []
    census_by_dot: Dict[str, List[Dict]] = {}
    exclusion_counts = {
        'inactive_status': 0,
        'passenger_operation': 0,
        'no_truck_power': 0,
        'private_not_for_hire': 0,
        'no_for_hire_authority': 0,
    }

    census_path = os.path.join(DATA_DIR, 'census.csv')

    if HAS_POLARS:
        # Load census with Polars (much faster)
        census_df = pl.read_csv(census_path, encoding='utf8-lossy', infer_schema_length=10000, ignore_errors=True)
        total_rows = len(census_df)
        print(f"  Loaded {total_rows:,} rows with Polars", flush=True)

        # Apply Polars pre-filter to dramatically reduce row count before Python processing
        print("  Applying Polars pre-filters...", flush=True)
        census_df = prefilter_census_polars(census_df)
        prefiltered = len(census_df)

        # Convert to list of dicts - Polars pre-filtering already did the heavy work
        print(f"  Converting {prefiltered:,} pre-filtered carriers to dicts...", flush=True)
        census_rows = census_df.to_dicts()
        del census_df

        # Index by DOT number
        print(f"  Indexing by DOT number...", flush=True)
        for row in census_rows:
            dot = str(row.get('DOT_NUMBER', '') or '').strip()
            if dot:
                census_by_dot.setdefault(dot, []).append(row)

        total_rows = prefiltered  # For reporting
    else:
        # Fallback to slow CSV loading
        total_rows = 0
        with open(census_path, 'r', encoding='utf-8', errors='replace', newline='') as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_rows += 1

                row = augment_row_with_normalized_keys(row)

                dot = row.get('DOT_NUMBER', '')
                if dot in sms_census_by_dot:
                    sms_record = sms_census_by_dot[dot]
                    for field in authority_fields:
                        if field in sms_record:
                            row[field] = sms_record[field]

                should_exclude, reason = should_exclude_carrier(row)
                if should_exclude:
                    if reason in exclusion_counts:
                        exclusion_counts[reason] += 1
                    continue

                census_rows.append(row)
                if dot:
                    census_by_dot.setdefault(dot, []).append(row)

                if total_rows % 500000 == 0:
                    print(f"  Processed {total_rows:,} rows, kept {len(census_rows):,}...", flush=True)

    print(f"  Processed {total_rows:,} total rows")
    print(f"  Removed (inactive status): {exclusion_counts['inactive_status']:,}")
    print(f"  Removed (passenger operation): {exclusion_counts['passenger_operation']:,}")
    print(f"  Removed (no truck power): {exclusion_counts['no_truck_power']:,}")
    print(f"  Removed (private, not for-hire): {exclusion_counts['private_not_for_hire']:,}")
    print(f"  Removed (no for-hire authority): {exclusion_counts['no_for_hire_authority']:,}")
    print(f"  Kept {len(census_rows):,} FOR-HIRE PROPERTY carriers")

    del sms_census_by_dot

    # Step 3: Get list of DOT numbers we care about
    keeper_dots = set(census_by_dot.keys())

    # Apply sample limit BEFORE loading related data (critical for performance)
    if sample_size > 0 and len(keeper_dots) > sample_size:
        sample_dots = list(census_by_dot.keys())[:sample_size]
        keeper_dots = set(sample_dots)
        # Also filter census data to only sampled carriers
        census_rows = [r for r in census_rows if str(r.get('DOT_NUMBER', '')) in keeper_dots]
        census_by_dot = {k: v for k, v in census_by_dot.items() if k in keeper_dots}
        print(f"  Sample mode: limited to {len(keeper_dots):,} carriers")

    print(f"\nLoading related data for {len(keeper_dots):,} carriers...")

    if HAS_POLARS:
        # Use Polars-based loading (FAST)
        basic_by_dot = load_csv_filtered_polars("basic.csv", keeper_dots)
        crashes_by_dot = load_csv_filtered_polars("crashes.csv", keeper_dots)
        # Only load columns we actually use from large files to save memory
        inspections_by_dot = load_csv_filtered_polars("inspections.csv", keeper_dots,
            select_cols=['OOS_TOTAL'])
        violations_by_dot = load_csv_filtered_polars("violations.csv", keeper_dots,
            select_cols=['BASIC_Desc'])
        violation_trends = load_violation_trends_polars(keeper_dots)
        inspection_trends = load_inspection_trends_polars(keeper_dots)
    else:
        # Fallback to slow loading
        dot_keys = ['DOT_NUMBER', 'DOT_Number', 'dot_number']
        _, basic_by_dot = load_csv_filtered("basic.csv", dot_keys, keeper_dots)
        _, crashes_by_dot = load_csv_filtered("crashes.csv", dot_keys, keeper_dots)
        _, inspections_by_dot = load_csv_filtered("inspections.csv", dot_keys, keeper_dots)
        _, violations_by_dot = load_csv_filtered("violations.csv", dot_keys, keeper_dots)
        violation_trends = load_violation_trends(keeper_dots)
        inspection_trends = {}  # Not implemented for slow mode

    return {
        'census': census_rows,
        'census_by_dot': census_by_dot,
        'basic_by_dot': basic_by_dot,
        'crashes_by_dot': crashes_by_dot,
        'inspections_by_dot': inspections_by_dot,
        'violations_by_dot': violations_by_dot,
        'violation_trends': violation_trends,
        'inspection_trends': inspection_trends
    }


# ============================================================================
# SCORING FUNCTIONS
# ============================================================================

def calculate_experience_score(carrier: Dict) -> float:
    """Calculate experience score based on operational history."""
    score = 100.0

    add_date_str = safe_str(carrier.get('ADD_DATE', ''))
    if add_date_str and len(add_date_str) >= 8:
        try:
            add_year = int(add_date_str[:4])
            add_month = int(add_date_str[4:6])
            add_day = int(add_date_str[6:8])
            add_date = datetime(add_year, add_month, add_day)
            years_operating = (datetime.now() - add_date).days / 365.25

            if years_operating < 1:
                score -= 30
            elif years_operating < 2:
                score -= 20
            elif years_operating < 3:
                score -= 10
            elif years_operating < 5:
                score -= 5
        except (ValueError, TypeError):
            pass

    return max(0, score)


def calculate_safety_score(carrier: Dict, basic_data: List[Dict]) -> Tuple[float, List[str]]:
    """Calculate safety score based on BASIC scores and alerts."""
    score = 100.0
    flags = []

    if not basic_data:
        return score, flags

    basic = basic_data[0]

    basic_categories = [
        ('UNSAFE_DRIV_MEASURE', 'UNSAFE_DRIV_ALERT', 'Unsafe Driving'),
        ('HOS_DRIV_MEASURE', 'HOS_DRIV_ALERT', 'Hours-of-Service'),
        ('DRIV_FIT_MEASURE', 'DRIV_FIT_ALERT', 'Driver Fitness'),
        ('CONTR_SUBST_MEASURE', 'CONTR_SUBST_ALERT', 'Controlled Substances'),
        ('VEH_MAINT_MEASURE', 'VEH_MAINT_ALERT', 'Vehicle Maintenance'),
        ('HM_MEASURE', 'HM_ALERT', 'Hazardous Materials'),
        ('CRASH_MEASURE', 'CRASH_ALERT', 'Crash Indicator'),
    ]

    for measure_col, alert_col, name in basic_categories:
        measure = safe_float(basic.get(measure_col))
        has_alert = is_true_value(basic.get(alert_col, ''))

        if has_alert:
            score -= 15
            flags.append(f"BASIC Alert: {name}")
        elif measure >= 75:
            score -= 10
        elif measure >= 65:
            score -= 5

    return max(0, score), flags


def calculate_crash_score(carrier: Dict, crashes: List[Dict]) -> Tuple[float, List[str]]:
    """Calculate crash score."""
    score = 100.0
    flags = []

    if not crashes:
        return score, flags

    total_crashes = len(crashes)
    fatalities = 0
    injuries = 0
    hazmat_releases = 0

    for crash in crashes:
        fatalities += safe_int(crash.get('FATALITIES', 0))
        injuries += safe_int(crash.get('INJURIES', 0))
        if is_true_value(crash.get('HAZMAT_RELEASED', '')):
            hazmat_releases += 1

    if fatalities > 0:
        score -= min(50, fatalities * 25)
        flags.append(f"FATAL crashes ({fatalities} fatalities)")

    if injuries > 0:
        score -= min(30, injuries * 5)
        flags.append(f"Multiple injury crashes ({injuries} injuries)")

    if hazmat_releases > 0:
        score -= min(20, hazmat_releases * 10)
        flags.append(f"Hazmat releases ({hazmat_releases})")

    if total_crashes >= 5:
        score -= 15
        flags.append(f"High crash frequency ({total_crashes} crashes)")
    elif total_crashes >= 3:
        score -= 10
        flags.append(f"High crash frequency ({total_crashes} crashes)")
    elif total_crashes >= 1:
        flags.append(f"High crash frequency ({total_crashes} crashes)")

    return max(0, score), flags


def calculate_inspection_score(carrier: Dict, inspections: List[Dict], violations: List[Dict]) -> Tuple[float, List[str]]:
    """Calculate inspection score."""
    score = 100.0
    flags = []

    if not inspections:
        return score, flags

    total_inspections = len(inspections)
    oos_count = sum(1 for i in inspections if is_true_value(i.get('OOS_TOTAL', '')))

    if total_inspections > 0:
        oos_rate = (oos_count / total_inspections) * 100
        if oos_rate >= 50:
            score -= 30
            flags.append(f"High OOS rate ({oos_rate:.1f}%)")
        elif oos_rate >= 30:
            score -= 20
            flags.append(f"Elevated OOS rate ({oos_rate:.1f}%)")
        elif oos_rate >= 20:
            score -= 10

    if violations:
        violation_by_basic = defaultdict(int)
        for v in violations:
            basic = v.get('BASIC_Desc', 'Unknown')
            violation_by_basic[basic] += 1

        for basic, count in violation_by_basic.items():
            if count >= 10:
                flags.append(f"Pattern: {basic} ({count} violations)")

    return max(0, score), flags


def process_carrier(carrier: Dict, data: Dict) -> Dict:
    """Process a single carrier and calculate all scores."""
    dot = str(carrier.get('DOT_NUMBER', '')).strip()

    basic_data = data['basic_by_dot'].get(dot, [])
    crashes = data['crashes_by_dot'].get(dot, [])
    inspections = data['inspections_by_dot'].get(dot, [])
    violations = data['violations_by_dot'].get(dot, [])
    trends_data = data['violation_trends'].get(dot, {})
    inspection_trends_data = data['inspection_trends'].get(dot, {})

    experience_score = calculate_experience_score(carrier)
    safety_score, safety_flags = calculate_safety_score(carrier, basic_data)
    crash_score, crash_flags = calculate_crash_score(carrier, crashes)
    inspection_score, inspection_flags = calculate_inspection_score(carrier, inspections, violations)

    all_flags = safety_flags + crash_flags + inspection_flags

    mileage = safe_int(carrier.get('MCS150_MILEAGE', 0))
    if mileage == 0:
        mileage = safe_int(carrier.get('TOT_MILEAGE', 0))

    iss_data = {}
    if HAS_ISS and basic_data:
        try:
            iss_data = get_iss_display_data(carrier, basic_data[0])
        except Exception:
            pass

    # Build commodities list from CRGO_* fields
    commodity_fields = [
        ('CRGO_GENFREIGHT', 'General Freight'),
        ('CRGO_HOUSEHOLD', 'Household Goods'),
        ('CRGO_METALSHEET', 'Metal: Sheets/Coils/Rolls'),
        ('CRGO_MOTOVEH', 'Motor Vehicles'),
        ('CRGO_DRIVETOW', 'Drive/Tow Away'),
        ('CRGO_LOGPOLE', 'Logs/Poles/Beams/Lumber'),
        ('CRGO_BLDGMAT', 'Building Materials'),
        ('CRGO_MOBILEHOME', 'Mobile Homes'),
        ('CRGO_MACHLRG', 'Machinery/Large Objects'),
        ('CRGO_PRODUCE', 'Fresh Produce'),
        ('CRGO_LIQGAS', 'Liquids/Gases'),
        ('CRGO_INTERMODAL', 'Intermodal Containers'),
        ('CRGO_OILFIELD', 'Oilfield Equipment'),
        ('CRGO_LIVESTOCK', 'Livestock'),
        ('CRGO_GRAINFEED', 'Grain/Feed/Hay'),
        ('CRGO_COALCOKE', 'Coal/Coke'),
        ('CRGO_MEAT', 'Meat'),
        ('CRGO_GARBAGE', 'Garbage/Refuse'),
        ('CRGO_USMAIL', 'US Mail'),
        ('CRGO_CHEM', 'Chemicals'),
        ('CRGO_DRYBULK', 'Dry Bulk'),
        ('CRGO_COLDFOOD', 'Refrigerated Food'),
        ('CRGO_BEVERAGES', 'Beverages'),
        ('CRGO_PAPERPROD', 'Paper Products'),
        ('CRGO_UTILITY', 'Utility'),
        ('CRGO_FARMSUPP', 'Farm Supplies'),
        ('CRGO_CONSTRUCT', 'Construction'),
        ('CRGO_WATERWELL', 'Water Well'),
    ]
    commodities = [name for field, name in commodity_fields if is_true_value(carrier.get(field, ''))]
    cargo_other_desc = safe_str(carrier.get('CRGO_CARGOOTHR_DESC', '')).strip().strip('"')
    if is_true_value(carrier.get('CRGO_CARGOOTHR', '')) and cargo_other_desc:
        commodities.append(f'Other: {cargo_other_desc}')

    # Equipment counts
    own_trucks = safe_int(carrier.get('OWNTRUCK', 0))
    own_tractors = safe_int(carrier.get('OWNTRACT', 0))
    own_trailers = safe_int(carrier.get('OWNTRAIL', 0))
    term_trucks = safe_int(carrier.get('TRMTRUCK', 0))
    term_tractors = safe_int(carrier.get('TRMTRACT', 0))
    term_trailers = safe_int(carrier.get('TRMTRAIL', 0))
    trip_trucks = safe_int(carrier.get('TRPTRUCK', 0))
    trip_tractors = safe_int(carrier.get('TRPTRACT', 0))
    trip_trailers = safe_int(carrier.get('TRPTRAIL', 0))

    result = {
        'dot_number': dot,
        'legal_name': carrier.get('LEGAL_NAME', ''),
        'dba_name': carrier.get('DBA_NAME', ''),

        # Full address
        'physical_street': carrier.get('PHY_STREET', ''),
        'physical_city': carrier.get('PHY_CITY', ''),
        'physical_state': carrier.get('PHY_STATE', ''),
        'physical_zip': carrier.get('PHY_ZIP', ''),
        'physical_country': carrier.get('PHY_COUNTRY', ''),
        'mailing_street': carrier.get('CARRIER_MAILING_STREET', ''),
        'mailing_city': carrier.get('CARRIER_MAILING_CITY', ''),
        'mailing_state': carrier.get('CARRIER_MAILING_STATE', ''),
        'mailing_zip': carrier.get('CARRIER_MAILING_ZIP', ''),

        # Contact info
        'phone': carrier.get('PHONE', '') or carrier.get('TELEPHONE', ''),
        'fax': carrier.get('FAX', ''),
        'email': carrier.get('EMAIL_ADDRESS', ''),
        'officer_1': carrier.get('COMPANY_OFFICER_1', ''),
        'officer_2': carrier.get('COMPANY_OFFICER_2', ''),

        # Fleet info
        'power_units': safe_int(carrier.get('POWER_UNITS', 0)),
        'drivers': safe_int(carrier.get('DRIVERS', 0)),
        'total_drivers': safe_int(carrier.get('TOTAL_DRIVERS', 0)),
        'cdl_drivers': safe_int(carrier.get('TOTAL_CDL', 0)),

        # Equipment breakdown
        'own_trucks': own_trucks,
        'own_tractors': own_tractors,
        'own_trailers': own_trailers,
        'term_trucks': term_trucks,
        'term_tractors': term_tractors,
        'term_trailers': term_trailers,
        'trip_trucks': trip_trucks,
        'trip_tractors': trip_tractors,
        'trip_trailers': trip_trailers,

        # Operating scope
        'carrier_operation': carrier.get('CARRIER_OPERATION', ''),
        'classdef': carrier.get('CLASSDEF', ''),
        'hm_indicator': is_true_value(carrier.get('HM_Ind', '')),
        'interstate_beyond_100': is_true_value(carrier.get('INTERSTATE_BEYOND_100_MILES', '')),
        'interstate_within_100': is_true_value(carrier.get('INTERSTATE_WITHIN_100_MILES', '')),
        'intrastate_beyond_100': is_true_value(carrier.get('INTRASTATE_BEYOND_100_MILES', '')),
        'intrastate_within_100': is_true_value(carrier.get('INTRASTATE_WITHIN_100_MILES', '')),

        # Commodities
        'commodities': '; '.join(commodities) if commodities else '',

        # Business info
        'business_type': carrier.get('BUSINESS_ORG_DESC', ''),
        'duns_number': carrier.get('DUN_BRADSTREET_NO', ''),
        'add_date': carrier.get('ADD_DATE', ''),
        'mcs150_date': carrier.get('MCS150_DATE', ''),

        # Safety rating
        'safety_rating': carrier.get('SAFETY_RATING', ''),
        'safety_rating_date': carrier.get('SAFETY_RATING_DATE', ''),

        # Scores
        'experience_score': round(experience_score, 1),
        'safety_score': round(safety_score, 1),
        'crash_score': round(crash_score, 1),
        'inspection_score': round(inspection_score, 1),

        'combined_score': round(
            experience_score * 0.15 +
            safety_score * 0.35 +
            crash_score * 0.30 +
            inspection_score * 0.20, 1
        ),

        'risk_flags': '; '.join(all_flags) if all_flags else '',
        'annual_mileage': mileage,
        'has_sufficient_mileage': mileage >= 100000,

        'iss_score': iss_data.get('iss_score'),
        'iss_bucket': iss_data.get('iss_bucket'),
        'iss_source': iss_data.get('iss_source'),

        'crash_count': len(crashes),
        'inspection_count': len(inspections),
        'violation_count': len(violations),

        'violation_trends': trends_data.get('trends', {}),
        'critical_trends': trends_data.get('critical_trends', {}),
        'inspection_trends': inspection_trends_data,

        'rank': None,
        'fred_score_grade': None,
        'insurance_rating': None,
    }

    return result


def process_all_carriers(carriers: List[Dict], data: Dict) -> List[Dict]:
    """Process all carriers and calculate scores."""
    print("\n" + "=" * 60)
    print("CALCULATING SCORES")
    print("=" * 60)

    results = []
    sufficient_mileage_count = 0

    for i, carrier in enumerate(carriers):
        result = process_carrier(carrier, data)
        results.append(result)

        if result['has_sufficient_mileage']:
            sufficient_mileage_count += 1

        if (i + 1) % 100000 == 0:
            print(f"  Processed {i + 1:,} / {len(carriers):,} carriers...", flush=True)

    print(f"  Processed {len(carriers):,} carriers")
    print(f"    With sufficient mileage: {sufficient_mileage_count:,}")
    print(f"    Insufficient mileage: {len(carriers) - sufficient_mileage_count:,}")

    calculate_insurance_ratings(results)
    assign_fred_grades(results)

    return results


def calculate_insurance_ratings(results: List[Dict]):
    """Calculate insurance rating multipliers."""
    print("\n" + "=" * 60)
    print("CALCULATING INSURANCE RATINGS")
    print("=" * 60)

    eligible = [r for r in results if r['has_sufficient_mileage']]
    print(f"  Pass 1: Computing per-carrier metrics...")
    print(f"    Eligible carriers (>= 100,000 miles): {len(eligible):,}")

    if not eligible:
        return

    total_violations = sum(r['violation_count'] for r in eligible)
    total_crashes = sum(r['crash_count'] for r in eligible)
    total_mileage = sum(r['annual_mileage'] for r in eligible)

    if total_mileage > 0:
        global_viol_rate = (total_violations / total_mileage) * 100000
        global_crash_rate = (total_crashes / total_mileage) * 100000
    else:
        global_viol_rate = 0
        global_crash_rate = 0

    print(f"    Global Avg Violations/100k: {global_viol_rate:.3f}")
    print(f"    Global Avg Crashes/100k: {global_crash_rate:.3f}")
    print(f"  Pass 2: Computing multipliers and final scores...")

    ratings = []
    for r in eligible:
        if r['annual_mileage'] > 0:
            mileage_100k = r['annual_mileage'] / 100000
            viol_rate = r['violation_count'] / mileage_100k
            crash_rate = r['crash_count'] / mileage_100k

            viol_mult = (viol_rate / global_viol_rate) if global_viol_rate > 0 else 1.0
            crash_mult = (crash_rate / global_crash_rate) if global_crash_rate > 0 else 1.0

            rating = 100 * (0.4 * viol_mult + 0.6 * crash_mult)
            rating = max(1, min(500, rating))

            r['insurance_rating'] = round(rating, 2)
            ratings.append(rating)

    if ratings:
        print(f"\n  Insurance Rating Statistics:")
        print(f"    Mean: {statistics.mean(ratings):.2f}")
        print(f"    Median: {statistics.median(ratings):.2f}")
        print(f"    P10: {sorted(ratings)[len(ratings)//10]:.2f}")
        print(f"    P90: {sorted(ratings)[9*len(ratings)//10]:.2f}")
        print(f"    Min: {min(ratings):.2f}")
        print(f"    Max: {max(ratings):.2f}")


def assign_fred_grades(results: List[Dict]):
    """Assign FRED score letter grades."""
    print("\n" + "=" * 60)
    print("ASSIGNING FRED SCORE GRADES")
    print("=" * 60)

    eligible = [r for r in results if r['has_sufficient_mileage']]
    eligible.sort(key=lambda x: x['combined_score'], reverse=True)

    grade_thresholds = [
        (0.03, 'A+'), (0.10, 'A'), (0.20, 'A-'),
        (0.30, 'B+'), (0.45, 'B'), (0.55, 'B-'),
        (0.65, 'C+'), (0.75, 'C'), (0.85, 'C-'),
        (0.90, 'D+'), (0.96, 'D'), (0.98, 'D-'),
        (1.00, 'F'),
    ]

    grade_counts = defaultdict(int)

    for i, r in enumerate(eligible):
        percentile = i / len(eligible)
        r['rank'] = i + 1

        for threshold, grade in grade_thresholds:
            if percentile <= threshold:
                r['fred_score_grade'] = grade
                grade_counts[grade] += 1
                break

    print(f"\n  FRED Score Grade Distribution ({len(eligible):,} eligible carriers):")
    for threshold, grade in grade_thresholds:
        count = grade_counts[grade]
        pct = (count / len(eligible) * 100) if eligible else 0
        print(f"    {grade:>2}: {count:>6,} ({pct:>5.1f}%)")


# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================

def export_to_js(results: List[Dict], filepath: str):
    """Export results to JavaScript file."""
    print(f"\nExporting to JavaScript: {filepath}")

    js_results = []
    for r in results:
        # Include all fields including violation_trends and critical_trends
        js_results.append(r)

    with open(filepath, 'w') as f:
        f.write("// FRED Score Data - Generated " + datetime.now().isoformat() + "\n")
        f.write("const FRED_DATA = ")
        json.dump(js_results, f)
        f.write(";\n")

    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f"  Written {len(results):,} carriers ({size_mb:.1f} MB)")


def export_to_sqlite(results: List[Dict], filepath: str):
    """Export results to SQLite database."""
    print(f"\nExporting to SQLite: {filepath}")

    if os.path.exists(filepath):
        os.remove(filepath)

    conn = sqlite3.connect(filepath)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE carriers (
            dot_number TEXT PRIMARY KEY,
            legal_name TEXT,
            dba_name TEXT,

            -- Address
            physical_street TEXT,
            physical_city TEXT,
            physical_state TEXT,
            physical_zip TEXT,
            physical_country TEXT,
            mailing_street TEXT,
            mailing_city TEXT,
            mailing_state TEXT,
            mailing_zip TEXT,

            -- Contact
            phone TEXT,
            fax TEXT,
            email TEXT,
            officer_1 TEXT,
            officer_2 TEXT,

            -- Fleet
            power_units INTEGER,
            drivers INTEGER,
            total_drivers INTEGER,
            cdl_drivers INTEGER,

            -- Equipment
            own_trucks INTEGER,
            own_tractors INTEGER,
            own_trailers INTEGER,
            term_trucks INTEGER,
            term_tractors INTEGER,
            term_trailers INTEGER,
            trip_trucks INTEGER,
            trip_tractors INTEGER,
            trip_trailers INTEGER,

            -- Operating scope
            carrier_operation TEXT,
            classdef TEXT,
            hm_indicator INTEGER,
            interstate_beyond_100 INTEGER,
            interstate_within_100 INTEGER,
            intrastate_beyond_100 INTEGER,
            intrastate_within_100 INTEGER,

            -- Commodities
            commodities TEXT,

            -- Business
            business_type TEXT,
            duns_number TEXT,
            add_date TEXT,
            mcs150_date TEXT,

            -- Safety rating
            safety_rating TEXT,
            safety_rating_date TEXT,

            -- Scores
            experience_score REAL,
            safety_score REAL,
            crash_score REAL,
            inspection_score REAL,
            combined_score REAL,
            risk_flags TEXT,
            annual_mileage INTEGER,

            -- ISS
            iss_score INTEGER,
            iss_bucket TEXT,

            -- Counts
            crash_count INTEGER,
            inspection_count INTEGER,
            violation_count INTEGER,

            -- Ranking
            rank INTEGER,
            fred_score_grade TEXT,
            insurance_rating REAL,

            -- Trend data (JSON)
            violation_trends TEXT,
            critical_trends TEXT,
            inspection_trends TEXT
        )
    ''')

    for r in results:
        cursor.execute('''
            INSERT INTO carriers VALUES (
                ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
            )
        ''', (
            r['dot_number'], r['legal_name'], r['dba_name'],
            r.get('physical_street'), r['physical_city'], r['physical_state'],
            r.get('physical_zip'), r.get('physical_country'),
            r.get('mailing_street'), r.get('mailing_city'),
            r.get('mailing_state'), r.get('mailing_zip'),
            r.get('phone'), r.get('fax'), r.get('email'),
            r.get('officer_1'), r.get('officer_2'),
            r['power_units'], r['drivers'],
            r.get('total_drivers'), r.get('cdl_drivers'),
            r.get('own_trucks'), r.get('own_tractors'), r.get('own_trailers'),
            r.get('term_trucks'), r.get('term_tractors'), r.get('term_trailers'),
            r.get('trip_trucks'), r.get('trip_tractors'), r.get('trip_trailers'),
            r.get('carrier_operation'), r.get('classdef'),
            1 if r.get('hm_indicator') else 0,
            1 if r.get('interstate_beyond_100') else 0,
            1 if r.get('interstate_within_100') else 0,
            1 if r.get('intrastate_beyond_100') else 0,
            1 if r.get('intrastate_within_100') else 0,
            r.get('commodities'),
            r.get('business_type'), r.get('duns_number'),
            r.get('add_date'), r.get('mcs150_date'),
            r.get('safety_rating'), r.get('safety_rating_date'),
            r['experience_score'], r['safety_score'],
            r['crash_score'], r['inspection_score'], r['combined_score'],
            r['risk_flags'], r['annual_mileage'],
            r.get('iss_score'), r.get('iss_bucket'),
            r['crash_count'], r['inspection_count'], r['violation_count'],
            r['rank'], r['fred_score_grade'], r.get('insurance_rating'),
            json.dumps(r.get('violation_trends', {})),
            json.dumps(r.get('critical_trends', {})),
            json.dumps(r.get('inspection_trends', {}))
        ))

    cursor.execute('CREATE INDEX idx_state ON carriers(physical_state)')
    cursor.execute('CREATE INDEX idx_grade ON carriers(fred_score_grade)')
    cursor.execute('CREATE INDEX idx_commodities ON carriers(commodities)')
    conn.commit()
    conn.close()

    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f"  Written {len(results):,} carriers ({size_mb:.1f} MB)")


def export_to_csv(results: List[Dict], filepath: str):
    """Export results to CSV file."""
    print(f"\nExporting to CSV: {filepath}")

    fieldnames = [
        'dot_number', 'legal_name', 'dba_name',
        'physical_city', 'physical_state', 'physical_zip',
        'power_units', 'drivers', 'annual_mileage',
        'experience_score', 'safety_score', 'crash_score', 'inspection_score',
        'combined_score', 'fred_score_grade', 'rank',
        'iss_score', 'iss_bucket',
        'crash_count', 'inspection_count', 'violation_count',
        'insurance_rating', 'risk_flags'
    ]

    with open(filepath, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(results)

    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f"  Written {len(results):,} carriers ({size_mb:.1f} MB)")


def export_to_postgres(results: List[Dict]):
    """Export results to PostgreSQL database."""
    if not HAS_POSTGRES:
        print("\nSkipping PostgreSQL export (psycopg2 not installed)")
        return

    print(f"\nExporting to PostgreSQL: {PG_DB}")

    try:
        conn = psycopg2.connect(
            host=PG_HOST, port=PG_PORT,
            dbname=PG_DB, user=PG_USER, password=PG_PASS
        )
    except Exception as e:
        print(f"  ERROR connecting to PostgreSQL: {e}")
        return

    cursor = conn.cursor()
    cursor.execute('DROP TABLE IF EXISTS fred_carriers')
    cursor.execute('''
        CREATE TABLE fred_carriers (
            dot_number TEXT PRIMARY KEY,
            legal_name TEXT, dba_name TEXT,
            physical_city TEXT, physical_state TEXT,
            power_units INTEGER, drivers INTEGER,
            experience_score REAL, safety_score REAL,
            crash_score REAL, inspection_score REAL, combined_score REAL,
            risk_flags TEXT, annual_mileage INTEGER,
            iss_score INTEGER, iss_bucket TEXT,
            crash_count INTEGER, inspection_count INTEGER, violation_count INTEGER,
            rank INTEGER, fred_score_grade TEXT, insurance_rating REAL
        )
    ''')

    values = [
        (r['dot_number'], r['legal_name'], r['dba_name'],
         r['physical_city'], r['physical_state'],
         r['power_units'], r['drivers'],
         r['experience_score'], r['safety_score'],
         r['crash_score'], r['inspection_score'], r['combined_score'],
         r['risk_flags'], r['annual_mileage'],
         r.get('iss_score'), r.get('iss_bucket'),
         r['crash_count'], r['inspection_count'], r['violation_count'],
         r['rank'], r['fred_score_grade'], r.get('insurance_rating'))
        for r in results
    ]

    execute_values(cursor, 'INSERT INTO fred_carriers VALUES %s', values)
    cursor.execute('CREATE INDEX idx_fred_state ON fred_carriers(physical_state)')
    conn.commit()
    cursor.execute('SELECT COUNT(*) FROM fred_carriers')
    count = cursor.fetchone()[0]
    conn.close()
    print(f"  Written {count:,} carriers to PostgreSQL")


def export_to_dashboard_html(results: List[Dict], filepath: str):
    """Export results to an interactive HTML dashboard with Chart.js visualizations."""
    print(f"\nExporting to Dashboard HTML: {filepath}")

    # Filter to carriers with violation data for the dashboard
    carriers_with_data = [r for r in results if r.get('violation_trends') or r.get('critical_trends')]
    print(f"  Carriers with violation trend data: {len(carriers_with_data):,}")

    # Create a lighter version for the dashboard (exclude some heavy fields for search index)
    dashboard_data = []
    for r in results:
        dashboard_data.append({
            'dot_number': r['dot_number'],
            'legal_name': r['legal_name'],
            'dba_name': r['dba_name'],
            'physical_city': r['physical_city'],
            'physical_state': r['physical_state'],
            'power_units': r['power_units'],
            'drivers': r['drivers'],
            'experience_score': r['experience_score'],
            'safety_score': r['safety_score'],
            'crash_score': r['crash_score'],
            'inspection_score': r['inspection_score'],
            'combined_score': r['combined_score'],
            'fred_score_grade': r['fred_score_grade'],
            'rank': r['rank'],
            'insurance_rating': r.get('insurance_rating'),
            'risk_flags': r['risk_flags'],
            'crash_count': r['crash_count'],
            'inspection_count': r['inspection_count'],
            'violation_count': r['violation_count'],
            'annual_mileage': r['annual_mileage'],
            'violation_trends': r.get('violation_trends', {}),
            'critical_trends': r.get('critical_trends', {}),
        })

    total_carriers = len(results)

    html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FRED Score Dashboard - Carrier Violation Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }}
        .header {{
            background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
            color: white;
            padding: 20px 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header h1 {{
            font-size: 24px;
            font-weight: 600;
        }}
        .header p {{
            opacity: 0.8;
            font-size: 14px;
            margin-top: 5px;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }}
        .search-section {{
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }}
        .search-section h2 {{
            font-size: 18px;
            margin-bottom: 15px;
            color: #2c5282;
        }}
        .search-container {{
            position: relative;
        }}
        #carrierSearch {{
            width: 100%;
            padding: 14px 20px;
            font-size: 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            outline: none;
            transition: border-color 0.2s;
        }}
        #carrierSearch:focus {{
            border-color: #3182ce;
        }}
        .search-results {{
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            max-height: 400px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: none;
        }}
        .search-result-item {{
            padding: 12px 20px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
        }}
        .search-result-item:hover {{
            background: #f7fafc;
        }}
        .search-result-item .carrier-name {{
            font-weight: 600;
            color: #2d3748;
        }}
        .search-result-item .carrier-info {{
            font-size: 13px;
            color: #718096;
            margin-top: 2px;
        }}
        .carrier-details {{
            display: none;
        }}
        .carrier-details.active {{
            display: block;
        }}
        .carrier-header {{
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }}
        .carrier-title {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 20px;
        }}
        .carrier-title h2 {{
            font-size: 24px;
            color: #1a365d;
        }}
        .carrier-title .dot-number {{
            font-size: 14px;
            color: #718096;
            font-weight: normal;
        }}
        .grade-badge {{
            font-size: 36px;
            font-weight: 700;
            padding: 10px 25px;
            border-radius: 12px;
            color: white;
        }}
        .grade-A {{ background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); }}
        .grade-B {{ background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%); }}
        .grade-C {{ background: linear-gradient(135deg, #d69e2e 0%, #b7791f 100%); }}
        .grade-D {{ background: linear-gradient(135deg, #dd6b20 0%, #c05621 100%); }}
        .grade-F {{ background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); }}
        .grade-NA {{ background: linear-gradient(135deg, #718096 0%, #4a5568 100%); }}
        .carrier-meta {{
            display: flex;
            gap: 30px;
            margin-top: 15px;
            flex-wrap: wrap;
        }}
        .meta-item {{
            font-size: 14px;
        }}
        .meta-item .label {{
            color: #718096;
        }}
        .meta-item .value {{
            font-weight: 600;
            color: #2d3748;
        }}
        .scores-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }}
        .score-card {{
            background: #f7fafc;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }}
        .score-card .score-label {{
            font-size: 12px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .score-card .score-value {{
            font-size: 28px;
            font-weight: 700;
            color: #2d3748;
            margin-top: 5px;
        }}
        .score-card .score-value.good {{ color: #38a169; }}
        .score-card .score-value.medium {{ color: #d69e2e; }}
        .score-card .score-value.bad {{ color: #e53e3e; }}
        .charts-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 20px;
        }}
        .chart-container {{
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }}
        .chart-container h3 {{
            font-size: 16px;
            color: #2c5282;
            margin-bottom: 20px;
        }}
        .chart-wrapper {{
            position: relative;
            height: 300px;
        }}
        .risk-flags {{
            background: #fff5f5;
            border: 1px solid #feb2b2;
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
        }}
        .risk-flags h4 {{
            color: #c53030;
            font-size: 14px;
            margin-bottom: 10px;
        }}
        .risk-flags ul {{
            list-style: none;
            padding-left: 0;
        }}
        .risk-flags li {{
            padding: 5px 0;
            font-size: 14px;
            color: #742a2a;
        }}
        .risk-flags li::before {{
            content: "\\26A0";
            margin-right: 8px;
        }}
        .no-data {{
            text-align: center;
            padding: 60px 20px;
            color: #718096;
        }}
        .no-data h3 {{
            font-size: 18px;
            margin-bottom: 10px;
        }}
        .stats-row {{
            display: flex;
            gap: 20px;
            margin-top: 20px;
            flex-wrap: wrap;
        }}
        .stat-box {{
            background: #f7fafc;
            border-radius: 8px;
            padding: 16px 24px;
            text-align: center;
            flex: 1;
            min-width: 150px;
        }}
        .stat-box .stat-value {{
            font-size: 24px;
            font-weight: 700;
            color: #2d3748;
        }}
        .stat-box .stat-label {{
            font-size: 12px;
            color: #718096;
            margin-top: 5px;
        }}
        .ranking-info {{
            background: #ebf8ff;
            border: 1px solid #90cdf4;
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
        }}
        .ranking-info h4 {{
            color: #2b6cb0;
            font-size: 14px;
            margin-bottom: 10px;
        }}
        .ranking-info p {{
            font-size: 14px;
            color: #2c5282;
        }}
        @media (max-width: 768px) {{
            .charts-grid {{
                grid-template-columns: 1fr;
            }}
            .chart-wrapper {{
                height: 250px;
            }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>FRED Score Dashboard</h1>
        <p>Carrier Violation Analysis &amp; Safety Trends | {len(results):,} carriers indexed</p>
    </div>

    <div class="container">
        <div class="search-section">
            <h2>Search for a Carrier</h2>
            <div class="search-container">
                <input type="text" id="carrierSearch" placeholder="Enter carrier name or DOT number..." autocomplete="off">
                <div id="searchResults" class="search-results"></div>
            </div>
        </div>

        <div id="carrierDetails" class="carrier-details">
            <div class="carrier-header">
                <div class="carrier-title">
                    <div>
                        <h2 id="carrierName">-</h2>
                        <span class="dot-number">DOT# <span id="carrierDOT">-</span></span>
                    </div>
                    <div id="gradeBadge" class="grade-badge grade-NA">-</div>
                </div>

                <div class="carrier-meta">
                    <div class="meta-item">
                        <span class="label">Location:</span>
                        <span class="value" id="carrierLocation">-</span>
                    </div>
                    <div class="meta-item">
                        <span class="label">Power Units:</span>
                        <span class="value" id="carrierPowerUnits">-</span>
                    </div>
                    <div class="meta-item">
                        <span class="label">Drivers:</span>
                        <span class="value" id="carrierDrivers">-</span>
                    </div>
                    <div class="meta-item">
                        <span class="label">Annual Mileage:</span>
                        <span class="value" id="carrierMileage">-</span>
                    </div>
                </div>

                <div class="scores-grid">
                    <div class="score-card">
                        <div class="score-label">Combined Score</div>
                        <div class="score-value" id="scoreCombined">-</div>
                    </div>
                    <div class="score-card">
                        <div class="score-label">Experience</div>
                        <div class="score-value" id="scoreExperience">-</div>
                    </div>
                    <div class="score-card">
                        <div class="score-label">Safety</div>
                        <div class="score-value" id="scoreSafety">-</div>
                    </div>
                    <div class="score-card">
                        <div class="score-label">Crash</div>
                        <div class="score-value" id="scoreCrash">-</div>
                    </div>
                    <div class="score-card">
                        <div class="score-label">Inspection</div>
                        <div class="score-value" id="scoreInspection">-</div>
                    </div>
                </div>

                <div class="stats-row">
                    <div class="stat-box">
                        <div class="stat-value" id="statCrashes">-</div>
                        <div class="stat-label">Crashes</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value" id="statInspections">-</div>
                        <div class="stat-label">Inspections</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value" id="statViolations">-</div>
                        <div class="stat-label">Violations</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value" id="statInsurance">-</div>
                        <div class="stat-label">Insurance Rating</div>
                    </div>
                </div>

                <div id="rankingInfo" class="ranking-info" style="display:none;">
                    <h4>Ranking Information</h4>
                    <p id="rankingText">-</p>
                </div>

                <div id="riskFlags" class="risk-flags" style="display:none;">
                    <h4>Risk Flags</h4>
                    <ul id="riskFlagsList"></ul>
                </div>
            </div>

            <div class="charts-grid">
                <div class="chart-container">
                    <h3>Violation Trends by Category (Last 2 Years)</h3>
                    <div class="chart-wrapper">
                        <canvas id="trendChart"></canvas>
                    </div>
                </div>

                <div class="chart-container">
                    <h3>Critical Violations by Category (Severity &ge; 7)</h3>
                    <div class="chart-wrapper">
                        <canvas id="criticalTrendChart"></canvas>
                    </div>
                </div>

                <div class="chart-container">
                    <h3>Total Violations by BASIC Category</h3>
                    <div class="chart-wrapper">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>

                <div class="chart-container">
                    <h3>Critical vs Regular Violations</h3>
                    <div class="chart-wrapper">
                        <canvas id="severityChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div id="noSelection" class="no-data">
            <h3>Select a Carrier</h3>
            <p>Use the search box above to find a carrier by name or DOT number.</p>
        </div>
    </div>

    <script>
        // Carrier data
        const CARRIERS = {json.dumps(dashboard_data)};

        // BASIC category colors
        const CATEGORY_COLORS = {{
            'Unsafe Driving': '#e53e3e',
            'Hours-of-Service Compliance': '#dd6b20',
            'Driver Fitness': '#d69e2e',
            'Controlled Substances/Alcohol': '#805ad5',
            'Vehicle Maintenance': '#3182ce',
            'Hazardous Materials Compliance': '#38a169'
        }};

        // Chart instances
        let trendChart = null;
        let criticalTrendChart = null;
        let categoryChart = null;
        let severityChart = null;

        // Search functionality
        const searchInput = document.getElementById('carrierSearch');
        const searchResults = document.getElementById('searchResults');

        searchInput.addEventListener('input', function() {{
            const query = this.value.toLowerCase().trim();
            if (query.length < 2) {{
                searchResults.style.display = 'none';
                return;
            }}

            const matches = CARRIERS.filter(c => {{
                const name = (c.legal_name || '').toLowerCase();
                const dba = (c.dba_name || '').toLowerCase();
                const dot = (c.dot_number || '').toLowerCase();
                return name.includes(query) || dba.includes(query) || dot.includes(query);
            }}).slice(0, 20);

            if (matches.length === 0) {{
                searchResults.innerHTML = '<div class="search-result-item">No carriers found</div>';
            }} else {{
                searchResults.innerHTML = matches.map(c => `
                    <div class="search-result-item" onclick="selectCarrier('${{c.dot_number}}')">
                        <div class="carrier-name">${{c.legal_name || 'Unknown'}}</div>
                        <div class="carrier-info">DOT# ${{c.dot_number}} | ${{c.physical_city || ''}}, ${{c.physical_state || ''}} | ${{c.fred_score_grade || 'N/A'}}</div>
                    </div>
                `).join('');
            }}
            searchResults.style.display = 'block';
        }});

        document.addEventListener('click', function(e) {{
            if (!searchResults.contains(e.target) && e.target !== searchInput) {{
                searchResults.style.display = 'none';
            }}
        }});

        function selectCarrier(dotNumber) {{
            const carrier = CARRIERS.find(c => c.dot_number === dotNumber);
            if (!carrier) return;

            searchResults.style.display = 'none';
            searchInput.value = carrier.legal_name || dotNumber;

            document.getElementById('noSelection').style.display = 'none';
            document.getElementById('carrierDetails').classList.add('active');

            // Update header info
            document.getElementById('carrierName').textContent = carrier.legal_name || 'Unknown';
            document.getElementById('carrierDOT').textContent = carrier.dot_number;
            document.getElementById('carrierLocation').textContent =
                [carrier.physical_city, carrier.physical_state].filter(Boolean).join(', ') || 'N/A';
            document.getElementById('carrierPowerUnits').textContent =
                carrier.power_units ? carrier.power_units.toLocaleString() : 'N/A';
            document.getElementById('carrierDrivers').textContent =
                carrier.drivers ? carrier.drivers.toLocaleString() : 'N/A';
            document.getElementById('carrierMileage').textContent =
                carrier.annual_mileage ? carrier.annual_mileage.toLocaleString() + ' mi' : 'N/A';

            // Update grade badge
            const gradeBadge = document.getElementById('gradeBadge');
            const grade = carrier.fred_score_grade || 'N/A';
            gradeBadge.textContent = grade;
            gradeBadge.className = 'grade-badge grade-' + (grade.charAt(0) || 'NA');

            // Update scores
            updateScore('scoreCombined', carrier.combined_score);
            updateScore('scoreExperience', carrier.experience_score);
            updateScore('scoreSafety', carrier.safety_score);
            updateScore('scoreCrash', carrier.crash_score);
            updateScore('scoreInspection', carrier.inspection_score);

            // Update stats
            document.getElementById('statCrashes').textContent = carrier.crash_count || 0;
            document.getElementById('statInspections').textContent = carrier.inspection_count || 0;
            document.getElementById('statViolations').textContent = carrier.violation_count || 0;
            document.getElementById('statInsurance').textContent =
                carrier.insurance_rating ? carrier.insurance_rating.toFixed(1) : 'N/A';

            // Update ranking
            const rankingInfo = document.getElementById('rankingInfo');
            if (carrier.rank) {{
                const percentile = ((1 - carrier.rank / {total_carriers}) * 100).toFixed(1);
                document.getElementById('rankingText').textContent =
                    `Ranked #${{carrier.rank.toLocaleString()}} out of {total_carriers:,} carriers (Top ${{percentile}}%)`;
                rankingInfo.style.display = 'block';
            }} else {{
                rankingInfo.style.display = 'none';
            }}

            // Update risk flags
            const riskFlagsDiv = document.getElementById('riskFlags');
            const riskFlagsList = document.getElementById('riskFlagsList');
            if (carrier.risk_flags) {{
                const flags = carrier.risk_flags.split('; ').filter(Boolean);
                if (flags.length > 0) {{
                    riskFlagsList.innerHTML = flags.map(f => `<li>${{f}}</li>`).join('');
                    riskFlagsDiv.style.display = 'block';
                }} else {{
                    riskFlagsDiv.style.display = 'none';
                }}
            }} else {{
                riskFlagsDiv.style.display = 'none';
            }}

            // Render charts
            renderCharts(carrier);
        }}

        function updateScore(elementId, score) {{
            const el = document.getElementById(elementId);
            if (score !== null && score !== undefined) {{
                el.textContent = score.toFixed(1);
                el.className = 'score-value ' + (score >= 70 ? 'good' : score >= 40 ? 'medium' : 'bad');
            }} else {{
                el.textContent = 'N/A';
                el.className = 'score-value';
            }}
        }}

        function getQuartersSorted(trends) {{
            const allQuarters = new Set();
            Object.values(trends).forEach(categoryData => {{
                Object.keys(categoryData).forEach(q => allQuarters.add(q));
            }});
            return Array.from(allQuarters).sort((a, b) => {{
                const [qa, ya] = [a.substring(0, 2), parseInt(a.substring(3))];
                const [qb, yb] = [b.substring(0, 2), parseInt(b.substring(3))];
                if (ya !== yb) return ya - yb;
                return qa.localeCompare(qb);
            }});
        }}

        function renderCharts(carrier) {{
            const trends = carrier.violation_trends || {{}};
            const criticalTrends = carrier.critical_trends || {{}};

            // Get all quarters
            const allTrendsQuarters = getQuartersSorted(trends);
            const allCriticalQuarters = getQuartersSorted(criticalTrends);
            const quarters = allTrendsQuarters.length > 0 ? allTrendsQuarters : allCriticalQuarters;

            // Categories
            const categories = Object.keys(CATEGORY_COLORS);

            // Destroy existing charts
            if (trendChart) trendChart.destroy();
            if (criticalTrendChart) criticalTrendChart.destroy();
            if (categoryChart) categoryChart.destroy();
            if (severityChart) severityChart.destroy();

            // 1. Trend Line Chart (All Violations)
            const trendDatasets = categories.map(cat => ({{
                label: cat,
                data: quarters.map(q => (trends[cat] || {{}})[q] || 0),
                borderColor: CATEGORY_COLORS[cat],
                backgroundColor: CATEGORY_COLORS[cat] + '20',
                tension: 0.3,
                fill: false
            }})).filter(ds => ds.data.some(v => v > 0));

            trendChart = new Chart(document.getElementById('trendChart'), {{
                type: 'line',
                data: {{
                    labels: quarters,
                    datasets: trendDatasets
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        legend: {{
                            position: 'bottom',
                            labels: {{ boxWidth: 12, padding: 15 }}
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            ticks: {{ stepSize: 1 }}
                        }}
                    }}
                }}
            }});

            // 2. Critical Violations Trend
            const criticalDatasets = categories.map(cat => ({{
                label: cat,
                data: quarters.map(q => (criticalTrends[cat] || {{}})[q] || 0),
                borderColor: CATEGORY_COLORS[cat],
                backgroundColor: CATEGORY_COLORS[cat] + '20',
                tension: 0.3,
                fill: false
            }})).filter(ds => ds.data.some(v => v > 0));

            criticalTrendChart = new Chart(document.getElementById('criticalTrendChart'), {{
                type: 'line',
                data: {{
                    labels: quarters,
                    datasets: criticalDatasets.length > 0 ? criticalDatasets : [{{
                        label: 'No Critical Violations',
                        data: quarters.map(() => 0),
                        borderColor: '#ccc'
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        legend: {{
                            position: 'bottom',
                            labels: {{ boxWidth: 12, padding: 15 }}
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            ticks: {{ stepSize: 1 }}
                        }}
                    }}
                }}
            }});

            // 3. Category Bar Chart
            const categoryTotals = categories.map(cat => {{
                let total = 0;
                Object.values(trends[cat] || {{}}).forEach(v => total += v);
                return total;
            }});

            categoryChart = new Chart(document.getElementById('categoryChart'), {{
                type: 'bar',
                data: {{
                    labels: categories.map(c => c.replace(' Compliance', '').replace('Controlled Substances/Alcohol', 'Drugs/Alcohol')),
                    datasets: [{{
                        label: 'Total Violations',
                        data: categoryTotals,
                        backgroundColor: categories.map(c => CATEGORY_COLORS[c])
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {{
                        legend: {{ display: false }}
                    }},
                    scales: {{
                        x: {{
                            beginAtZero: true,
                            ticks: {{ stepSize: 1 }}
                        }}
                    }}
                }}
            }});

            // 4. Critical vs Regular Violations
            const criticalTotals = categories.map(cat => {{
                let total = 0;
                Object.values(criticalTrends[cat] || {{}}).forEach(v => total += v);
                return total;
            }});
            const regularTotals = categoryTotals.map((t, i) => t - criticalTotals[i]);

            severityChart = new Chart(document.getElementById('severityChart'), {{
                type: 'bar',
                data: {{
                    labels: categories.map(c => c.replace(' Compliance', '').replace('Controlled Substances/Alcohol', 'Drugs/Alcohol')),
                    datasets: [
                        {{
                            label: 'Critical (Severity >= 7)',
                            data: criticalTotals,
                            backgroundColor: '#e53e3e'
                        }},
                        {{
                            label: 'Regular',
                            data: regularTotals,
                            backgroundColor: '#3182ce'
                        }}
                    ]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {{
                        legend: {{
                            position: 'bottom',
                            labels: {{ boxWidth: 12, padding: 15 }}
                        }}
                    }},
                    scales: {{
                        x: {{
                            beginAtZero: true,
                            stacked: true,
                            ticks: {{ stepSize: 1 }}
                        }},
                        y: {{
                            stacked: true
                        }}
                    }}
                }}
            }});
        }}
    </script>
</body>
</html>
'''

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html_content)

    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f"  Written dashboard ({size_mb:.1f} MB)")


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='FRED Score Data Processing Pipeline')
    parser.add_argument('--sample', type=int, default=0, help='Process only N carriers (0 = all)')
    parser.add_argument('--no-postgres', action='store_true', help='Skip PostgreSQL export')
    args = parser.parse_args()

    sample_mode = args.sample > 0

    print("\n" + "=" * 60)
    print("FRED SCORE DATA PROCESSING PIPELINE")
    if sample_mode:
        print(f"*** SAMPLE MODE: Processing only {args.sample:,} carriers ***")
    print("=" * 60)
    print(f"Started: {datetime.now().isoformat()}")

    data = load_all_data(sample_size=args.sample if sample_mode else 0)
    filtered = data['census']

    if sample_mode and len(filtered) > args.sample:
        filtered = filtered[:args.sample]
        print(f"\nSample mode: limited to {len(filtered):,} carriers")

    scored = process_all_carriers(filtered, data)

    export_to_js(scored, OUTPUT_JS)
    export_to_sqlite(scored, OUTPUT_SQLITE)
    export_to_csv(scored, OUTPUT_CSV)
    export_to_dashboard_html(scored, OUTPUT_DASHBOARD)
    if not args.no_postgres:
        export_to_postgres(scored)
    else:
        print("\nSkipping PostgreSQL export (--no-postgres flag)")

    print("\n" + "=" * 60)
    print("PROCESSING COMPLETE")
    print("=" * 60)
    print(f"Finished: {datetime.now().isoformat()}")

    graded = [c for c in scored if c['rank'] is not None]
    print("\n" + "-" * 60)
    print("TOP 10 CARRIERS")
    print("-" * 60)
    for c in graded[:10]:
        print(f"  #{c['rank']:,} DOT {c['dot_number']}: {(c['legal_name'] or '')[:40]} - {c['fred_score_grade'] or 'N/A'}")

    print("\n" + "-" * 60)
    print("BOTTOM 10 CARRIERS")
    print("-" * 60)
    for c in graded[-10:]:
        print(f"  #{c['rank']:,} DOT {c['dot_number']}: {(c['legal_name'] or '')[:40]} - {c['fred_score_grade'] or 'N/A'}")


if __name__ == '__main__':
    main()
