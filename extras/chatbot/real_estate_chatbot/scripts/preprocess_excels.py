import os
import re
import pandas as pd

RAW_FOLDER = "data/raw"
OUTPUT_FILE = "data/processed/real_estate_master.csv"

COLUMN_MAP = {
    # project-ish
    "project": "project_name",
    "project name": "project_name",
    "compound": "project_name",
    "development": "project_name",
    "park": "park",
    "stage": "stage",

    # ids / naming
    "unit id": "unit_code",
    "unit code": "unit_code",
    "unit: unit no.": "unit_code",
    "name": "unit_name",
    "unit name": "unit_name",
    "segment name": "segment_name",

    # unit type / category
    "unit type": "unit_type",
    "usage type": "unit_type",
    "segment type": "unit_type",
    "category": "category",
    "building type": "building_type",
    "building status": "building_status",

    # price
    "unit price": "price",
    "nominal price": "price",
    "price": "price",
    "grand total (pricing structure)": "price",
    "unit total with finishing price": "price_with_finishing",
    "price/m2": "price_per_sqm",
    "meter price": "price_per_sqm",

    # areas
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

    # rooms
    "number of bedrooms": "bedrooms",
    "no. of bedrooms": "bedrooms",
    "bedroom": "bedrooms",
    "bedrooms": "bedrooms",

    "bathroom": "bathrooms",
    "bathrooms": "bathrooms",

    # finishing / delivery / status
    "finishing": "finishing",
    "finishing specs": "finishing",
    "finishing option": "finishing",

    "delivery status": "delivery_status",
    "planned delivery date": "delivery_status",
    "actual delivery date": "actual_delivery",

    "unit status": "status",
    "status": "status",
    "state": "status",

    # other helpful text fields
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
]

TEXT_COLUMNS = [
    "source_file", "source_sheet", "project_name", "park", "stage", "unit_code", "unit_name",
    "unit_type", "category", "building_type", "finishing", "delivery_status", "status",
    "location", "model", "model_group_code", "owner", "comment"
]

NUMERIC_COLUMNS = [
    "price", "price_with_finishing", "price_per_sqm", "bua", "land_area",
    "garden_area", "roof_area", "bedrooms", "bathrooms"
]


def clean_column_name(col):
    col = str(col).strip().lower()
    col = re.sub(r"\s+", " ", col)
    return col


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
    for col in cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({
                "nan": pd.NA,
                "None": pd.NA,
                "none": pd.NA,
                "": pd.NA,
                "-": pd.NA,
                "--": pd.NA,
            })
    return df


def normalize_numeric(df, cols):
    for col in cols:
        if col in df.columns:
            s = df[col].astype(str).str.strip()
            s = s.replace({
                "nan": pd.NA,
                "None": pd.NA,
                "none": pd.NA,
                "": pd.NA,
                "-": pd.NA,
                "--": pd.NA,
            })
            s = s.str.replace(",", "", regex=False)
            s = s.str.replace("egp", "", case=False, regex=False)
            s = s.str.replace("sqm", "", case=False, regex=False)
            s = s.str.replace("sq. m", "", case=False, regex=False)
            s = s.str.replace("m²", "", regex=False)
            s = s.str.extract(r"(\d+(?:\.\d+)?)")[0]
            df[col] = pd.to_numeric(s, errors="coerce")
    return df


def extract_bedrooms_from_text(text):
    if pd.isna(text):
        return None

    t = str(text).lower().strip()

    patterns = [
        r"(\d+)\s*\+\s*nanny",             # "4 + nanny" -> still 4
        r"(\d+)\s*br\b",                   # "5BR", "2 BR"
        r"(\d+)\s*bedrooms?\b",            # "3 Bedrooms"
        r"(\d+)\s*bed\b",                  # "3 bed"
        r"(\d+)\s*bedrooms?\s*\+\s*nanny", # "4 Bedrooms + Nanny"
        r"(\d+)\s*br\s*\+\s*nanny",
    ]

    for p in patterns:
        m = re.search(p, t)
        if m:
            return int(m.group(1))

    return None


def fill_bedrooms(df):
    if "bedrooms" not in df.columns:
        df["bedrooms"] = pd.NA

    sources = []
    for col in ["unit_type", "category", "model", "model_group_code", "unit_name", "comment"]:
        if col in df.columns:
            sources.append(col)

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

    text = " | ".join([str(x) for x in candidates if pd.notna(x)]).lower()

    if "villa" in text:
        return "Villa"
    if "town" in text:
        return "Townhouse"
    if "penthouse" in text or "roof" in text:
        return "Penthouse/Roof"
    if "duplex" in text:
        return "Duplex"
    if "apartment" in text or "flat" in text:
        return "Apartment"
    if "chalet" in text:
        return "Chalet"
    if "office" in text:
        return "Office"
    if "retail" in text:
        return "Retail"
    return row.get("unit_type")


def fill_unit_type(df):
    if "unit_type" not in df.columns:
        df["unit_type"] = pd.NA

    df["unit_type"] = df.apply(infer_unit_type, axis=1)
    return df


def fill_project_name(df, sheet_name):
    if "project_name" not in df.columns:
        df["project_name"] = pd.NA

    invalid = (
        df["project_name"].isna()
        | (df["project_name"].astype(str).str.strip() == "")
        | (df["project_name"].astype(str).str.fullmatch(r"\d{4}-\d{2}-\d{2}", na=False))
        | (df["project_name"].astype(str).str.lower().str.contains(r"^phase", na=False))
    )

    df.loc[invalid, "project_name"] = sheet_name
    return df


def add_boolean_features(df):
    df["has_garden"] = df["garden_area"].fillna(0) > 0
    df["has_roof"] = df["roof_area"].fillna(0) > 0
    return df


def drop_fully_empty_rows(df):
    useful = [c for c in df.columns if c not in ["source_file", "source_sheet"]]
    return df.dropna(how="all", subset=useful)


def process_normal_sheet(df, file_path, sheet_name):
    df.columns = [clean_column_name(c) for c in df.columns]
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
    df = df[TARGET_COLUMNS + ["has_garden", "has_roof"]]
    df = drop_fully_empty_rows(df)

    return df


def process_shifted_header_sheet(df_raw, file_path, sheet_name):
    """
    Handles sheets where the real headers are in the first row,
    مثل Sales Availability Report style.
    """
    if df_raw.empty:
        return pd.DataFrame()

    first_row = df_raw.iloc[0].tolist()
    df = df_raw.iloc[1:].copy()
    df.columns = [clean_column_name(c) for c in first_row]

    return process_normal_sheet(df, file_path, sheet_name)


def process_excel_file(file_path):
    all_sheets = pd.read_excel(file_path, sheet_name=None, header=0)
    frames = []

    for sheet_name, df in all_sheets.items():
        if df is None or df.empty:
            continue

        # Skip obvious hidden/noise sheets
        if "hidden" in str(sheet_name).lower():
            continue

        cols_joined = " | ".join([str(c) for c in df.columns]).lower()

        try:
            # Detect shifted header sheets
            if (
                "sales availability report" in cols_joined
                or "unnamed:" in cols_joined and "project" not in cols_joined and df.shape[1] > 10
            ):
                processed = process_shifted_header_sheet(df, file_path, sheet_name)
            else:
                processed = process_normal_sheet(df, file_path, sheet_name)

            if not processed.empty:
                frames.append(processed)

        except Exception as e:
            print(f"Error in sheet '{sheet_name}' of file '{os.path.basename(file_path)}': {e}")

    if frames:
        return pd.concat(frames, ignore_index=True)

    return pd.DataFrame(columns=TARGET_COLUMNS + ["has_garden", "has_roof"])


def main():
    os.makedirs("data/processed", exist_ok=True)

    excel_files = [
        os.path.join(RAW_FOLDER, f)
        for f in os.listdir(RAW_FOLDER)
        if f.lower().endswith(".xlsx")
    ]

    if not excel_files:
        print("No Excel files found in data/raw")
        return

    all_data = []
    for file_path in excel_files:
        print(f"Processing: {file_path}")
        df = process_excel_file(file_path)
        if not df.empty:
            all_data.append(df)

    if not all_data:
        print("No valid Excel data found.")
        return

    final_df = pd.concat(all_data, ignore_index=True).drop_duplicates()

    final_df.to_csv(OUTPUT_FILE, index=False)

    print(f"\nSaved cleaned data to: {OUTPUT_FILE}")
    print("\nColumns:")
    print(final_df.columns.tolist())

    print("\nSample rows:")
    print(final_df.head(10))

    print("\nMissing values count:")
    print(final_df.isna().sum())


if __name__ == "__main__":
    main()