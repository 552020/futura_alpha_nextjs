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

def footer(sk, lines, accent_line=None):
    y = 898
    for ln in lines:
        sk.t(60, y, ln, "s"); y += 28
    if accent_line:
        sk.t(60, y, accent_line, "a"); y += 28
    sk.t(1480, y - 28, AS_OF, "s", "end")

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

def steps_sketch(title, label, left, steps, foot, status, legend="who starts the step"):
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
    footer(sk, foot, status)
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
    # Vercel and the web app (dashed: the deployment is disabled now)
    sk.box(320, 150, 520, 470, "line", plan=True, rx=10)
    sk.t(340, 182, "Vercel", "t"); sk.t(820, 182, "deployment disabled now", "a", "end")
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
           "Status: the code passes all tests; the Vercel deployment is disabled and mainnet runs the canister without the November 2026 fixes.")
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
         ("finish", "the web app records the memory and where each version lives", "/api/upload/complete", "a memory row and its storage edges in Postgres"),
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
        "Playwright with Chromium: 8 Internet Identity browser tests",
        "Vitest: 144 unit and integration tests",
        "cargo test: 261 + 2 canister unit tests, no network needed",
        "shell scripts (dfx canister call): 19 canister tests"])
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
    sk.box(920, 542, 500, 100, "thin"); sk.t(936, 570, "canister_factory", "t"); sk.t(936, 596, "uzt4z-lp777-77774-qaabq-cai", "mono"); sk.t(936, 620, "deployed, not used", "xs")
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
           "Known: dfx 0.32 cannot start the local network here; dfx is deprecated in favour of icp-cli, the move is still to do.")
    return sk

if __name__ == "__main__":
    out = os.path.join(HERE, "..", "src")
    os.makedirs(out, exist_ok=True)
    for name, fn in (("futura-running", running), ("signin-ii-steps", signin_steps),
                     ("upload-web2-steps", upload_web2_steps), ("upload-icp-steps", upload_icp_steps),
                     ("local-test-setup-running", local_running)):
        open(os.path.join(out, name + ".html"), "w").write(fn().html())
        print("wrote", name)
