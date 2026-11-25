<!-- desk: Architecture -->

# Sketches

All sketches of Futura on one page: the system running, the three flows step by step, the local test setup, and the personal canisters with inheritance. Same hand-drawn style as the Inception-of-Things sketches: a dot marks who opens the connection or starts the step, dashed means written but not running now, and the line at the bottom of each sketch says how true it is today.

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
<figcaption>Web2 (the default): the server signs upload links, the browser uploads the original and the smaller versions to S3, the server records the memory and its files in Postgres.</figcaption>
</figure>

<figure>
<img src="/diagrams/upload-icp-steps.png" alt="Uploading a memory to ICP, step by step">
<figcaption>Web3: the browser uploads the file in chunks into the person's capsule with their own key; Postgres only learns that the memory lives on ICP.</figcaption>
</figure>

## The local test setup

<figure>
<img src="/diagrams/local-test-setup-running.png" alt="The local test setup running, on the studio PC">
<figcaption>On the studio PC: a Postgres container, a local ICP network with the three canisters (backend, Internet Identity, canister factory), and the web app built for them; Playwright, Vitest, cargo and the shell scripts test them.</figcaption>
</figure>

## Personal canisters and inheritance

Built and tested on a local ICP network on 25 November 2026. Not in use on mainnet. The web app can create a personal canister and show it; everything else is done from a terminal. Creation needs a credit from Futura's admin. The explanation: [Personal canisters and inheritance](/desk/personal-canisters).

<figure>
<img src="/diagrams/today-to-personal.png" alt="From today to personal canisters">
<figcaption>From today to the target: today everyone on ICP has a capsule in one shared canister that Futura controls. The target is one canister per person, created by the factory and handed over. Dashed is what is not built: who pays the cycles (with what they cost), moving existing users, most of the web app, the mainnet deployment.</figcaption>
</figure>

<figure>
<img src="/diagrams/personal-canisters-running.png" alt="Personal canisters running: who controls what">
<figcaption>Who controls what: Futura controls the factory and the shared canister. The factory creates your canister, installs the backend program and removes itself. After that only you control it.</figcaption>
</figure>

<figure>
<img src="/diagrams/personal-create-steps.png" alt="Creating a personal canister, step by step">
<figcaption>Creating: Futura's admin gives you a credit; without one the factory refuses. Then the factory creates the canister with itself and you as controllers, installs the program with you as owner, then leaves you as the only controller. A failed creation can be resumed.</figcaption>
</figure>

<figure>
<img src="/diagrams/personal-upgrade-steps.png" alt="Upgrading a personal canister, step by step">
<figcaption>Upgrading: the owner downloads the release from the factory, checks its sha256 and installs it with their own key. The factory cannot, because it is not a controller.</figcaption>
</figure>

<figure>
<img src="/diagrams/inheritance-steps.png" alt="Inheritance, step by step">
<figcaption>Inheritance: trustees confirm a death, a waiting period runs, then heirs can read what was shared with them. The owner can cancel at any time. Trustees get no access.</figcaption>
</figure>
