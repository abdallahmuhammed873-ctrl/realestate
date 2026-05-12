import argparse
import json
import os
import re
from pathlib import Path

import pandas as pd

COLUMN_MAP = {
    "project": "project_name",
    "project name": "project_name",
    "compound": "project_name",
    "development": "project_name",
    "park": "park",
    "stage": "stage",
    "unit id": "unit_code",
    "unit code": "unit_code",
    "unit: unit no.": "unit_code",
    "name": "unit_name",
    "unit name": "unit_name",
    "segment name": "unit_name",
    "unit type": "unit_type",
    "usage type": "unit_type",
    "segment type": "unit_type",
    "category": "category",
    "building type": "building_type",
    "building status": "building_status",
    "unit price": "price",
    "nominal price": "price",
    "price": "price",
    "grand total (pricing structure)": "price",
    "unit total with finishing price": "price_with_finishing",
    "price/m2": "price_per_sqm",
    "meter price": "price_per_sqm",
    "bua": "bua",
    "built up area": "bua",
    "built-up area": "bua",
    "built area  (pricing structure)": "bua",
    "space": "bua",
    "garden area": "garden_area",
    "garden area (sq. m)": "garden_area",
    "garden / outdoor area (pricing structure)": "garden_area",
    "garden space": "garden_area",
    "roof area": "roof_area",
    "roof space": "roof_area",
    "semi covered roof area  (pricing structure)": "roof_area",
    "penthouse area": "roof_area",
    "land area": "land_area",
    "total land area (sq. m)": "land_area",
    " land area  (pricing structure)": "land_area",
    "number of bedrooms": "bedrooms",
    "no. of bedrooms": "bedrooms",
    "bedroom": "bedrooms",
    "bedrooms": "bedrooms",
    "bathroom": "bathrooms",
    "bathrooms": "bathrooms",
    "finishing": "finishing",
    "finishing specs": "finishing",
    "finishing option": "finishing",
    "delivery status": "delivery_status",
    "planned delivery date": "delivery_status",
    "actual delivery date": "actual_delivery",
    "unit status": "status",
    "status": "status",
    "state": "status",
    "model": "model",
    "model group code": "model_group_code",
    "owner": "owner",
    "comment": "comment",
    "floor": "floor",
    "view": "view",
    "location": "location",
}

TARGET_COLUMNS = [
    "source_file",
    "source_sheet",
    "project_name",
    "park",
    "stage",
    "unit_code",
    "unit_name",
    "unit_type",
    "category",
    "building_type",
    "price",
    "price_with_finishing",
    "price_per_sqm",
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
    "model",
    "model_group_code",
    "owner",
    "comment",
    "has_garden",
    "has_roof",
]

TEXT_COLUMNS = [
    "source_file",
    "source_sheet",
    "project_name",
    "park",
    "stage",
    "unit_code",
    "unit_name",
    "unit_type",
    "category",
    "building_type",
    "finishing",
    "delivery_status",
    "status",
    "location",
    "model",
    "model_group_code",
    "owner",
    "comment",
]

NUMERIC_COLUMNS = [
    "price",
    "price_with_finishing",
    "price_per_sqm",
    "bua",
    "land_area",
    "garden_area",
    "roof_area",
    "bedrooms",
    "bathrooms",
]

GENERIC_PROJECT_NAMES = {
    "worksheet",
    "available units",
    "units availability report",
    "sodic availability all projects",
    "resale",
}


def clean_column_name(col):
    value = str(col).strip().lower()
    return re.sub(r"\s+", " ", value)


def standardize_columns(df):
    rename_map = {}
    for col in df.columns:
        cleaned = clean_column_name(col)
        rename_map[col] = COLUMN_MAP.get(cleaned, cleaned)
    return df.rename(columns=rename_map)


def flatten_duplicate_columns(df):
    if not df.columns.duplicated().any():
        return df

    out = pd.DataFrame()
    for col in pd.unique(df.columns):
        same = df.loc[:, df.columns == col]
        if isinstance(same, pd.DataFrame) and same.shape[1] > 1:
            out[col] = same.bfill(axis=1).iloc[:, 0]
        else:
            out[col] = same.iloc[:, 0]
    return out


def normalize_text(df, cols):
    null_tokens = {"nan", "none", "", "-", "--", "<na>"}
    for col in cols:
        if col in df.columns:
            normalized = df[col].astype(str).str.strip()
            normalized = normalized.where(~normalized.str.lower().isin(null_tokens), pd.NA)
            df[col] = normalized
    return df


def normalize_numeric(df, cols):
    for col in cols:
        if col in df.columns:
            value = df[col].astype(str).str.strip()
            value = value.replace(
                {
                    "nan": pd.NA,
                    "None": pd.NA,
                    "none": pd.NA,
                    "": pd.NA,
                    "-": pd.NA,
                    "--": pd.NA,
                }
            )
            value = value.str.replace(",", "", regex=False)
            value = value.str.replace("egp", "", case=False, regex=False)
            value = value.str.replace("sqm", "", case=False, regex=False)
            value = value.str.replace("sq. m", "", case=False, regex=False)
            value = value.str.replace("mÂ²", "", regex=False)
            value = value.str.extract(r"(\d+(?:\.\d+)?)")[0]
            df[col] = pd.to_numeric(value, errors="coerce")
    return df


def extract_bedrooms_from_text(text):
    if pd.isna(text):
        return None

    normalized = str(text).lower().strip()
    patterns = [
        r"(\d+)\s*\+\s*nanny",
        r"(\d+)\s*br\b",
        r"(\d+)\s*bedrooms?\b",
        r"(\d+)\s*bed\b",
        r"studio",
    ]

    for pattern in patterns:
        match = re.search(pattern, normalized)
        if not match:
            continue
        if pattern == r"studio":
            return 1
        return int(match.group(1))

    return None


def fill_bedrooms(df):
    if "bedrooms" not in df.columns:
        df["bedrooms"] = pd.NA

    sources = [col for col in ["unit_type", "category", "model", "model_group_code", "unit_name", "comment"] if col in df.columns]
    if not sources:
        return df

    inferred = []
    for _, row in df.iterrows():
        current = row.get("bedrooms")
        if pd.notna(current):
            inferred.append(current)
            continue

        found = None
        for col in sources:
            found = extract_bedrooms_from_text(row.get(col))
            if found is not None:
                break
        inferred.append(found)

    df["bedrooms"] = pd.to_numeric(inferred, errors="coerce")
    return df


def infer_unit_type(row):
    candidates = [
        row.get("unit_type"),
        row.get("category"),
        row.get("building_type"),
        row.get("model"),
        row.get("unit_name"),
    ]
    text = " | ".join([str(value) for value in candidates if pd.notna(value)]).lower()

    if "villa" in text:
        return "Villa"
    if "town" in text:
        return "Townhouse"
    if "penthouse" in text or "roof" in text:
        return "Penthouse/Roof"
    if "duplex" in text:
        return "Duplex"
    if "apartment" in text or "flat" in text or "residence" in text or "millennial" in text:
        return "Apartment"
    if "chalet" in text:
        return "Chalet"
    if "office" in text:
        return "Office"
    if "retail" in text or "commercial" in text or "clinic" in text:
        return "Commercial"
    return row.get("unit_type")


def fill_unit_type(df):
    if "unit_type" not in df.columns:
        df["unit_type"] = pd.NA
    df["unit_type"] = df.apply(infer_unit_type, axis=1)
    return df


def is_date_like(value):
    return bool(value and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value))


def fill_project_name(df, sheet_name):
    if "project_name" not in df.columns:
        df["project_name"] = pd.NA

    project = df["project_name"].astype("string")
    invalid = project.isna() | (project.str.strip() == "") | project.apply(is_date_like)
    invalid = invalid | project.str.lower().str.startswith("phase", na=False)

    if sheet_name.lower().strip() not in GENERIC_PROJECT_NAMES:
        df.loc[invalid, "project_name"] = sheet_name
    return df


def add_boolean_features(df):
    df["has_garden"] = df["garden_area"].fillna(0) > 0
    df["has_roof"] = df["roof_area"].fillna(0) > 0
    return df


def drop_fully_empty_rows(df):
    useful = [col for col in df.columns if col not in ["source_file", "source_sheet"]]
    return df.dropna(how="all", subset=useful)


def process_normal_sheet(df, file_path, sheet_name):
    df.columns = [clean_column_name(col) for col in df.columns]
    df = standardize_columns(df)
    df = flatten_duplicate_columns(df)

    df["source_file"] = os.path.basename(file_path)
    df["source_sheet"] = sheet_name

    for col in TARGET_COLUMNS:
        if col not in df.columns:
            df[col] = pd.NA

    df = normalize_text(df, TEXT_COLUMNS)
    df = normalize_numeric(df, NUMERIC_COLUMNS)
    df = fill_project_name(df, sheet_name)
    df = fill_unit_type(df)
    df = fill_bedrooms(df)

    if "price_per_sqm" not in df.columns or df["price_per_sqm"].isna().all():
        df["price_per_sqm"] = df["price"] / df["bua"]

    df = add_boolean_features(df)
    df = df[TARGET_COLUMNS]
    df = drop_fully_empty_rows(df)
    return df


def process_shifted_header_sheet(df_raw, file_path, sheet_name):
    if df_raw.empty:
        return pd.DataFrame()

    first_row = df_raw.iloc[0].tolist()
    df = df_raw.iloc[1:].copy()
    df.columns = [clean_column_name(col) for col in first_row]
    return process_normal_sheet(df, file_path, sheet_name)


def process_excel_file(file_path):
    all_sheets = pd.read_excel(file_path, sheet_name=None, header=0)
    frames = []

    for sheet_name, df in all_sheets.items():
        if df is None or df.empty:
            continue
        if "hidden" in str(sheet_name).lower():
            continue

        joined_columns = " | ".join([str(col) for col in df.columns]).lower()

        try:
            if "sales availability report" in joined_columns or (
                "unnamed:" in joined_columns and "project" not in joined_columns and df.shape[1] > 10
            ):
                processed = process_shifted_header_sheet(df, file_path, sheet_name)
            else:
                processed = process_normal_sheet(df, file_path, sheet_name)

            if not processed.empty:
                frames.append(processed)
        except Exception as error:
            print(
                f"Error in sheet '{sheet_name}' of file '{os.path.basename(file_path)}': {error}",
                flush=True,
            )

    if frames:
        return pd.concat(frames, ignore_index=True)

    return pd.DataFrame(columns=TARGET_COLUMNS)


def normalize_record_value(value):
    if pd.isna(value):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = str(value).strip()
    if cleaned.lower() in {"", "nan", "none", "<na>"}:
        return None
    return cleaned


def dataframe_to_records(df):
    records = []
    for index, row in df.reset_index(drop=True).iterrows():
        payload = {column: normalize_record_value(row.get(column)) for column in TARGET_COLUMNS}
        payload["row_index"] = index
        records.append(payload)
    return records


def build_payload(raw_folder):
    excel_files = sorted(
        [
            raw_folder / file_name
            for file_name in os.listdir(raw_folder)
            if file_name.lower().endswith(".xlsx")
        ]
    )
    if not excel_files:
        raise FileNotFoundError(f"No Excel files found in {raw_folder}")

    frames = []
    for file_path in excel_files:
        print(f"Processing: {file_path.name}", file=os.sys.stderr)
        frame = process_excel_file(str(file_path))
        if not frame.empty:
            frames.append(frame)

    if not frames:
        raise ValueError("No valid inventory rows were produced from the raw Excel files.")

    final_df = pd.concat(frames, ignore_index=True).drop_duplicates()
    return dataframe_to_records(final_df)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-folder", default=str(Path(__file__).resolve().parent.parent / "data" / "raw"))
    parser.add_argument("--format", choices=["json"], default="json")
    parser.add_argument("--output", default="-")
    args = parser.parse_args()

    raw_folder = Path(args.raw_folder)
    records = build_payload(raw_folder)
    serialized = json.dumps(records, ensure_ascii=False)

    if args.output == "-":
        print(serialized)
    else:
        Path(args.output).write_text(serialized, encoding="utf-8")
        print(f"Saved {len(records)} records to {args.output}", file=os.sys.stderr)


if __name__ == "__main__":
    main()
