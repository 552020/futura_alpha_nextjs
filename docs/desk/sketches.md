<!-- desk: Architecture -->

# Sketches

All sketches of Futura on one page: the system running, the three flows step by step, and the local test setup. Same hand-drawn style as the Inception-of-Things sketches: a dot marks who opens the connection or starts the step, dashed means written but not running now, and the line at the bottom of each sketch says how true it is today.

All pictures come from `docs/diagrams/tools/gen.py` (run it, then `node docs/diagrams/tools/shots.mjs` for the PNGs).

## The system

<figure>
<img src="/diagrams/futura-running.png" alt="Futura running: who talks to whom">
<figcaption>Futura running: the browser talks to the web app on Vercel, uploads files straight to S3 with a link the server signed, and writes to the backend canister on ICP with the person's own key. The server works with Postgres and only checks sign-ins on ICP.</figcaption>
</figure>

## Signing in with Internet Identity

<figure>
<img src="/diagrams/signin-ii-steps.png" alt="Signing in with Internet Identity, step by step">
<figcaption>A passkey gives the browser a key; the web app makes a one-time code; the browser registers it on the canister; the server asks the canister who registered it. No password anywhere.</figcaption>
</figure>

## Uploading a memory

<figure>
<img src="/diagrams/upload-web2-steps.png" alt="Uploading a memory to the Web2 side, step by step">
<figcaption>Web2 (the default): the server signs upload links, the browser uploads the original and the smaller versions to S3, the server records the memory in Postgres.</figcaption>
</figure>

<figure>
<img src="/diagrams/upload-icp-steps.png" alt="Uploading a memory to ICP, step by step">
<figcaption>Web3: the browser uploads the file in chunks into the person's capsule with their own key; Postgres only learns that the memory lives on ICP.</figcaption>
</figure>

## The local test setup

<figure>
<img src="/diagrams/local-test-setup-running.png" alt="The local test setup running, on the studio PC">
<figcaption>On the studio PC: a Postgres container, a local ICP network with the three canisters, and the web app built for them; Playwright, Vitest, cargo and the shell scripts test them.</figcaption>
</figure>
