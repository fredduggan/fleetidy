#!/usr/bin/env python3
"""
Carrier Safety Web Server

Flask application for serving carrier safety data with server-side rendering.
Supports both SQLite and PostgreSQL backends.

Usage:
    python server.py              # Run on default port 5000
    python server.py --port 8080  # Run on custom port
"""

import os
import sqlite3
import argparse
import json
from datetime import datetime
from collections import defaultdict
from flask import Flask, render_template, jsonify, abort, request, send_from_directory

# Get the directory where server.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Optional PostgreSQL support
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

app = Flask(__name__, template_folder=os.path.join(BASE_DIR, 'templates'))

# Configuration
DATABASE = os.environ.get('DATABASE', 'fred_scores.db')
DB_TYPE = os.environ.get('DB_TYPE', 'sqlite')  # 'sqlite' or 'postgres'

# PostgreSQL settings
PG_HOST = os.environ.get('PG_HOST', 'localhost')
PG_PORT = os.environ.get('PG_PORT', '5432')
PG_DB = os.environ.get('PG_DB', 'fred_scores')
PG_USER = os.environ.get('PG_USER', 'postgres')
PG_PASS = os.environ.get('PG_PASS', '')

GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']

GRADE_COLORS = {
    'A+': 'emerald', 'A': 'emerald', 'A-': 'emerald',
    'B+': 'blue', 'B': 'blue', 'B-': 'blue',
    'C+': 'yellow', 'C': 'yellow', 'C-': 'yellow',
    'D+': 'orange', 'D': 'orange', 'D-': 'orange',
    'F': 'red'
}

# Operation type codes
OPERATION_CODES = {
    'A': 'Authorized For-Hire',
    'B': 'Exempt For-Hire',
    'C': 'Private (Property)',
    'D': 'Private (Passengers)',
    'E': 'Private (Passengers - Business)',
    'X': 'Exempt (Intracity)',
}

# FMCSA Safety Rating codes
SAFETY_RATING_CODES = {
    'S': 'Satisfactory',
    'C': 'Conditional',
    'U': 'Unsatisfactory',
    'N': 'None',
}

# Risk severity mapping
RISK_SEVERITY = {
    'FATAL': 'critical',
    'fatalities': 'critical',
    'Hazmat': 'critical',
    'BASIC Alert': 'critical',
    'High OOS': 'high',
    'crash': 'high',
    'Pattern': 'medium',
}

# Cargo Safety Class (1=Best/Lowest Hazard, 5=Worst/Highest Hazard)
# Based on: theft risk, damage susceptibility, spoilage, securement, custody transfers
CARGO_SAFETY_CLASS = {
    # Group 5 - WORST (red)
    'Household Goods': 5,
    'Motor Vehicles': 5,
    'Mobile Homes': 5,
    'Drive/Tow Away': 5,
    # Group 4 - HIGH (orange)
    'Metal: Sheets/Coils/Rolls': 4,
    'Liquids/Gases': 4,
    'Livestock': 4,
    'Machinery/Large Objects': 4,
    'Intermodal Containers': 4,
    'Refrigerated Food': 4,
    'Meat': 4,
    'Oilfield Equipment': 4,
    'Other': 4,
    # Group 3 - MODERATE (yellow)
    'General Freight': 3,
    'Beverages': 3,
    'Logs/Poles/Beams/Lumber': 3,
    'Building Materials': 3,
    'Fresh Produce': 3,
    # Group 2 - LOW (blue)
    'Paper Products': 2,
    'Farm Supplies': 2,
    'US Mail': 2,
    'Grain/Feed/Hay': 2,
    'Dry Bulk': 2,
    'Commodities Dry Bulk': 2,
    'Construction': 2,
    'Utility': 2,
    'Water Well': 2,
    # Group 1 - BEST (green)
    'Coal/Coke': 1,
    'Garbage/Refuse': 1,
    'Chemicals': 1,
    'Passengers': 0,  # Not cargo - liability dominated
}

CARGO_CLASS_COLORS = {
    5: 'red',      # Worst
    4: 'orange',   # High
    3: 'yellow',   # Moderate
    2: 'blue',     # Low
    1: 'emerald',  # Best
    0: 'zinc',     # N/A (Passengers)
}


def get_db():
    """Get database connection based on configuration."""
    if DB_TYPE == 'postgres' and HAS_POSTGRES:
        conn = psycopg2.connect(
            host=PG_HOST, port=PG_PORT,
            dbname=PG_DB, user=PG_USER, password=PG_PASS
        )
        return conn
    else:
        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row
        return conn


def execute_query(query, params=None, fetchone=False):
    """Execute a query and return results as list of dicts."""
    conn = get_db()
    if DB_TYPE == 'postgres' and HAS_POSTGRES:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
    else:
        cursor = conn.cursor()

    cursor.execute(query, params or ())

    if fetchone:
        row = cursor.fetchone()
        result = dict(row) if row else None
    else:
        result = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return result


def get_all_carriers():
    """Load all carriers from database."""
    # For SQLite, use 'carriers' table; for PostgreSQL, use 'fred_carriers'
    table = 'fred_carriers' if (DB_TYPE == 'postgres' and HAS_POSTGRES) else 'carriers'

    query = f'''
        SELECT dot_number, legal_name, dba_name, physical_city, physical_state,
               power_units, drivers, experience_score, safety_score, crash_score,
               inspection_score, combined_score, risk_flags, annual_mileage,
               iss_score, iss_bucket, crash_count, inspection_count, violation_count,
               rank, fred_score_grade, insurance_rating
        FROM {table}
        ORDER BY rank ASC NULLS LAST, combined_score DESC
    '''
    return execute_query(query)


def get_carrier_by_dot(dot_number):
    """Get a single carrier by DOT number with all available fields."""
    table = 'fred_carriers' if (DB_TYPE == 'postgres' and HAS_POSTGRES) else 'carriers'

    query = f'SELECT * FROM {table} WHERE dot_number = ?'
    if DB_TYPE == 'postgres' and HAS_POSTGRES:
        query = f'SELECT * FROM {table} WHERE dot_number = %s'

    return execute_query(query, (dot_number,), fetchone=True)


def get_total_carrier_count():
    """Get total number of carriers for percentile calculation."""
    table = 'fred_carriers' if (DB_TYPE == 'postgres' and HAS_POSTGRES) else 'carriers'

    query = f'SELECT COUNT(*) as count FROM {table} WHERE rank IS NOT NULL'
    result = execute_query(query, fetchone=True)
    return result['count'] if result else 0


def compute_grade_stats(carriers):
    """Compute grade distribution and summary statistics."""
    grade_counts = {g: 0 for g in GRADES}
    grade_counts['N/A'] = 0

    total_score = 0
    scored_count = 0
    total_power_units = 0

    for carrier in carriers:
        grade = carrier.get('fred_score_grade')
        if grade and grade in GRADES:
            grade_counts[grade] += 1
        else:
            grade_counts['N/A'] += 1

        if carrier.get('combined_score'):
            total_score += carrier['combined_score']
            scored_count += 1

        total_power_units += carrier.get('power_units') or 0

    return {
        'grade_counts': grade_counts,
        'total_carriers': len(carriers),
        'graded_carriers': len(carriers) - grade_counts['N/A'],
        'avg_score': round(total_score / scored_count, 1) if scored_count > 0 else None,
        'total_power_units': total_power_units
    }


def parse_risk_flags(flags_str):
    """Parse risk flags string into structured list with severity."""
    if not flags_str:
        return []

    flags = []
    for flag in flags_str.split(';'):
        flag = flag.strip()
        if not flag:
            continue

        # Determine severity
        severity = 'info'
        for keyword, sev in RISK_SEVERITY.items():
            if keyword.lower() in flag.lower():
                severity = sev
                break

        flags.append({'text': flag, 'severity': severity})

    # Sort by severity (critical first)
    severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'info': 3}
    flags.sort(key=lambda x: severity_order.get(x['severity'], 3))

    return flags


def format_operating_scope(carrier):
    """Format operating scope into a readable list."""
    scope = []
    if carrier.get('interstate_beyond_100'):
        scope.append('Interstate (Beyond 100 miles)')
    if carrier.get('interstate_within_100'):
        scope.append('Interstate (Within 100 miles)')
    if carrier.get('intrastate_beyond_100'):
        scope.append('Intrastate (Beyond 100 miles)')
    if carrier.get('intrastate_within_100'):
        scope.append('Intrastate (Within 100 miles)')
    return scope


def format_authority_types(classdef):
    """Parse CLASSDEF into authority type badges."""
    if not classdef:
        return []

    types = []
    classdef_upper = classdef.upper()

    if 'AUTHORIZED FOR HIRE' in classdef_upper:
        types.append({'label': 'Authorized For-Hire', 'color': 'emerald'})
    if 'EXEMPT FOR HIRE' in classdef_upper:
        types.append({'label': 'Exempt For-Hire', 'color': 'blue'})
    if 'PRIVATE PROPERTY' in classdef_upper:
        types.append({'label': 'Private Property', 'color': 'zinc'})
    if 'U.S. MAIL' in classdef_upper or 'US MAIL' in classdef_upper:
        types.append({'label': 'U.S. Mail', 'color': 'indigo'})

    return types


def decode_operation(code):
    """Decode operation type code to human-readable text."""
    if not code:
        return None
    return OPERATION_CODES.get(code.strip().upper(), code)


def decode_safety_rating(code):
    """Decode FMCSA safety rating code to human-readable text."""
    if not code:
        return None
    return SAFETY_RATING_CODES.get(code.strip().upper(), code)


# ============================================================================
# ROUTES
# ============================================================================

@app.route('/')
def index():
    """Serve the home page."""
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """Serve files from assets folder."""
    return send_from_directory(os.path.join(BASE_DIR, 'assets'), filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve files from css folder."""
    return send_from_directory(os.path.join(BASE_DIR, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve files from js folder."""
    return send_from_directory(os.path.join(BASE_DIR, 'js'), filename)

@app.route('/<path:filename>.html')
def serve_html(filename):
    """Serve HTML files from root."""
    return send_from_directory(BASE_DIR, filename + '.html')


@app.route('/census')
def census():
    """Render the census overview page."""
    carriers = get_all_carriers()
    stats = compute_grade_stats(carriers)

    # Group carriers by grade for the template
    carriers_by_grade = defaultdict(list)
    for carrier in carriers:
        grade = carrier.get('fred_score_grade')
        if grade and grade in GRADES:
            carriers_by_grade[grade].append(carrier)
        else:
            carriers_by_grade['N/A'].append(carrier)

    return render_template('census.html',
        grades=GRADES,
        grade_colors=GRADE_COLORS,
        grade_counts=stats['grade_counts'],
        carriers_by_grade=dict(carriers_by_grade),
        total_carriers=stats['total_carriers'],
        graded_carriers=stats['graded_carriers'],
        avg_score=stats['avg_score'],
        total_power_units=stats['total_power_units']
    )


@app.route('/methodology')
def methodology():
    """Render the rating methodology explanation page."""
    return render_template('methodology.html')


@app.route('/carrier/<dot_number>')
def carrier_detail(dot_number):
    """Render the carrier detail/report page."""
    carrier = get_carrier_by_dot(dot_number)
    if not carrier:
        abort(404)

    total_carriers = get_total_carrier_count()
    percentile = None
    if carrier.get('rank') and total_carriers > 0:
        percentile = round((1 - carrier['rank'] / total_carriers) * 100, 1)

    # Get grade color
    grade = carrier.get('fred_score_grade')
    grade_color = GRADE_COLORS.get(grade, 'zinc')

    # Parse risk flags with severity
    risk_flags = parse_risk_flags(carrier.get('risk_flags'))

    # Count flags by severity
    critical_flags = [f for f in risk_flags if f['severity'] == 'critical']
    high_flags = [f for f in risk_flags if f['severity'] == 'high']

    # Format commodities with safety class
    commodities = []
    if carrier.get('commodities'):
        for c in carrier['commodities'].split(';'):
            c = c.strip()
            if c:
                safety_class = CARGO_SAFETY_CLASS.get(c, 3)  # Default to moderate
                color = CARGO_CLASS_COLORS.get(safety_class, 'zinc')
                commodities.append({'name': c, 'class': safety_class, 'color': color})

    # Equipment breakdown
    equipment = {
        'trucks': {
            'owned': carrier.get('own_trucks', 0) or 0,
            'term_leased': carrier.get('term_trucks', 0) or 0,
            'trip_leased': carrier.get('trip_trucks', 0) or 0,
        },
        'tractors': {
            'owned': carrier.get('own_tractors', 0) or 0,
            'term_leased': carrier.get('term_tractors', 0) or 0,
            'trip_leased': carrier.get('trip_tractors', 0) or 0,
        },
        'trailers': {
            'owned': carrier.get('own_trailers', 0) or 0,
            'term_leased': carrier.get('term_trailers', 0) or 0,
            'trip_leased': carrier.get('trip_trailers', 0) or 0,
        },
    }

    # Calculate totals
    for eq_type in equipment:
        equipment[eq_type]['total'] = sum(equipment[eq_type].values())

    # Operating scope
    operating_scope = format_operating_scope(carrier)

    # Decode operation type
    operation_decoded = decode_operation(carrier.get('carrier_operation'))

    # Decode safety rating
    safety_rating_decoded = decode_safety_rating(carrier.get('safety_rating'))
    safety_rating_date = carrier.get('safety_rating_date', '')
    if safety_rating_date and len(safety_rating_date) >= 8:
        try:
            safety_rating_date = f"{safety_rating_date[4:6]}-{safety_rating_date[6:8]}-{safety_rating_date[:4]}"
        except:
            pass

    # Authority types
    authority_types = format_authority_types(carrier.get('classdef'))

    # Mileage eligibility (>= 100,000 miles)
    mileage = carrier.get('annual_mileage', 0) or 0
    mileage_eligible = mileage >= 100000

    # Format dates
    add_date = carrier.get('add_date', '')
    if add_date and len(add_date) >= 8:
        try:
            add_date = f"{add_date[4:6]}-{add_date[6:8]}-{add_date[:4]}"
        except:
            pass

    mcs150_date = carrier.get('mcs150_date', '')
    if mcs150_date and len(mcs150_date) >= 8:
        try:
            # Format: "YYYYMMDD HHMM" -> "MM-DD-YYYY"
            mcs150_date = f"{mcs150_date[4:6]}-{mcs150_date[6:8]}-{mcs150_date[:4]}"
        except:
            pass

    # Parse trend data from JSON columns
    violation_trends = {}
    critical_trends = {}
    try:
        if carrier.get('violation_trends'):
            violation_trends = json.loads(carrier['violation_trends']) if isinstance(carrier['violation_trends'], str) else carrier['violation_trends']
        if carrier.get('critical_trends'):
            critical_trends = json.loads(carrier['critical_trends']) if isinstance(carrier['critical_trends'], str) else carrier['critical_trends']
    except (json.JSONDecodeError, TypeError):
        pass

    return render_template('carrier.html',
        carrier=carrier,
        total_carriers=total_carriers,
        percentile=percentile,
        grade_color=grade_color,
        risk_flags=risk_flags,
        critical_flags=critical_flags,
        high_flags=high_flags,
        commodities=commodities,
        equipment=equipment,
        operating_scope=operating_scope,
        operation_decoded=operation_decoded,
        safety_rating_decoded=safety_rating_decoded,
        safety_rating_date=safety_rating_date,
        authority_types=authority_types,
        mileage_eligible=mileage_eligible,
        add_date=add_date,
        mcs150_date=mcs150_date,
        violation_trends=violation_trends,
        critical_trends=critical_trends
    )


@app.route('/api/carrier/<dot_number>/timeseries')
def api_carrier_timeseries(dot_number):
    """API endpoint to get carrier timeseries data for charts."""
    carrier = get_carrier_by_dot(dot_number)
    if not carrier:
        return jsonify({'error': 'Carrier not found'}), 404

    # Parse violation trends from JSON
    violations_monthly = []
    try:
        trends_raw = carrier.get('violation_trends', '{}')
        if isinstance(trends_raw, str):
            trends = json.loads(trends_raw) if trends_raw else {}
        else:
            trends = trends_raw or {}

        # Parse critical trends
        critical_raw = carrier.get('critical_trends', '{}')
        if isinstance(critical_raw, str):
            critical_trends = json.loads(critical_raw) if critical_raw else {}
        else:
            critical_trends = critical_raw or {}

        # Aggregate all categories by month
        monthly_totals = {}
        critical_totals = {}
        for category, periods in trends.items():
            for period, count in periods.items():
                monthly_totals[period] = monthly_totals.get(period, 0) + count

        for category, periods in critical_trends.items():
            for period, count in periods.items():
                critical_totals[period] = critical_totals.get(period, 0) + count

        # Sort by date and format for chart (include both total and critical)
        all_periods = sorted(set(monthly_totals.keys()) | set(critical_totals.keys()))
        for period in all_periods:
            violations_monthly.append({
                'month': period,
                'count': monthly_totals.get(period, 0),
                'critical': critical_totals.get(period, 0)
            })
    except (json.JSONDecodeError, TypeError, AttributeError):
        pass

    # Parse inspection trends from JSON
    inspections_monthly = []
    try:
        insp_raw = carrier.get('inspection_trends', '{}')
        if isinstance(insp_raw, str):
            insp_trends = json.loads(insp_raw) if insp_raw else {}
        else:
            insp_trends = insp_raw or {}

        # Sort by date and format for chart
        for period in sorted(insp_trends.keys()):
            period_data = insp_trends[period]
            # Handle both old format (just count) and new format (dict with count and oos)
            if isinstance(period_data, dict):
                inspections_monthly.append({
                    'month': period,
                    'count': period_data.get('count', 0),
                    'oos': period_data.get('oos', 0)
                })
            else:
                inspections_monthly.append({
                    'month': period,
                    'count': period_data,
                    'oos': 0
                })
    except (json.JSONDecodeError, TypeError, AttributeError):
        pass

    return jsonify({
        'dot_number': dot_number,
        'iss_history': [],
        'violations_monthly': violations_monthly,
        'inspections_monthly': inspections_monthly
    })


@app.route('/api/carriers/<grade>')
def api_carriers_by_grade(grade):
    """API endpoint to get carriers by grade."""
    carriers = get_all_carriers()

    if grade == 'N/A':
        filtered = [c for c in carriers if not c.get('fred_score_grade') or c.get('fred_score_grade') not in GRADES]
    else:
        filtered = [c for c in carriers if c.get('fred_score_grade') == grade]

    return jsonify(filtered)


@app.route('/api/stats')
def api_stats():
    """API endpoint to get census summary stats."""
    carriers = get_all_carriers()
    stats = compute_grade_stats(carriers)
    return jsonify(stats)


# ============================================================================
# TEMPLATE FILTERS
# ============================================================================

@app.template_filter('format_number')
def format_number(value):
    """Format number with commas."""
    if value is None:
        return '-'
    return f'{value:,}'


@app.template_filter('format_score')
def format_score(value):
    """Format score with one decimal."""
    if value is None:
        return '-'
    return f'{value:.1f}'


@app.template_filter('format_phone')
def format_phone(value):
    """Format phone number."""
    if not value:
        return '-'
    # Remove non-digits
    digits = ''.join(c for c in str(value) if c.isdigit())
    if len(digits) == 10:
        return f'({digits[:3]}) {digits[3:6]}-{digits[6:]}'
    return value


@app.template_filter('format_date')
def format_date_filter(value):
    """Format date string."""
    if not value:
        return '-'
    return value


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Carrier Safety Web Server')
    parser.add_argument('--port', type=int, default=5000, help='Port to run on')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    args = parser.parse_args()

    print(f"Starting Carrier Safety server on http://localhost:{args.port}")
    print(f"Database type: {DB_TYPE}")
    print(f"Database: {DATABASE if DB_TYPE == 'sqlite' else PG_DB}")
    app.run(host='0.0.0.0', port=args.port, debug=args.debug)
