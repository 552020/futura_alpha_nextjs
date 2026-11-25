import textwrap
"""Futura's sketches: the system running, and how things happen step by step.
Hand-drawn style of the Inception-of-Things sketches (552020/inception_of_things, docs/lab/nesting/tools/gen.py):
paper, ink, one accent colour; a dot marks who opens the connection or starts a step; dashed means written but not
running now. Writes ../src/*.html; public/diagrams/*.png are screenshots of them (node shots.mjs).
Usage: python3 docs/diagrams/tools/gen.py && node docs/diagrams/tools/shots.mjs"""
import os
from html import escape

W, H = 1500, 960
HERE = os.path.dirname(os.path.abspath(__file__))

class Sketch:
    def __init__(self, title, label):
        self.title, self.label = title, label
        self.shapes, self.texts, self.marks, self.defs = [], [], [], []
    # shapes (inside the hand-drawn filter)
    def box(self, x, y, w, h, kind="thin", plan=False, svc=False, fill=True, rx=6):
        cls = [kind] + (["fill"] if fill else []) + (["plan"] if plan else []) + (["svc"] if svc else [])
        self.shapes.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" class="{" ".join(cls)}"/>')
    def arrow(self, x1, y1, x2, y2, plan=False, accent=False):
        cls = "line" + (" plan" if plan else "") + (" acc" if accent else "")
        self.shapes.append(f'<path d="M{x1},{y1} L{x2},{y2}" class="{cls}" marker-end="url(#arrow)"/>')
    def route(self, d, plan=False, accent=False):
        """an arrow along a path with corners"""
        cls = "line" + (" plan" if plan else "") + (" acc" if accent else "")
        self.shapes.append(f'<path d="{d}" class="{cls}" marker-end="url(#arrow)"/>')
    def line(self, d, accent=True, plan=True):
        cls = "line" + (" acc" if accent else "") + (" plan" if plan else "")
        self.shapes.append(f'<path d="{d}" class="{cls}"/>')
    # marks (crisp, outside the filter)
    def door(self, x, y, w=16, h=30):
        self.marks.append(f'<rect x="{x - w/2}" y="{y - h/2}" width="{w}" height="{h}" rx="3" class="door"/>')
    def doorh(self, x, y, w=30, h=14):
        self.marks.append(f'<rect x="{x - w/2}" y="{y - h/2}" width="{w}" height="{h}" rx="3" class="door"/>')
    def dot(self, x, y): self.marks.append(f'<circle cx="{x}" cy="{y}" r="6" class="dot"/>')
    def t(self, x, y, s, cls="s", anchor=None):
        a = f' text-anchor="{anchor}"' if anchor else ""
        self.texts.append(f'<text x="{x}" y="{y}" class="{cls}"{a}>{escape(s)}</text>')
    def html(self):
        if any('class="dot"' in m for m in self.marks):
            self.dot(46, 40)
            self.t(62, 47, getattr(self, "legend", "who opens the connection"), "s")
        return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap">
<title>{escape(self.title)}</title>
<style>
  :root {{ --paper:#fbfaf6; --ink:#1d1d1b; --soft:#6b6a66; --accent:#b4531a; }}
  html, body {{ margin:0; background:var(--paper); color:var(--ink); }}
  body {{ padding:16px; font-family:"Patrick Hand","Bradley Hand","Segoe Print","Comic Sans MS","Chalkboard SE",cursive; }}
  svg {{ display:block; width:100%; height:auto; max-width:1500px; margin:0 auto; }}
  .line  {{ fill:none; stroke:var(--ink); stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; }}
  .thin  {{ fill:none; stroke:var(--ink); stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }}
  .plan  {{ stroke-dasharray:9 7; }}
  .svc   {{ stroke:var(--accent); stroke-width:2.2; }}
  .acc   {{ stroke:var(--accent); }}
  .fill  {{ fill:var(--paper); }}
  .dot   {{ fill:var(--accent); stroke:none; }}
  .door  {{ fill:var(--accent); stroke:var(--ink); stroke-width:1.6; }}
  .ca {{ fill:var(--accent); stroke:var(--ink); stroke-width:1; }}
  .cb {{ fill:var(--ink); stroke:var(--ink); stroke-width:1; }}
  .cc {{ fill:#c9c6bd; stroke:var(--ink); stroke-width:1; }}
  .cs {{ fill:url(#hatch); stroke:var(--ink); stroke-width:1; }}
  .ce {{ fill:none; stroke:#cfcdc6; stroke-width:1; }}
  .pw {{ fill:#f3d9c6; stroke:var(--accent); stroke-width:2; }}
  .pa {{ fill:#ffffff; stroke:var(--ink); stroke-width:2.2; }}
  .pk {{ fill:#dedbd2; stroke:var(--ink); stroke-width:1.4; }}
  .ps {{ fill:url(#hatch); stroke:var(--ink); stroke-width:1.4; }}
  .cn {{ fill:#fbfaf6; stroke:var(--ink); stroke-width:1.3; }}
  .cz {{ fill:none; stroke:var(--accent); stroke-width:3; }}
  .t     {{ font-size:22px; fill:var(--ink); }}
  .h     {{ font-size:30px; fill:var(--ink); }}
  .col   {{ font-size:24px; fill:var(--soft); letter-spacing:1px; }}
  .s     {{ font-size:18px; fill:var(--soft); }}
  .xs    {{ font-size:16px; fill:var(--soft); }}
  .a     {{ font-size:18px; fill:var(--accent); }}
  .mono  {{ font-family:ui-monospace,"SF Mono",Menlo,"DejaVu Sans Mono",monospace; font-size:17px; fill:var(--ink); }}
  .monoa {{ font-family:ui-monospace,"SF Mono",Menlo,"DejaVu Sans Mono",monospace; font-size:16px; fill:var(--accent); }}
</style>
</head>
<body>
<svg viewBox="0 0 {W} {H}" role="img" aria-label="{escape(self.label)}">
  <defs>
    <filter id="hand" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="4"/>
    </filter>
    <marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M1,1 L11,6 L1,11" fill="none" stroke="#1d1d1b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
    {"".join(self.defs)}
  </defs>
  <g filter="url(#hand)">
    {chr(10).join("    " + s for s in self.shapes).strip()}
  </g>
  {chr(10).join("  " + m for m in self.marks).strip()}
  {chr(10).join("  " + s for s in self.texts).strip()}
</svg>
</body>
</html>
'''


AS_OF = "As of: 24 November 2026"
AS_OF_PERSONAL = "As of: 25 November 2026"

def footer(sk, lines, accent_line=None, as_of=None):
    y = 898
    for ln in lines:
        sk.t(60, y, ln, "s"); y += 28
    if accent_line:
        sk.t(60, y, accent_line, "a"); y += 28
    sk.t(1480, y - 28, as_of or AS_OF, "s", "end")

def note_box(sk, x, y, w, title, items, plan=False):
    """A box of short paragraphs, wrapped to the box width. Returns the y of its bottom edge."""
    width = (w - 28) // 7
    rows = []
    for k, item in enumerate(items):
        if k: rows.append(None)
        rows += textwrap.wrap(item, width)
    h = 44 + sum(8 if r is None else 20 for r in rows) + 12
    sk.box(x, y, w, h, "line", plan=plan, rx=6)
    sk.t(x + 18, y + 28, title, "t")
    yy = y + 54
    for r in rows:
        if r is None: yy += 8
        else:
            sk.t(x + 18, yy, r, "xs"); yy += 20
    return y + h

def steps_sketch(title, label, left, steps, foot, status, legend="who starts the step", as_of=None):
    """Three columns: where it starts, the numbered steps with who does them, what exists after each step.
    left = (column title, column subtitle, box title, box lines, what you do)"""
    col, colsub, btitle, blines, you_do = left
    sk = Sketch(title, label)
    sk.legend = legend
    sk.t(750, 46, title, "h", "middle")
    sk.box(20, 70, 1460, 790, "line", rx=10)
    sk.t(150, 122, col, "col", "middle"); sk.t(150, 150, colsub, "s", "middle")
    sk.t(680, 122, "THE STEPS", "col", "middle"); sk.t(680, 150, "what happens, in order", "s", "middle")
    sk.t(1260, 122, "WHAT EXISTS NOW", "col", "middle"); sk.t(1260, 150, "after each step", "s", "middle")
    n = len(steps)
    rowh = min(105, 630 // n)
    top = 200
    yy = 262 + len(blines) * 24 + 10
    you_lines = textwrap.wrap(you_do, 24)[:3]
    sk.box(30, 200, 240, yy + 22 + 20 * len(you_lines) + 6 - 200, "line", rx=6)
    sk.t(46, 232, btitle, "t")
    for i, ln in enumerate(blines): sk.t(46, 262 + i * 24, ln, "s")
    sk.t(46, yy, "you:", "xs")
    for j, ln in enumerate(you_lines): sk.t(46, yy + 22 + j * 20, ln, "a")
    sk.box(330, top - 10, 700, rowh * n + 20, "line")
    for i, (name, detail, actor, exists) in enumerate(steps):
        y = top + i * rowh
        bh = rowh - 14
        sk.box(346, y, 668, bh, "thin")
        sk.t(362, y + 30, str(i), "t")
        sk.t(396, y + 28, name, "t")
        dl = textwrap.wrap(detail, 74)[:2]
        dy, dstep = (52, 21) if rowh >= 100 or len(dl) == 1 else (48, 19)
        for j, ln in enumerate(dl): sk.t(396, y + dy + j * dstep, ln, "s")
        sk.t(1002, y + 28, actor, "a", "end")
        sk.box(1060, y, 400, bh, "thin")
        el = textwrap.wrap(exists, 40)[:3]
        estep = 21 if len(el) < 3 or rowh >= 100 else 18
        for j, ln in enumerate(el): sk.t(1074, y + 28 + j * estep, ln, "s" if j == 0 else "xs")
        sk.arrow(1016, y + bh // 2, 1056, y + bh // 2)
    sk.arrow(274, top + 30, 328, top + 30); sk.dot(280, top + 30)
    footer(sk, foot, status, as_of)
    return sk

# ---------------------------------------------------------------- the system running
def running():
    sk = Sketch("Futura running: who talks to whom", "Futura when it runs: people use the web app on Vercel; it keeps data in Postgres on Neon; the browser uploads files straight to Amazon S3, or with the person's own key to the backend canister on the Internet Computer, and signs in with Internet Identity")
    sk.t(750, 46, "Futura running: who talks to whom", "h", "middle")
    # people
    sk.box(30, 300, 230, 196, "line", rx=8)
    sk.t(46, 332, "You, in a browser", "t")
    sk.t(46, 360, "couple, family,", "s"); sk.t(46, 384, "photographer", "s")
    sk.t(46, 418, "phone or laptop", "xs"); sk.t(46, 440, "holds your ICP key", "a"); sk.t(46, 462, "for the session", "a")
    # Vercel and the web app
    sk.box(320, 150, 520, 470, "line", rx=10)
    sk.t(340, 182, "Vercel", "t"); sk.t(820, 182, "online: the version of 1 September 2026", "a", "end")
    sk.box(340, 200, 480, 404, "line")
    sk.t(356, 230, "Futura web app", "t"); sk.t(356, 254, "Next.js: pages and server functions", "s")
    sk.box(356, 272, 448, 86, "thin"); sk.t(372, 300, "Pages", "t"); sk.t(372, 326, "dashboard, galleries, sharing, settings", "s"); sk.t(372, 348, "English, German, Turkish", "xs")
    sk.box(356, 370, 448, 86, "thin"); sk.t(372, 398, "Login (Auth.js)", "t"); sk.t(372, 424, "Google, GitHub, e-mail, Internet Identity", "s"); sk.t(372, 446, "one account can link several", "xs")
    sk.box(356, 468, 448, 128, "thin"); sk.t(372, 494, "Server routes", "t")
    sk.t(372, 518, "/api/upload/s3/presign", "mono"); sk.t(372, 538, "/api/upload/complete", "mono")
    sk.t(372, 558, "/api/ii/challenge", "mono"); sk.t(372, 578, "/api/auth/callback/ii", "mono")
    # outside services
    note_box(sk, 340, 660, 480, "Outside services", ["Mailgun: e-mails. PostHog: visitor counts. OpenAI and Gemini: the AI chat. Google and GitHub: login."])
    sk.arrow(580, 606, 580, 656); sk.dot(580, 612)
    # Web2 side
    sk.box(900, 80, 570, 390, "line", rx=10)
    sk.t(920, 112, "Web2 side", "t"); sk.t(1450, 112, "run by companies, cheap", "s", "end")
    sk.box(920, 132, 530, 156, "line")
    sk.t(936, 162, "Postgres on Neon", "t"); sk.t(1434, 162, "Hetzner possible", "a", "end")
    sk.t(936, 190, "accounts, memories, galleries, shares", "s")
    sk.t(936, 216, "storage edges: where each copy of a memory lives", "s")
    sk.t(936, 242, "Internet Identity nonces: one-time codes", "s")
    sk.t(936, 268, "the app speaks plain Postgres, any server works", "xs")
    sk.box(920, 304, 530, 146, "line")
    sk.t(936, 334, "Amazon S3", "t"); sk.t(1434, 334, "Vercel Blob: the other option", "a", "end")
    sk.t(936, 362, "the files: original, display, thumbnail", "s")
    sk.t(936, 388, "the server only signs short-lived upload links;", "xs")
    sk.t(936, 408, "the files themselves never pass through it", "xs")
    # Web3 side
    sk.box(900, 500, 570, 336, "line", rx=10)
    sk.t(920, 532, "Internet Computer, mainnet", "t"); sk.t(1450, 532, "a public network", "s", "end")
    sk.box(920, 552, 530, 146, "line")
    sk.t(936, 582, "Backend canister", "t"); sk.t(1434, 582, "Futura's program", "a", "end")
    sk.t(936, 608, "izhgj-eiaaa-aaaaj-a2f7q-cai", "mono")
    sk.t(936, 636, "one capsule per person: memories, galleries, files", "s")
    sk.t(936, 662, "written only with the person's own key;", "xs")
    sk.t(936, 682, "files go out only through short-lived signed links", "xs")
    sk.box(920, 714, 530, 104, "line")
    sk.t(936, 744, "Internet Identity", "t"); sk.t(1434, 744, "DFINITY's login", "a", "end")
    sk.t(936, 770, "identity.ic0.app", "mono")
    sk.t(936, 796, "a passkey gives each person a key for this site", "xs")
    # connections
    sk.arrow(262, 360, 336, 360); sk.dot(268, 360); sk.t(288, 348, "https", "xs", "middle")
    sk.arrow(822, 214, 916, 214); sk.dot(828, 214); sk.t(858, 204, "SQL", "mono", "middle")
    sk.route("M145,298 L145,124 L886,124 L886,376 L916,376"); sk.dot(145, 292)
    sk.t(510, 114, "uploads the files itself, with a link the server signed", "a", "middle")
    sk.route("M110,498 L110,850 L878,850 L878,630 L916,630", accent=True); sk.dot(110, 504)
    sk.t(500, 842, "with your own key: capsule, uploads, reads", "a", "middle")
    sk.route("M200,498 L200,826 L862,826 L862,766 L916,766"); sk.dot(200, 504)
    sk.t(500, 818, "passkey sign-in, in a popup", "s", "middle")
    sk.route("M806,540 L856,540 L856,600 L916,600"); sk.dot(812, 540)
    footer(sk, ["The browser opens most connections: to the web app, to S3 with a link the server signed, and to the canister with the person's own key.",
                "The server works with Postgres and, on ICP, only checks who signed a sign-in code: it cannot write into anyone's capsule."],
           "Status: the public demo runs the code of 1 September 2026: November's work is not deployed, on Vercel or on mainnet. Every deployment since 24 November failed.",
           AS_OF_PERSONAL)
    return sk

# ---------------------------------------------------------------- signing in with Internet Identity
def signin_steps():
    return steps_sketch("Signing in with Internet Identity, step by step",
        "Sign-in with Internet Identity: a passkey gives the browser a key; the web app makes a one-time code; the browser registers it on the canister with that key; the server asks the canister who registered it and signs the person in",
        ("THE BROWSER", "where you click", "Your browser", ["on futura's sign-in page", "no password anywhere"], "Sign in with Internet Identity"),
        [("open Internet Identity", "a popup to identity.ic0.app: your passkey (face, finger or security key)", "you, II", "a key for this site in the browser, for the session; it never leaves the browser"),
         ("your capsule", "asks the canister for your capsule; creates one if there is none", "browser, your key", "your capsule on ICP (not waited for)"),
         ("a one-time code", "the web app makes a nonce and keeps it", "/api/ii/challenge", "a nonce row in Postgres: unused, with an expiry"),
         ("register the code", "the browser hands the code to the canister, signed with your key", "register_with_nonce", "the canister knows: this code came from your principal"),
         ("ask to sign in", "the browser sends the principal and the code to Auth.js", "/api/auth/callback/ii", "a sign-in request on the server"),
         ("check on ICP", "the server asks the canister who registered the code: same principal?", "verify_nonce", "the proof; the nonce is marked used"),
         ("signed in", "account found or created, cookie set, back to where you came from", "Auth.js", "you are signed in; your principal is listed on your account")],
        ["Nobody types a password and the server never sees the key: it only asks ICP who signed the one-time code. A signed-in e-mail user links an Internet Identity",
         "the same way, with /api/auth/link-ii in step 4. Tested on a local ICP network: 8 of 8 browser tests (Playwright), 20 November 2026."],
        "Fixed in November 2026: step 4 from the sign-in page sent an empty principal and always failed; linking did not show the principal until the next sign-in.")

# ---------------------------------------------------------------- uploading a memory
def upload_web2_steps():
    return steps_sketch("Uploading a memory to the Web2 side, step by step",
        "Uploading on the Web2 side: the web app signs short-lived S3 links; the browser uploads the original and the smaller versions straight to S3; the web app then records the memory and where its files are in Postgres",
        ("THE BROWSER", "where you click", "Dashboard", ["your setting: Web2", "files go to S3 (default)"], "pick files or a folder"),
        [("ask for upload links", "the web app signs one short-lived S3 link per file version", "/api/upload/s3/presign", "upload links in the browser; nothing stored yet"),
         ("upload the original", "straight from the browser to S3, not through the server", "browser", "the original in S3"),
         ("make smaller versions", "display, thumbnail and placeholder, made in the browser at the same time as step 1", "browser", "display and thumbnail in S3"),
         ("finish", "the web app records the memory once the original is up, and the smaller versions when they are up", "/api/upload/complete", "a memory row, its file rows and its storage edges in Postgres"),
         ("show it", "the dashboard lists the memory; images load from S3", "you", "the memory in your dashboard")],
        ["The server never handles the file bytes: it signs the links and writes the records. Vercel Blob works the same way with its own routes.",
         "Many files at once: the same steps, with batches of links. A folder becomes a folder in Futura."],
        "Not tested in November 2026: uploads need real S3 or Blob credentials, which the local setup does not have.")

def upload_icp_steps():
    return steps_sketch("Uploading a memory to ICP, step by step",
        "Uploading to the Internet Computer: the browser finds or creates the capsule, uploads the original in chunks with the person's own key, creates the memory, adds the smaller versions, and the web app only records that the memory lives on ICP",
        ("THE BROWSER", "where you click", "Dashboard", ["your setting: Web3", "signed in with", "Internet Identity"], "pick files or a folder"),
        [("find your capsule", "capsules_read_basic, or capsules_create if you have none", "browser, your key", "your capsule"),
         ("upload the original in chunks", "uploads_begin, then uploads_put_chunk for each piece, then uploads_finish with the hash", "browser, your key", "the file in the canister's memory, checked against its hash"),
         ("create the memory", "the memory record with the original file", "browser, your key", "the memory in your capsule"),
         ("smaller versions", "display and thumbnail made in the browser, uploaded and added to the memory", "browser, your key", "all versions in the capsule"),
         ("record where it is", "the web app writes storage edges: this memory lives on ICP", "web app", "storage edges in Postgres; no file on the Web2 side")],
        ["Every write in steps 0 to 3 is signed with the person's key: Futura's server could not do them for you. Files come back out only through",
         "short-lived signed links that the canister checks (memories_list hands them out)."],
        "Known: storage on ICP costs roughly 50 times S3 per GB (2026); the canister's November fixes (list paging, inline links) are not on mainnet yet.")

# ---------------------------------------------------------------- the local test setup
def local_running():
    sk = Sketch("The local test setup running, on the studio PC", "The local test setup: in WSL on the studio PC, a Postgres container, a local ICP network with the three canisters, and the web app built for them; Playwright, Vitest, cargo and the shell scripts test them")
    sk.t(750, 46, "The local test setup running, on the studio PC", "h", "middle")
    sk.box(20, 70, 1460, 800, "line", rx=10); sk.t(40, 102, "The studio PC", "t"); sk.t(220, 102, "Windows", "s")
    sk.box(40, 118, 1420, 732, "line", rx=8); sk.t(60, 150, "WSL: Ubuntu 24.04", "t"); sk.t(1440, 150, "everything on 127.0.0.1 only", "a", "end")
    # clients
    y = note_box(sk, 60, 190, 300, "Tests, run by hand", [
        "Playwright with Chromium: 11 browser tests (8 sign-in, 1 personal canister, 2 storage choice)",
        "Vitest: 157 unit and integration tests",
        "cargo test: 277 + 18 canister unit tests, no network; 3 top-up tests on PocketIC",
        "shell scripts (dfx canister call): 23 canister tests"])
    note_box(sk, 60, y + 18, 300, "Not running now", ["Mailgun, S3, Google login: not configured locally; uploads to S3 are untested"], plan=True)
    # the web app
    sk.box(420, 196, 420, 200, "line"); sk.t(440, 228, "Futura web app", "t"); sk.t(820, 228, "next start", "a", "end")
    sk.t(440, 256, "production build, port 3000", "s")
    sk.t(440, 286, "built with NEXT_PUBLIC_DFX_NETWORK=local", "xs"); sk.t(440, 308, "and the local canister ids", "xs")
    sk.t(440, 350, "localhost:3000", "mono"); sk.door(420, 246)
    # postgres
    sk.box(420, 490, 420, 200, "line"); sk.t(440, 522, "Docker: futura-dev-db", "t"); sk.t(820, 522, "postgres:17", "a", "end")
    sk.t(440, 550, "port 5452, data in a volume", "s"); sk.t(440, 580, "schema from pnpm db:push", "xs"); sk.t(440, 602, "test users and memories only", "xs")
    sk.t(440, 644, "127.0.0.1:5452", "mono"); sk.doorh(630, 490)
    # local ICP network
    sk.box(900, 196, 540, 560, "line"); sk.t(920, 228, "Local ICP network", "t"); sk.t(1420, 228, "dfx 0.31 + PocketIC", "a", "end")
    sk.t(920, 256, "port 4943; started with dfx start --clean", "s")
    sk.box(920, 280, 500, 120, "thin"); sk.t(936, 308, "backend", "t"); sk.t(936, 334, "uxrrr-q7777-77774-qaaaq-cai", "mono"); sk.t(936, 362, "the same code as main", "xs"); sk.t(936, 382, "(ahead of mainnet)", "xs")
    sk.box(920, 416, 500, 110, "thin"); sk.t(936, 444, "internet_identity", "t"); sk.t(936, 470, "umunu-kh777-77774-qaaca-cai", "mono"); sk.t(936, 498, "dev build 2026-02-28, captcha off", "xs")
    sk.box(920, 542, 500, 100, "thin"); sk.t(936, 570, "canister_factory", "t"); sk.t(936, 596, "uzt4z-lp777-77774-qaabq-cai", "mono"); sk.t(936, 620, "creates personal canisters and tops them up in the tests", "xs")
    # connections
    sk.arrow(362, 246, 410, 246); sk.dot(368, 246)
    sk.arrow(630, 398, 630, 480); sk.dot(630, 404); sk.t(644, 446, "SQL", "mono")
    sk.arrow(842, 320, 916, 320); sk.dot(848, 320)
    sk.route("M220,188 L220,176 L886,176 L886,470 L916,470", accent=True); sk.dot(220, 182)
    sk.t(560, 168, "the browser in the tests: passkey popup and capsule, with its own key", "a", "middle")
    sk.route("M362,380 L392,380 L392,812 L1450,812 L1450,350 L1424,350"); sk.dot(368, 380)
    sk.t(900, 804, "shell scripts: dfx canister call, straight to the backend", "s", "middle")
    footer(sk, ["How to start it: futura_alpha_icp/README.md (local network, deploy order) and e2e/README.md in the web app (build and Playwright).",
                "The canister ids are always these on a clean network when deployed in the order backend, canister_factory, internet_identity."],
           "Known: dfx 0.32 cannot start the local network here; dfx is deprecated in favour of icp-cli, the move is still to do.", AS_OF_PERSONAL)
    return sk

# ---------------------------------------------------------------- personal canisters

def personal_running():
    title = "Personal canisters running: who controls what"
    sk = Sketch(title, "Personal canisters: Futura's admin releases the backend program in the canister factory; a person asks the factory once for a canister; the factory creates it, installs the program and removes itself; from then on only the owner controls the canister and talks to it with their own key")
    sk.t(750, 46, title, "h", "middle")
    # the owner
    sk.box(30, 130, 270, 210, "line", rx=8)
    sk.t(46, 162, "You, the owner", "t")
    sk.t(46, 190, "in a browser, or a terminal", "s")
    sk.t(46, 216, "holds your own key", "a")
    sk.t(46, 258, "ask the factory once,", "xs"); sk.t(46, 278, "then talk to your canister", "xs"); sk.t(46, 298, "directly", "xs")
    # Futura's admin
    sk.box(30, 430, 270, 130, "line", rx=8)
    sk.t(46, 462, "Futura's admin", "t")
    sk.t(46, 490, "uploads the backend program", "s")
    sk.t(46, 516, "and releases it as a version;", "s")
    sk.t(46, 542, "gives credits: who may create", "s")
    note_box(sk, 30, 600, 270, "Not built", ["payment: who pays the factory for the cycles", "moving a capsule out of the shared canister", "getting a credit without the admin: sign-up or payment"], plan=True)
    # the factory
    sk.box(380, 130, 440, 486, "line", rx=10)
    sk.t(400, 162, "Canister factory", "t"); sk.t(800, 162, "controlled by Futura", "a", "end")
    sk.box(396, 178, 408, 96, "thin"); sk.t(412, 206, "Creating", "t")
    sk.t(412, 232, "create_personal_canister", "mono"); sk.t(412, 258, "creates, installs, hands over", "xs")
    sk.box(396, 286, 408, 114, "thin"); sk.t(412, 314, "The release", "t")
    sk.t(412, 340, "the backend program, gzipped, with a version", "s")
    sk.t(412, 364, "release_info  release_wasm", "mono"); sk.t(412, 388, "anyone may download it and check its sha256", "xs")
    sk.box(396, 412, 408, 90, "thin"); sk.t(412, 440, "Registry", "t")
    sk.t(412, 466, "which canister belongs to which user", "s"); sk.t(412, 488, "Pending, Created, Installed, Ready", "xs")
    sk.box(396, 514, 408, 90, "thin"); sk.t(412, 542, "Cycles", "t")
    sk.t(412, 568, "pays 2T cycles for each new canister", "s"); sk.t(412, 590, "one credit, one canister; then a daily top-up, 3T a month at most", "xs")
    # the web app: a first piece
    sk.box(380, 650, 440, 96, "line", rx=10)
    sk.t(400, 682, "Futura web app", "t"); sk.t(800, 682, "create, see, choose", "a", "end")
    sk.t(400, 710, "create your canister and see it; in the settings choose", "s"); sk.t(400, 734, "it, and uploads, lists and file links go there", "s")
    sk.box(380, 760, 440, 90, "line", plan=True, rx=10)
    sk.t(400, 790, "Not in the web app yet", "t")
    sk.t(400, 816, "upgrading your canister, trustees and heirs,", "xs"); sk.t(400, 836, "moving what is in the shared canister", "xs")
    # the network
    sk.box(900, 130, 570, 720, "line", rx=10)
    sk.t(920, 162, "Internet Computer", "t"); sk.t(1450, 162, "tested on a local network", "s", "end")
    sk.box(920, 200, 530, 250, "line", svc=True)
    sk.t(936, 230, "Your personal canister", "t"); sk.t(1434, 230, "controller: only you", "a", "end")
    sk.t(936, 258, "the same backend program, in personal mode", "s")
    sk.t(936, 284, "owner = you: set at install, no way to change it", "s")
    sk.t(936, 310, "only you can store or change anything in it", "s")
    sk.t(936, 336, "your capsule: memories, galleries, files", "s")
    sk.t(936, 368, "Futura's admin cannot upgrade it or even read its status;", "xs")
    sk.t(936, 388, "updates from anyone else are refused before the canister pays for them", "xs")
    sk.t(936, 416, "starts with about 1.5T cycles; tells the factory what it can still spend", "xs")
    sk.box(920, 480, 530, 160, "line")
    sk.t(936, 510, "Shared backend canister", "t"); sk.t(1434, 510, "controller: Futura", "a", "end")
    sk.t(936, 536, "izhgj-eiaaa-aaaaj-a2f7q-cai", "mono")
    sk.t(936, 564, "the same program, in shared mode:", "s"); sk.t(936, 588, "many users, one capsule each", "s")
    sk.t(936, 616, "today's mainnet canister; everyone is here now", "xs")
    y = note_box(sk, 920, 660, 530, "Who upgrades", ["Futura upgrades the shared canister. You upgrade yours: download the release, check its sha256, install it with your own key."])
    sk.t(936, y + 34, "canister_mode() tells which mode a canister runs in", "xs")
    # connections
    sk.arrow(302, 226, 376, 226); sk.dot(308, 226); sk.t(332, 208, "create", "xs", "middle")
    sk.arrow(302, 320, 376, 320); sk.dot(308, 320); sk.t(332, 302, "download", "xs", "middle")
    sk.route("M165,428 L165,386 L376,386"); sk.dot(165, 422); sk.t(186, 376, "release_set", "mono")
    sk.arrow(822, 226, 916, 226, plan=True); sk.dot(828, 226); sk.t(866, 214, "once", "xs", "middle")
    sk.route("M822,560 L868,560 L868,430 L916,430"); sk.dot(828, 560); sk.t(848, 584, "top-up", "xs")
    sk.route("M165,128 L165,100 L1185,100 L1185,196", accent=True); sk.dot(165, 122)
    sk.t(640, 92, "with your own key: your capsule, and as controller: upgrades and settings", "a", "middle")
    footer(sk, ["The factory is a controller only while it creates the canister and installs the program (dashed arrow). Then it removes itself and has no way in.",
                "The same idea as Juno's satellites: the platform hands the canister over and cannot push code into it. The price: you upgrade it yourself."],
           "Status: built and tested on a local ICP network, 25 November 2026 (shell tests in a terminal, 1 browser test). The factory is not on mainnet.", AS_OF_PERSONAL)
    return sk

def today_to_personal():
    title = "From today to personal canisters"
    sk = Sketch(title, "From today to personal canisters: today everyone on ICP has a capsule in one shared canister that Futura controls; the target is a factory that creates one canister per person and hands it over; the factory, the personal mode and a first card in the web app are built and tested locally; who pays the cycles, moving existing users, the rest of the web app and the mainnet deployment are missing")
    sk.legend = "who starts"
    sk.t(750, 46, title, "h", "middle")
    # today
    sk.box(20, 70, 500, 790, "line", rx=10)
    sk.t(270, 112, "TODAY", "col", "middle"); sk.t(270, 140, "on mainnet, in use", "s", "middle")
    sk.box(40, 170, 460, 80, "line", rx=8)
    sk.t(56, 202, "Everyone who chose Web3", "t"); sk.t(56, 230, "each with their own key", "a")
    sk.arrow(270, 252, 270, 296); sk.dot(270, 258)
    sk.box(40, 300, 460, 290, "line")
    sk.t(56, 332, "Shared backend canister", "t"); sk.t(484, 332, "controller: Futura", "a", "end")
    sk.t(56, 358, "izhgj-eiaaa-aaaaj-a2f7q-cai", "mono")
    for i, (a, b) in enumerate((("Ana's", "capsule"), ("Ben's", "capsule"), ("... one", "per person"))):
        x = 56 + i * 146
        sk.box(x, 380, 136, 70, "thin", plan=(i == 2))
        sk.t(x + 68, 408, a, "s", "middle"); sk.t(x + 68, 432, b, "s", "middle")
    sk.t(56, 484, "one program, many people", "s")
    sk.t(56, 510, "Futura upgrades it and pays its cycles", "s")
    sk.t(56, 542, "as controller, Futura can install new code,", "xs"); sk.t(56, 562, "stop the canister or delete it", "xs")
    note_box(sk, 40, 620, 460, "What it means", ["Simple and cheap: one canister to run.", "Your capsule is written with your key, but the program around it belongs to Futura. You trust Futura not to change it."])
    # the target
    sk.box(580, 70, 900, 790, "line", rx=10)
    sk.t(1030, 112, "THE TARGET", "col", "middle"); sk.t(1030, 140, "solid: built and tested on a local network.  dashed: not built", "s", "middle")
    sk.box(600, 170, 300, 150, "line")
    sk.t(616, 200, "Canister factory", "t"); sk.t(616, 226, "controlled by Futura", "a")
    sk.t(616, 254, "holds the released backend program; for a", "xs"); sk.t(616, 274, "person with a credit it creates a canister,", "xs"); sk.t(616, 294, "installs the program, then removes itself", "xs")
    for i, name in enumerate(("Ana", "Ben", None)):
        y = 170 + i * 52
        sk.box(980, y, 480, 46, "line", svc=True, plan=(name is None))
        if name:
            sk.t(996, y + 30, name + "'s canister", "t"); sk.t(1444, y + 30, "controller: only " + name, "a", "end")
            sk.arrow(902, y + 23, 976, y + 23)
        else:
            sk.t(996, y + 30, "... one per person with a credit from Futura", "s")
    sk.t(940, 186, "once", "xs", "middle")
    sk.dot(908, 193); sk.dot(908, 245)
    # moving existing users: not built
    sk.route("M502,440 L548,440 L548,352 L1220,352 L1220,324", plan=True, accent=True)
    sk.t(760, 344, "moving a capsule with its files: no tool yet", "a", "middle")
    # the web app card
    sk.box(600, 384, 300, 96, "line")
    sk.t(616, 414, "Web app", "t")
    sk.t(616, 440, "create your canister; choose it in the", "xs"); sk.t(616, 460, "settings and new memories go there", "xs")
    note_box(sk, 980, 384, 480, "After the hand-over", ["Only the owner can upgrade, stop or delete the canister, and only the owner can write to it. Futura cannot even read its status."])
    # top-ups: built
    note_box(sk, 600, 512, 420, "Top-ups", ["Once a day the factory asks each canister what it can still spend and refills it: below 1T up to 2T, at most 3T a month per owner."])
    # missing
    note_box(sk, 1040, 512, 420, "Missing: who pays", ["Nobody pays the factory: no payment, no plans. No warning by e-mail or in the app. 3T a month keeps about 3.5 GiB."], plan=True)
    note_box(sk, 600, 640, 420, "Missing: the web app", ["An upgrade button. Pages for trustees and heirs. A warning when cycles run low."], plan=True)
    note_box(sk, 1040, 640, 420, "Missing: mainnet", ["The factory is not deployed there. Credits are given by hand: no sign-up or payment step."], plan=True)
    note_box(sk, 600, 752, 860, "Open decisions", ["Who pays Futura for the cycles. Whether Futura stays a second controller by default, so it can upgrade and help. Whether everyone moves, or only new or paying users get a canister of their own."])
    footer(sk, ["The program is the same on both sides: the backend runs in shared mode today and in personal mode in a canister of your own.",
                "What changes is who controls it. Today that is Futura. In the target it is you alone: nobody upgrades for you, and Futura only adds cycles."],
           "Status: the target is built and tested on a local ICP network only (25 November 2026). On mainnet nothing has changed: everyone is in the shared canister.", AS_OF_PERSONAL)
    return sk

def personal_create_steps():
    return steps_sketch("Creating a personal canister, step by step",
        "Creating a personal canister: the admin releases the backend program in the factory; a signed-in person asks for a canister; the factory creates it with itself and the person as controllers, installs the program with the person as owner, then leaves the person as the only controller",
        ("YOU", "the future owner", "Your key", ["from Internet Identity", "on the web app's ICP page,", "or in a terminal (dfx)"], "ask the factory for a canister"),
        [("release the program", "the gzipped backend program, uploaded in chunks; then release_set with a version name", "Futura's admin", "a release in the factory: version, sha256, the program"),
         ("give a credit", "personal_credit_set for your principal. One credit pays for one canister; admins need none", "Futura's admin", "a credit for you in the factory"),
         ("ask for a canister", "create_personal_canister. Without a credit it is refused and nothing is stored. Anonymous callers are refused", "you", "a registry entry for you: Pending"),
         ("create the canister", "the factory asks the network for a new canister, with 2T cycles and a freezing threshold of 30 days", "factory", "an empty canister; controllers: the factory and you; the credit is used up; registry: Created"),
         ("install the program", "the released program, installed with init(owner = you): that makes it personal", "factory", "your canister runs the backend with you as owner; registry: Installed"),
         ("hand over", "the factory sets the controllers to you alone, and so removes itself", "factory", "you are the only controller; registry: Ready"),
         ("use it", "choose \"My own canister\" in the settings: uploads, lists and file links then go to it", "you", "your capsule in your own canister; nobody else can write there")],
        ["If a step fails, or a call hangs for more than 10 minutes, call create_personal_canister again: the registry remembers the canister and how far it got,",
         "so no second canister is created and no second credit is needed. Once it is Ready, the call just returns the same canister."],
        "Status: tested on a local ICP network, 25 November 2026: all steps in a terminal, steps 2 to 6 also from the web app. Not built: payment, credits without the admin.",
        as_of=AS_OF_PERSONAL)

def personal_upgrade_steps():
    return steps_sketch("Upgrading a personal canister, step by step",
        "Upgrading a personal canister: the owner looks at the release in the factory, downloads it, checks its sha256, and installs it with their own key; the factory is not a controller and cannot do it",
        ("YOU", "the owner", "Your key", ["the only controller", "of your canister"], "decide when to upgrade"),
        [("a new release", "the admin releases a new version of the backend program in the factory", "Futura's admin", "the factory offers the new version"),
         ("look", "release_info: version, sha256, size. Open to anyone", "you", "you know which version is offered, and its sha256"),
         ("download", "release_wasm: the gzipped program, straight from the factory", "you", "the file on your computer"),
         ("check the hash", "compute the sha256 of the file and compare it with release_info", "you", "the file is the release, byte for byte; if not, stop here"),
         ("install", "install in upgrade mode, signed with your key. The network accepts this only from a controller", "you", "your canister runs the new version"),
         ("check", "read a memory; ask canister_mode", "you", "same data, same owner, still personal")],
        ["The factory cannot do step 4: it is not a controller. In the test Futura's admin tried, and the network refused.",
         "The other side: nobody upgrades for you. The hash proves the file is what the factory lists, not that the program is good."],
        "Status: tested on a local ICP network, 25 November 2026, by installing the same release again, in a terminal. The web app only shows that a newer version exists.",
        as_of=AS_OF_PERSONAL)

def top_up_steps():
    return steps_sketch("Topping up a personal canister, step by step",
        "Topping up a personal canister: once a day the factory asks each personal canister what it can still spend; below a floor it deposits cycles up to a target, limited by a monthly cap per owner; depositing needs no rights, so the factory is still not a controller",
        ("THE FACTORY", "once a day", "Canister factory", ["holds Futura's cycles", "not a controller of", "your canister"], "nothing; or ask for a check of your own canister"),
        [("the daily check", "a tick every hour; the check runs when the last one is a day old. The owner can ask for their own canister", "factory", "the list of all finished personal canisters"),
         ("ask the canister", "cycles_liquid_balance: what it can still spend before it freezes. It answers only its owner and its factory", "factory", "the reported balance, kept in the registry"),
         ("decide", "1T or more: nothing. Less: fill up to 2T, but at most 3T per owner in a calendar month", "factory", "enough, an amount to send, or: monthly cap reached"),
         ("deposit", "deposit_cycles on the network. Anybody may put cycles into any canister: no rights needed", "factory", "the cycles in your canister; the month's total in the registry"),
         ("if the canister is frozen", "it cannot answer. That counts as a balance of zero, if it answered at least once before", "factory", "the deposit unfreezes it")],
        ["The canister's code belongs to its owner, who could install a program that always reports a low balance. The factory cannot check the number:",
         "the monthly cap is the limit of that loss. And the factory never spends below its own minimum of cycles."],
        "Status: tested on a local ICP network, 25 November 2026. Timer, change of month and a frozen canister tested with a simulated clock. Not built: who pays the factory, warnings.",
        as_of=AS_OF_PERSONAL)

def inheritance_steps():
    return steps_sketch("Inheritance, step by step",
        "Inheritance: the owner shares a memory with an heir on the condition after death and names trustees; trustees confirm the death; when enough have confirmed, a waiting period runs; then the heir can read what was shared; the owner can cancel at any time",
        ("THE OWNER", "while alive", "Your capsule", ["on ICP, written", "with your own key"], "decide who inherits what"),
        [("share a memory, after death", "an access entry for the heir with the condition: after death. It gives nothing yet", "owner", "the heir is on the memory's list, and reads nothing"),
         ("name trustees", "up to 10 trustees, how many of them must confirm, and how long to wait after that", "owner", "the rules on the capsule; the owner cannot be a trustee"),
         ("trustees confirm the death", "each with their own key. A trustee can take it back during the wait", "trustees", "confirmations, each with its date"),
         ("the waiting period runs", "it starts when enough trustees have confirmed. No timer: the dates are compared on every read", "nobody", "the date when the death takes effect"),
         ("the owner can cancel", "legacy_cancel_death with the owner's key, during the wait or later", "owner", "all confirmations gone; heirs locked out again"),
         ("access opens", "once the waiting period is over, the after-death entries count", "nobody", "the heir may view what was shared with them, nothing else"),
         ("the heir reads", "memories_list_shared and memories_read_shared, with the heir's own key", "heir", "the memory, and of its access list only the heir's own entry")],
        ["A trustee only confirms and gets no access. Someone who is neither owner, trustee nor heir gets \"not found\" and does not even learn that a capsule exists.",
         "Other events (a wedding, a graduation, your own) the owner records and revokes alone. A death can never be recorded that way."],
        "Status: tested on a local ICP network, 25 November 2026, on the shared canister. Not built: a web page for it; file links over HTTP for heirs.",
        as_of=AS_OF_PERSONAL)

if __name__ == "__main__":
    out = os.path.join(HERE, "..", "src")
    os.makedirs(out, exist_ok=True)
    for name, fn in (("futura-running", running), ("signin-ii-steps", signin_steps),
                     ("upload-web2-steps", upload_web2_steps), ("upload-icp-steps", upload_icp_steps),
                     ("local-test-setup-running", local_running),
                     ("today-to-personal", today_to_personal),
                     ("personal-canisters-running", personal_running), ("personal-create-steps", personal_create_steps),
                     ("personal-upgrade-steps", personal_upgrade_steps), ("top-up-steps", top_up_steps),
                     ("inheritance-steps", inheritance_steps)):
        open(os.path.join(out, name + ".html"), "w").write(fn().html())
        print("wrote", name)
