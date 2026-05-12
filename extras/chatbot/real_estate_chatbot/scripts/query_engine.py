import re
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BASE_DIR / "data" / "processed" / "real_estate_master.csv"


def load_data():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Dataset not found at: {DATA_FILE}")

    df = pd.read_csv(DATA_FILE)

    expected_columns = [
        "source_file",
        "source_sheet",
        "project_name",
        "unit_code",
        "unit_type",
        "price",
        "bua",
        "land_area",
        "garden_area",
        "roof_area",
        "bedrooms",
        "bathrooms",
        "finishing",
        "delivery_status",
        "status",
        "location",
        "price_per_sqm",
        "has_garden",
        "has_roof",
    ]

    for col in expected_columns:
        if col not in df.columns:
            df[col] = pd.NA

    # normalize useful text fields
    text_cols = [
        "source_sheet",
        "project_name",
        "unit_code",
        "unit_type",
        "finishing",
        "delivery_status",
        "status",
        "location",
    ]
    for col in text_cols:
        df[col] = df[col].astype(str).str.strip()

    # normalize numerics
    numeric_cols = [
        "price", "bua", "land_area", "garden_area", "roof_area",
        "bedrooms", "bathrooms", "price_per_sqm"
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # normalize booleans
    if "has_garden" in df.columns:
        df["has_garden"] = df["has_garden"].astype(str).str.lower().map(
            {"true": True, "false": False}
        ).fillna(False)

    if "has_roof" in df.columns:
        df["has_roof"] = df["has_roof"].astype(str).str.lower().map(
            {"true": True, "false": False}
        ).fillna(False)

    return df


def extract_budget(question):
    q = question.lower().replace(",", "")

    match = re.search(r"(\d+)\s*(million|m)\b", q)
    if match:
        return int(match.group(1)) * 1_000_000

    match = re.search(r"under\s*(\d+)\b", q)
    if match:
        value = int(match.group(1))
        return value * 1_000_000 if value < 1000 else value

    match = re.search(r"budget\s*(\d+)\b", q)
    if match:
        value = int(match.group(1))
        return value * 1_000_000 if value < 1000 else value

    return None


def extract_bedrooms(question):
    q = question.lower()
    match = re.search(r"(\d+)\s*bed(room)?s?\b", q)
    if match:
        return int(match.group(1))
    return None


def filter_by_project_or_sheet(question, df):
    q = question.lower()

    # search both source_sheet and project_name because your real data
    # often has better values in source_sheet
    candidates = set()

    for col in ["source_sheet", "project_name"]:
        if col in df.columns:
            values = df[col].dropna().astype(str).unique()
            for v in values:
                v_clean = v.strip().lower()
                if v_clean and v_clean != "nan":
                    candidates.add(v_clean)

    candidates = sorted(candidates, key=len, reverse=True)

    for item in candidates:
        if item in q:
            return df[
                df["source_sheet"].astype(str).str.lower().eq(item) |
                df["project_name"].astype(str).str.lower().eq(item)
            ]

    return df


def filter_properties(question, df):
    q = question.lower()
    result = df.copy()

    # project / area / sheet detection first
    result = filter_by_project_or_sheet(question, result)

    # unit type filters
    if "villa" in q:
        result = result[result["unit_type"].str.contains("villa", case=False, na=False)]

    if "apartment" in q:
        result = result[result["unit_type"].str.contains("apartment", case=False, na=False)]

    if "townhouse" in q or "town house" in q:
        result = result[result["unit_type"].str.contains("town house|townhouse", case=False, na=False)]

    if "penthouse" in q:
        result = result[result["unit_type"].str.contains("penthouse", case=False, na=False)]

    if "duplex" in q:
        result = result[result["unit_type"].str.contains("duplex", case=False, na=False)]

    if "garden apartment" in q:
        result = result[result["unit_type"].str.contains("garden apartment", case=False, na=False)]

    if "roof" in q:
        roof_mask = (
            result["has_roof"].fillna(False) |
            result["unit_type"].str.contains("roof", case=False, na=False)
        )
        result = result[roof_mask]

    if "garden" in q:
        garden_mask = (
            result["has_garden"].fillna(False) |
            result["unit_type"].str.contains("garden", case=False, na=False)
        )
        result = result[garden_mask]

    # status / delivery
    if "available" in q:
        result = result[result["status"].str.contains("available", case=False, na=False)]

    if "ready" in q or "ready to move" in q or "ready to deliver" in q:
        result = result[result["delivery_status"].str.contains("ready", case=False, na=False)]

    if "off plan" in q:
        result = result[result["delivery_status"].str.contains("off plan", case=False, na=False)]

    # budget
    budget = extract_budget(question)
    if budget is not None:
        result = result[result["price"] <= budget]

    # bedrooms only if actual bedroom values exist
    beds = extract_bedrooms(question)
    if beds is not None and result["bedrooms"].notna().any():
        result = result[result["bedrooms"] == beds]

    # explicit area keywords fallback
    if "new cairo" in q:
        result = result[
            result["source_sheet"].str.contains("new cairo", case=False, na=False) |
            result["location"].str.contains("new cairo", case=False, na=False)
        ]

    if "october" in q or "6 october" in q or "oct" in q:
        result = result[
            result["source_sheet"].str.contains("oct", case=False, na=False) |
            result["location"].str.contains("october", case=False, na=False)
        ]

    if "zayed" in q or "sheikh zayed" in q:
        result = result[
            result["location"].str.contains("zayed", case=False, na=False) |
            result["source_sheet"].str.contains("zayed", case=False, na=False)
        ]

    # sorting
    if "cheapest" in q or "lowest price" in q:
        result = result.sort_values(by="price", ascending=True, na_position="last")

    elif "most expensive" in q or "highest price" in q or "expensive" in q:
        result = result.sort_values(by="price", ascending=False, na_position="last")

    elif "best value" in q or "price per sqm" in q:
        result = result.sort_values(by="price_per_sqm", ascending=True, na_position="last")

    return result


def summarize_results(result_df):
    if result_df.empty:
        return "No matching properties found in the dataset."

    columns_to_show = [
        col for col in [
            "source_sheet",
            "project_name",
            "unit_code",
            "unit_type",
            "price",
            "bua",
            "garden_area",
            "roof_area",
            "delivery_status",
            "status",
            "price_per_sqm",
            "has_garden",
            "has_roof",
        ] if col in result_df.columns
    ]

    compact_df = result_df[columns_to_show].copy()
    return compact_df.to_string(index=False)