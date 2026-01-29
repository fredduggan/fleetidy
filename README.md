# Fleetidy - FMCSA Carrier Data Processing Engine

A production-grade Python system for ingesting FMCSA/MCMIS/SMS datasets, calculating Legacy ISS scores, and producing underwriting-ready carrier rankings.

## Features

- **Multi-source data ingestion**: Census, Inspections, Violations, Crashes, SMS outputs
- **Legacy ISS Score Estimator**: PDF-faithful implementation per FMCSA December 2012 algorithm
- **Carrier Ranking & Tiering**: Weighted scoring with explainability
- **Configurable Column Mappings**: Adapts to different FMCSA extract formats
- **Audit Trail**: Debug outputs with intermediate calculations

## Installation

```bash
# Clone the repository
git clone https://github.com/fleetidy/fleetidy.git
cd fleetidy

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install in development mode
pip install -e ".[dev]"
```

## Quick Start

1. **Create a configuration file** (`config.yaml`):

```yaml
# Fleetidy Configuration
run_date: "2026-01-28"
random_seed: 42

# Lookback periods
lookback_months_inspections: 24
lookback_months_serious: 12

# Input file paths
input_paths:
  census: "data/census.csv"
  inspections: "data/inspections.csv"
  violations: "data/violations.csv"
  crashes: "data/crashes.csv"
  sms_ab: "data/sms_ab_passproperty.csv"
  sms_c: "data/sms_c_passproperty.csv"
  oos_orders: null  # Optional
  insurance_history: null  # Optional

# Output directory
output_dir: "output"

# Column mappings (adapt to your extract format)
column_mappings:
  census:
    dot_number: "DOT_NUMBER"
    legal_name: "LEGAL_NAME"
    power_units: "TOT_PWR"
    drivers: "TOT_DRS"
    operating_status: "OP_STATUS"
    auth_for_hire: "AUTH_FOR_HIRE"

  inspections:
    inspection_id: "INSPECTION_ID"
    dot_number: "DOT_NUMBER"
    inspection_date: "INSPECTION_DATE"
    inspection_level: "INSPECTION_LEVEL"

  violations:
    inspection_id: "INSPECTION_ID"
    dot_number: "DOT_NUMBER"
    violation_code: "VIOLATION_CODE"
    basic_category: "BASIC_CATEGORY"
    violation_severity_weight: "VIOLATION_SEVERITY_WEIGHT"

  crashes:
    dot_number: "DOT_NUMBER"
    crash_date: "CRASH_DATE"
    fatalities: "FATALITIES"
    injuries: "INJURIES"

  sms:
    dot_number: "DOT_NUMBER"
    unsafe_driving_percentile: "UNSAFE_DRIV_MEASURE"
    hos_percentile: "HOS_DRIV_MEASURE"
    unsafe_driving_alert: "UNSAFE_DRIV_ALERT"
    hos_alert: "HOS_DRIV_ALERT"
    # ... other BASIC percentiles and alerts
```

2. **Run the pipeline**:

```bash
# Using the CLI
fleetidy run --config config.yaml

# Or as a Python module
python -m fleetidy.cli run --config config.yaml

# With verbose logging
fleetidy run --config config.yaml --verbose
```

## Input Data Schemas

### Census File
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| DOT_NUMBER | string | Yes | USDOT number |
| TOT_PWR | int | No | Total power units |
| TOT_DRS | int | No | Total drivers |
| OP_STATUS | string | No | Operating status (ACTIVE/INACTIVE) |
| AUTH_FOR_HIRE | string | No | For-hire authority flag |

### Inspections File
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| INSPECTION_ID | string | Yes | Unique inspection identifier |
| DOT_NUMBER | string | Yes | USDOT number |
| INSPECTION_DATE | date | Yes | Date of inspection |
| INSPECTION_LEVEL | int | Yes | Level I-VI |

### Violations File
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| INSPECTION_ID | string | Yes | Links to inspection |
| VIOLATION_CODE | string | Yes | FMCSA violation code |
| BASIC_CATEGORY | string | No | BASIC category name |
| VIOLATION_SEVERITY_WEIGHT | int | No | Severity weight |

### Crashes File
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| DOT_NUMBER | string | Yes | USDOT number |
| CRASH_DATE | date | Yes | Date of crash |
| FATALITIES | int | No | Number of fatalities |
| INJURIES | int | No | Number of injuries |

### SMS Files (AB PassProperty, C PassProperty)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| DOT_NUMBER | string | Yes | USDOT number |
| *_MEASURE | float | No | BASIC percentile (0-100) |
| *_ALERT | string | No | Alert flag (Y/N) |

## Output Files

### carrier_features.csv
One row per USDOT with all aggregated features and scores.

### carrier_features_debug.csv
Extended version with intermediate calculations for audit purposes.

### rankings.csv
Final carrier rankings with tier assignments and contributing factors.

## ISS Legacy Algorithm

The Legacy ISS estimator implements the FMCSA December 2012 algorithm specification:

### Safety Algorithm (carriers with BASIC data)
- **OOSO carriers**: ISS = 100
- **Serious violations**: Map to BASIC or assign ISS = 74 (Group 6)
- **Group assignment**: 1-13 based on alert patterns
  - High-risk: ≥4 alerts OR ≥2 alerts with Unsafe/HOS/Crash ≥ 85%
  - Groups 1-5: "Inspect" bucket (ISS 75-99)
  - Groups 7-12: "Optional" bucket (ISS 50-74)
  - Group 13: "Pass" bucket (ISS 1-49)

### Insufficient Data Algorithm
- **OOSO**: ISS = 100
- **Random 1%**: ISS = 99 (deterministic with seed)
- **Minimum inspections met**: ISS = 50
- **Case 1 (one-away)**: ISS 70-74
- **Case 2 (zero inspections)**: ISS 63-69 based on fleet size
- **Case 3 (some inspections)**: ISS 50-69 based on rate ranking

## Development

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=fleetidy --cov-report=html

# Format code
black src tests

# Lint code
ruff check src tests

# Type checking
mypy src
```

## Architecture

```
src/fleetidy/
├── __init__.py          # Package initialization
├── config.py            # Configuration dataclass and loader
├── io_loaders.py        # Data file loading utilities
├── normalizers.py       # Data cleaning and normalization
├── pipeline.py          # Main ETL orchestrator
├── cli.py               # Command-line interface
├── features/            # Feature extraction modules
│   ├── census_features.py
│   ├── inspection_features.py
│   ├── violation_features.py
│   ├── crash_features.py
│   └── sms_features.py
└── scoring/             # Scoring algorithms
    ├── iss_legacy.py    # Legacy ISS estimator
    └── ranker.py        # Underwriting ranking
```

## License

MIT License - see LICENSE file for details.
