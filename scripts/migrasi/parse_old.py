import sys, os, re, json
from html.parser import HTMLParser

class T(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []   # list of tables; table = list of rows; row = list of cells(text)
        self.stack = []
        self.cell = None
        self.row = None
        self.rowspan_note = []
    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.stack.append([])
        elif tag == "tr" and self.stack:
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []
            self._attrs = dict(attrs)
        elif tag == "br" and self.cell is not None:
            self.cell.append("\n")
    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None and self.row is not None:
            txt = re.sub(r"[ \t\r\f\v]+", " ", "".join(self.cell)).strip()
            span = int(self._attrs.get("colspan", "1") or 1)
            self.row.append(txt)
            for _ in range(span - 1):
                self.row.append("")
            self.cell = None
        elif tag == "tr" and self.row is not None and self.stack:
            self.stack[-1].append(self.row)
            self.row = None
        elif tag == "table" and self.stack:
            self.tables.append(self.stack.pop())
    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

def parse(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            txt = raw.decode(enc)
            break
        except Exception:
            continue
    p = T()
    p.feed(txt)
    return p.tables, txt

if __name__ == "__main__":
    d = sys.argv[1]
    for f in sorted(os.listdir(d)):
        if not f.endswith(".xls"):
            continue
        tables, txt = parse(os.path.join(d, f))
        print("=" * 100)
        print(f, "bytes", os.path.getsize(os.path.join(d, f)), "tables", len(tables), [len(t) for t in tables])
        for ti, t in enumerate(tables):
            print(f"-- table {ti}: {len(t)} rows")
            for r in t[:6]:
                print("   ", json.dumps(r, ensure_ascii=False)[:400])
            if len(t) > 6:
                print("    ...")
                print("   ", json.dumps(t[-1], ensure_ascii=False)[:400])
