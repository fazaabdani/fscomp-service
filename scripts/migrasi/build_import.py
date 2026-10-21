"""Build import_data.json (customers, tickets, payments) from the old-app exports."""
from load_old import *
import json
from datetime import date

proses = DATA["proses"][1]; bisa = DATA["bisa"][1]; sudah = DATA["sudah"][1]
gar = {r["No. Servis"]: r for r in DATA["garansi"][1]}; bay = {r["No. Servis"]: r for r in DATA["bayar"][1]}
cust = DATA["cust"][1]
handled = json.load(open(os.path.join(os.path.dirname(__file__), "handled_assign.json")))

TECH = {"rosyadi": "Rosyadi", "LUDFY": "Ludfy", "Faza": "Faza", "Irham": "Irham", "Admin": "Admin"}

def digits(s): return re.sub(r"\D", "", s or "")
def norm(phone):
    d = digits(phone)
    if len(d) < 5: return ""
    return d if d.startswith("62") else "62" + re.sub(r"^0", "", d)
def sid(old): # '#261013094558' -> 'SRV-261013-094558'
    x = old.lstrip("#"); return f"SRV-{x[:6]}-{x[6:]}"
def days_between(a, b):
    y1, m1, d1 = map(int, a.split("-")); y2, m2, d2 = map(int, b.split("-")); return (date(y2, m2, d2) - date(y1, m1, d1)).days
def tempo_days(label):
    m = re.match(r"Tempo\s+(\d+)\s+(Hari|Minggu|Bulan)", label or "")
    if not m: return 0
    n = int(m.group(1)); return n * {"Hari": 1, "Minggu": 7, "Bulan": 30}[m.group(2)]

# ---- customers
customers = []
cust_by_norm = {}
for r in cust:
    phone = digits(r["Telepon"])
    n = norm(phone)
    c = dict(name=r["Nama Pelanggan"].strip(), category=r["Kategori"].strip() or "User", phone=phone or "-", phoneNormalized=n or None,
             address=r["Alamat Pelanggan"].strip() or "-", total=int(digits(r["Total Servis"]) or 0))
    customers.append(c)
    if n: cust_by_norm[n] = c

tickets = []; payments = []
def mk_ticket(r, kind):
    oid = r["No. Servis"]
    rd, rt = dt(r["Tgl. Terima"])
    phone = digits(r["Telepon"])
    n = norm(phone)
    c = cust_by_norm.get(n)
    name = (r["Pemilik"] or "").strip() or "Tanpa Nama"
    t = dict(id=sid(oid), oldId=oid, customer=name, phone=phone, device=r["Nama Barang"].strip() or "-", brand="",
             serial=(r.get("Nomor Serial") or "").strip() or "-", issue=(r["Kerusakan"] or "").strip() or "-",
             accessories=(r.get("Kelengkapan") or "").strip() or "Unit only",
             receivedAt=rd, receivedTime=rt, category=(c["category"] if c else "User"), address=(c["address"] if c else "-"))
    if kind == "proses":
        dp = money(r["DP"])
        t.update(status="Sedang Dikerjakan", technician="", receivedBy=TECH.get(r["Penerima"], r["Penerima"]), estimate=0, downPayment=dp, finalCost=0,
                 costConfirmed=False, customerConfirmed=False, condition=None, serviceAction=None, partCost=None, paymentMethod=None, paymentTermDays=0,
                 warrantyDays=None, pickedUpAt=None, pickedUpTime=None, handledAt=None, handledTime=None, statusChangedAt=rd)
        if dp > 0: payments.append(dict(ticketId=t["id"], amount=dp, method="Tidak tercatat", at=(rd, rt)))
    elif kind == "bisa":
        dp = money(r["DP"]); biaya = money(r["Biaya"]); hd, ht = dt(r["Tgl. Selesai Ditangani"])
        t.update(status="Bisa Diambil", technician=TECH.get(r["Teknisi"], r["Teknisi"]), receivedBy=None, estimate=biaya, downPayment=dp, finalCost=biaya,
                 costConfirmed=True, customerConfirmed=True, condition=r["Kondisi"] or None, serviceAction=(r["Ket./Tindakan"] or "").strip() or None, partCost=None,
                 paymentMethod=None, paymentTermDays=0, warrantyDays=None, pickedUpAt=None, pickedUpTime=None, handledAt=hd, handledTime=ht, statusChangedAt=hd)
        if dp > 0: payments.append(dict(ticketId=t["id"], amount=dp, method="Tidak tercatat", at=(rd, rt)))
    else:
        b = bay[oid]; g = gar[oid]
        biaya = money(r["Biaya"]); tagihan = money(b["Tagihan"]); paid = biaya - tagihan
        pd, pt = dt(r["Tgl. Ambil"])
        gdays = 0
        if g["Garansi"] != "Tidak Ada":
            ge = dt(g["Tgl. Garansi Berakhir"])[0]; gdays = days_between(pd, ge)
        method = b["Cara Pembayaran"].strip()
        t.update(status="Sudah Diambil", technician=TECH.get(r["Teknisi"], r["Teknisi"]), receivedBy=None, estimate=biaya, downPayment=paid, finalCost=biaya,
                 costConfirmed=True, customerConfirmed=True, condition=r["Kondisi"] or None, serviceAction=(r["Ket./Tindakan"] or "").strip() or None,
                 partCost=money(r["Modal"]), paymentMethod=method, paymentTermDays=tempo_days(method), warrantyDays=gdays,
                 pickedUpAt=pd, pickedUpTime=pt, handledAt=handled.get(oid, pd), handledTime=None, statusChangedAt=pd)
        if paid > 0: payments.append(dict(ticketId=t["id"], amount=paid, method=method, at=(pd, pt)))
    tickets.append(t)

for r in proses: mk_ticket(r, "proses")
for r in bisa: mk_ticket(r, "bisa")
for r in sudah: mk_ticket(r, "sudah")

# customers without any ticket match are fine; tickets without customer record -> none created (blank phone)
by_phone_first = {}
for t in tickets:
    n = norm(t["phone"])
    if n and (n not in by_phone_first or t["receivedAt"] < by_phone_first[n]): by_phone_first[n] = t["receivedAt"]
for c in customers: c["createdAt"] = by_phone_first.get(c["phoneNormalized"] or "", "2026-10-21")

out = dict(customers=customers, tickets=tickets, payments=payments)
json.dump(out, open(os.path.join(os.path.dirname(__file__), "import_data.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("customers", len(customers), "tickets", len(tickets), "payments", len(payments))
print("status:", Counter(t["status"] for t in tickets))
print("payments sum == sum DP:", sum(p["amount"] for p in payments), sum(t["downPayment"] for t in tickets))
print("tickets with phone but no customer:", [t["id"] for t in tickets if norm(t["phone"]) and norm(t["phone"]) not in cust_by_norm])
print("blank phone tickets:", [(t["id"], t["customer"]) for t in tickets if not norm(t["phone"])])
print("customer total vs tickets:", sum(c["total"] for c in customers))
print("sample:", json.dumps(tickets[30], ensure_ascii=False)[:900])
