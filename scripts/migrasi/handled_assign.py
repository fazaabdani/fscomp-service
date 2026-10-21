"""Reconstruct per-ticket 'Tgl. Selesai Ditangani' for picked-up tickets so that the old app's
'Barang Servis Telah Ditangani' (Jul-Oct 2026) and the October per-technician counts are reproduced.
The exports only carry that date for tickets still in 'Bisa Diambil', so the rest is estimated
(min-cost flow: each ticket handled between received and pickup date, as close to pickup as the
daily/technician counts allow)."""
from load_old import *
from datetime import date, timedelta
import json, collections

proses = DATA["proses"][1]; bisa = DATA["bisa"][1]; sudah = DATA["sudah"][1]
START = "2026-07-01"

def d2(s): y, m, d = map(int, s.split("-")); return date(y, m, d)
def iso(d): return d.isoformat()

def cnt(s):
    m = re.search(r"\d+", s or ""); return int(m.group(0)) if m else 0

# ---- demand
need_day = collections.Counter()          # day -> total handled (all months Jul-Oct)
for k in ("lap_jul", "lap_agu", "lap_sep", "lap_okt"):
    for r in DATA[k][1]:
        vals = list(r.values()); d, _ = dt(vals[0])
        if d: need_day[d] = cnt(vals[2])
tech_need = {}                              # (day, tech) for October
head, rows = DATA["tek_okt"]
for r in rows:
    vals = list(r.values()); d, _ = dt(vals[0])
    if d:
        for i in range(1, len(head)): tech_need[(d, head[i])] = cnt(vals[i])
OCT = "2026-10"

# subtract fixed handled dates of 'Bisa Diambil' tickets
fixed_day = collections.Counter(); fixed_tech = collections.Counter()
for r in bisa:
    d, _ = dt(r["Tgl. Selesai Ditangani"])
    if d and d >= START:
        fixed_day[d] += 1
        if d.startswith(OCT): fixed_tech[(d, r["Teknisi"])] += 1

# demand nodes: Jul-Sep by day; Oct by (day, tech)
demand = {}
for d, n in need_day.items():
    if d.startswith(OCT):
        for (dd, t), k in tech_need.items():
            if dd == d: demand[("T", d, t)] = k - fixed_tech.get((d, t), 0)
    else:
        demand[("D", d)] = n - fixed_day.get(d, 0)
bad = {k: v for k, v in demand.items() if v < 0}
print("negative residual demand:", bad)

# ---- tickets needing assignment
tickets = []
for r in sudah:
    pd, _ = dt(r["Tgl. Ambil"]); rd, _ = dt(r["Tgl. Terima"])
    if pd >= START:
        tickets.append(dict(id=r["No. Servis"], pick=pd, recv=rd, tech=r["Teknisi"]))
print("tickets to assign:", len(tickets), "total residual demand:", sum(demand.values()))

# ---- min cost flow
class MCF:
    def __init__(self, n): self.n = n; self.g = [[] for _ in range(n)]
    def add(self, u, v, cap, cost):
        self.g[u].append([v, cap, cost, len(self.g[v])]); self.g[v].append([u, 0, -cost, len(self.g[u]) - 1])
    def run(self, s, t):
        flow = cost = 0
        while True:
            dist = [10**15] * self.n; inq = [False] * self.n; prev = [None] * self.n
            dist[s] = 0; q = collections.deque([s])
            while q:
                u = q.popleft(); inq[u] = False
                for i, (v, cap, c, _) in enumerate(self.g[u]):
                    if cap > 0 and dist[u] + c < dist[v]:
                        dist[v] = dist[u] + c; prev[v] = (u, i)
                        if not inq[v]: inq[v] = True; q.append(v)
            if dist[t] >= 10**15: break
            # augment 1 unit (caps may be >1 on sink edges, but source edges are 1)
            f = 10**9; v = t
            while v != s: u, i = prev[v]; f = min(f, self.g[u][i][1]); v = u
            v = t
            while v != s: u, i = prev[v]; self.g[u][i][1] -= f; self.g[v][self.g[u][i][3]][1] += f; v = u
            flow += f; cost += f * dist[t]
        return flow, cost

nodes = {"S": 0, "T": 1, "OUT": 2, "UNASSIGNED": 3}
def nid(key):
    if key not in nodes: nodes[key] = len(nodes)
    return nodes[key]
for i in range(len(tickets)): nid(("tk", i))
for k in demand: nid(k)
g = MCF(len(nodes) + 5)
BIG = 10000
g.add(nodes["OUT"], nodes["T"], 10**6, 0); g.add(nodes["UNASSIGNED"], nodes["T"], 10**6, 0)
for k, v in demand.items():
    g.add(nid(k), nodes["T"], max(v, 0), -BIG)      # reward for filling demand
edge_log = []
for i, t in enumerate(tickets):
    g.add(0, nid(("tk", i)), 1, 0)
    lo = max(d2(t["recv"]), d2(START)); hi = d2(t["pick"])
    d = lo
    while d <= hi:
        ds = iso(d)
        key = ("T", ds, t["tech"]) if ds.startswith(OCT) else ("D", ds)
        if key in demand:
            g.add(nid(("tk", i)), nid(key), 1, (hi - d).days)
        d += timedelta(days=1)
    if d2(t["recv"]) < d2(START):
        g.add(nid(("tk", i)), nodes["OUT"], 1, 50)  # handled before July: outside any report month
    g.add(nid(("tk", i)), nodes["UNASSIGNED"], 1, 5000)
flow, cost = g.run(0, 1)
print("flow", flow, "cost", cost)

# ---- read assignment
assign = {}
for i, t in enumerate(tickets):
    u = nid(("tk", i))
    for (v, cap, c, rev) in g.g[u]:
        if cap == 0 and v != 0 and c >= 0 and g.g[v][rev][1] == 1:   # used edge
            for key, idx in nodes.items():
                if idx == v: assign[t["id"]] = key
unassigned = [k for k, v in assign.items() if v == "UNASSIGNED"]
outside = [k for k, v in assign.items() if v == "OUT"]
print("assigned to days:", sum(1 for v in assign.values() if isinstance(v, tuple)), "outside:", len(outside), "unassigned:", len(unassigned))

# unfilled demand
filled = collections.Counter()
for k, v in assign.items():
    if isinstance(v, tuple): filled[v] += 1
unfilled = {k: demand[k] - filled.get(k, 0) for k in demand if demand[k] - filled.get(k, 0) != 0}
print("unfilled demand nodes:", unfilled)
dev = collections.Counter()
for t in tickets:
    v = assign.get(t["id"])
    if isinstance(v, tuple): dev[(d2(t["pick"]) - d2(v[1])).days] += 1
print("days before pickup distribution:", sorted(dev.items())[:15])

# output: id -> handled date
out = {}
for t in tickets:
    v = assign.get(t["id"])
    if isinstance(v, tuple): out[t["id"]] = v[1]
    elif v == "OUT": out[t["id"]] = max(d2(t["recv"]), d2("2026-06-30") if d2(t["recv"]) < d2(START) else d2(t["recv"])).isoformat() if d2(t["recv"]) < d2(START) else t["recv"]
    else: out[t["id"]] = t["pick"]
json.dump(out, open(os.path.join(os.path.dirname(__file__), "handled_assign.json"), "w"))
print("written", len(out))
