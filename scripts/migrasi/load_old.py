import os, re, json, sys
from collections import Counter, defaultdict
sys.path.insert(0, os.path.dirname(__file__))
from parse_old import parse

D = os.path.join(os.path.dirname(__file__), "old")
MONTHS = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "Mei": 5, "Jun": 6, "Jul": 7, "Agu": 8, "Sep": 9, "Okt": 10, "Nov": 11, "Des": 12,
          "Januari": 1, "Februari": 2, "Maret": 3, "April": 4, "Juni": 6, "Juli": 7, "Agustus": 8, "September": 9, "Oktober": 10, "November": 11, "Desember": 12}

def money(s):
    s = (s or "").strip()
    if not s or s.lower() in ("tidak ada", "-"):
        return 0
    m = re.search(r"-?[\d.]+", s.replace("Rp", ""))
    return int(m.group(0).replace(".", "")) if m else 0

def dt(s):
    """'Tgl. 19 Okt 2026 16:09 WIB' -> ('2026-10-19','16:09') ; date-only -> ('2026-10-19', None)"""
    s = (s or "").strip()
    m = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}:\d{2}))?", s)
    if not m:
        return (None, None)
    d, mo, y, t = m.groups()
    mo = MONTHS.get(mo)
    if not mo:
        return (None, None)
    return (f"{int(y):04d}-{mo:02d}-{int(d):02d}", t)

def load(name_part):
    for f in os.listdir(D):
        if f.endswith(".xls") and name_part in f:
            tables, _ = parse(os.path.join(D, f))
            t = tables[0]
            head = t[0]
            rows = []
            for r in t[1:]:
                r = r + [""] * (len(head) - len(r))
                rows.append(dict(zip(head, r)))
            return head, rows
    raise FileNotFoundError(name_part)

files = {
    "proses": "Data Proses Servis",
    "bisa": "Data Bisa Diambil",
    "sudah": "Data Sudah Diambil",
    "garansi": "Data Status Garansi",
    "bayar": "Data Status Pembayaran",
    "cust": "Data Pelanggan",
    "tek_okt": "Laporan Teknisi FS COMP Bulan Oktober",
    "lap_jul": "Bulan Juli 2026",
    "lap_agu": "Bulan Agustus 2026",
    "lap_sep": "Bulan September 2026",
    "lap_okt": "Laporan Servis FS COMP Bulan Oktober",
}
DATA = {}
for k, v in files.items():
    DATA[k] = load(v)
