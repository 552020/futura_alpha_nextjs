<!-- desk: Architecture -->

# Personal canisters and inheritance

For readers who know the web but not the Internet Computer (ICP). State of 25 November 2026. Everything here was built and tested on a local ICP network. None of it is in use on mainnet, and the web app does not use it yet.

A word first: a **canister** is a program on ICP together with its data. A **controller** is a key that may install new code into a canister, stop it or delete it. **Cycles** are what a canister pays for computing and storage; a canister without cycles stops and is later deleted.

## The idea in one paragraph

Today every Futura user on ICP has a capsule inside one shared canister that Futura controls. A personal canister gives one person a canister of their own. A small program called the canister factory creates it, installs Futura's backend program in it with that person as owner, and then removes itself from the list of controllers. From that moment the person is the only controller: Futura cannot change the code, stop the canister or read its status. It is the same backend program as in the shared canister, started in "personal mode", where only the owner can create a capsule and store data. The model is Juno, a platform that hands each developer their own canister in the same way.

<figure>
<img src="/diagrams/personal-canisters-running.png" alt="Personal canisters running: who controls what">
<figcaption>Who controls what: Futura's admin releases the backend program in the factory. You ask the factory once. It creates your canister, installs the program and removes itself (dashed arrow). After that you talk to your canister directly, with your own key.</figcaption>
</figure>

## Juno and Futura side by side

Juno calls its factory the "console" and the canister it hands over a "satellite". Juno has been in maintenance mode since May 2026, so it is a design reference here, not something Futura depends on.

| Question                         | Juno                                                                                         | Futura, shared canister (mainnet today) | Futura, personal canister (built, local only)                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Who controls the canister        | The user only. The console removes itself after the first install                            | Futura                                  | The user only. The factory removes itself after the first install                                          |
| Who pays to create it            | The console pays from its own cycles; the user pays Juno 3T cycles, or uses a free credit    | Futura                                  | The factory pays 2T cycles. The user pays nothing; no payment is built                                     |
| Who pays to keep it running      | The user: tops up by hand, or runs an own monitor that does it. An empty canister is deleted | Futura                                  | Nobody yet. Top-ups are not built. An empty canister would stop                                            |
| Who upgrades                     | The user pulls the release, checks its hash, installs it with their own key                  | Futura                                  | The user pulls the release from the factory, checks its sha256, installs it with their own key             |
| Can the platform push code       | No: it is not a controller                                                                   | Yes                                     | No: it is not a controller                                                                                 |
| How many people use one canister | Many: a satellite is one app with many end users                                             | Many: one capsule per person            | One owner. People the owner gave access can read their share                                               |
| Who may ask for a canister       | Signed-in accounts, with a rate limit and payment                                            | Not applicable                          | Any signed-in principal. An allow-list exists in the factory but is off by default; there is no rate limit |

## Creating one

<figure>
<img src="/diagrams/personal-create-steps.png" alt="Creating a personal canister, step by step">
<figcaption>Creating: the admin releases the program, you ask, the factory creates the canister with itself and you as controllers, installs the program with you as owner, then leaves you as the only controller.</figcaption>
</figure>

Three details matter:

- **The owner is fixed at install.** The factory passes `owner = you` when it installs the program. The owner is kept in the canister's permanent memory and survives upgrades. No endpoint changes it.
- **A failed creation can be resumed.** The factory's registry remembers the canister and the last finished step (Pending, Created, Installed, Ready). Calling `create_personal_canister` again continues from there. No second canister is created and no cycles are spent twice.
- **The factory keeps no door open.** In the test, the factory's admin could not even read the status of the finished canister. The network only answers controllers.

## Upgrading one

<figure>
<img src="/diagrams/personal-upgrade-steps.png" alt="Upgrading a personal canister, step by step">
<figcaption>Upgrading: you look at the release in the factory, download it, check its sha256 and install it with your own key. The factory cannot do it, because it is not a controller.</figcaption>
</figure>

Upgrades are pulled, never pushed. This is the price of real ownership: nobody upgrades for you. The hash check proves that the downloaded file is the file the factory lists. It does not prove that the program is good. For that, the source code and a repeatable build would have to be public, which is not set up.

The test upgraded a personal canister by installing the same release a second time. The stored memory, the mode and the owner were unchanged afterwards. An upgrade from one version to a newer one has not been tested on a personal canister.

### A warning about upgrades and the mainnet canister

Older versions of the backend lost uploaded files on every upgrade. Before each upgrade they wrote a snapshot to the start of the canister's permanent memory, on top of the index that the file store needs. Capsules came back from the snapshot. Files in the file store, running uploads and everything else in permanent memory did not.

This was fixed on 25 November 2026. Mainnet has not been upgraded yet and still runs the old code. **Mainnet must not be upgraded with any older version.** Its next upgrade must be to the fixed version or a later one. The fixed version can upgrade from the old one: it finds the old snapshot and restores capsules from it one last time. Files that were lost in an earlier upgrade cannot be recovered.

Personal canisters start with a release built after the fix, so they do not have this problem.

## Inheritance

Inheritance is separate from personal canisters. It lives in the backend program and works in both modes. It was tested on the shared canister.

<figure>
<img src="/diagrams/inheritance-steps.png" alt="Inheritance, step by step">
<figcaption>Inheritance: the owner shares a memory "after death" and names trustees. Trustees confirm the death. When enough have confirmed, a waiting period runs. Then the heir can read what was shared. The owner can cancel at any time.</figcaption>
</figure>

- **A death is never recorded by one click.** The owner names up to 10 trustees, says how many must confirm, and sets a waiting period. The owner cannot be their own trustee.
- **The waiting period protects the living.** It starts when enough trustees have confirmed. During the wait a trustee can take a confirmation back. The owner can cancel with their own key, during the wait or after it; then all confirmations are dropped and heirs are locked out again. A capsule whose settings were never touched has a waiting period of 30 days, but also no trustees, so nobody can start anything. When the owner names trustees, the owner also sets the waiting period. Offering 30 days as the default there is a job for the web app.
- **Nothing runs on a timer.** The canister stores the dates and compares them each time someone asks for access.
- **A trustee gets no access.** A trustee can confirm and nothing more. An heir sees only the memories shared with them, and of each memory's access list only their own entry.
- **Strangers learn nothing.** Every refused call answers "not found", so nobody can test whether a capsule exists.
- **Other events.** The owner can also tie access to a wedding, a graduation or an event of their own, and records or revokes those alone. A death cannot be recorded that way.

## Built and not built

| Piece                                                                         | State                                                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Factory: release, create, hand over, registry, resume after a failure         | Built. Tested on a local network on 25 November 2026 (resume is in the code, not in the test) |
| Backend in personal mode: only the owner can create a capsule                 | Built and tested. Other write endpoints were not reviewed for personal mode                   |
| Upgrade by the owner: download, check sha256, install                         | Built and tested from a terminal, with the same release                                       |
| Inheritance: trustees, waiting period, cancel, heirs read                     | Built and tested on the shared canister. The test used a waiting period of 0 seconds          |
| Fix for files lost on upgrade                                                 | Fixed 25 November 2026. Mainnet not yet upgraded                                              |
| Web app: pages for creating, upgrading, trustees, heirs                       | Not built. The web app uses none of this yet                                                  |
| Cycles top-ups and a monitor that warns before a canister runs dry            | Not built                                                                                     |
| Payment                                                                       | Not built                                                                                     |
| A limit on who may ask for a canister                                         | Not built. Each request costs the factory 2T cycles                                           |
| Moving an existing capsule from the shared canister into a personal one       | Not built                                                                                     |
| File links over HTTP for heirs (today heirs read through canister calls only) | Not built                                                                                     |

Where the code is, in `futura_alpha_icp`: `src/canister_factory/src/personal.rs` (factory), `src/backend/src/personal.rs` (mode), `src/backend/src/legacy.rs` (inheritance), `src/backend/src/upgrade.rs` (the upgrade fix). The exact flows are the test scripts `tests/backend/personal/test_personal_canister.sh` and `tests/backend/legacy/test_legacy_inheritance.sh`.

## Open decisions

**1. Who pays for cycles.** Juno lets the user prepay and deletes nothing itself, but an empty canister is deleted by the network, data included. For a vault of family memories that is not acceptable. The alternative: Futura pays the cycles out of a paid plan and runs one central monitor. That needs payment and top-ups, and neither exists.

**2. Sole owner, or Futura as co-controller by default.** What is built is the strict version: the user is the only controller. That is the strongest promise, and the hardest to live with. A person who never upgrades stays on old code, and a person who loses their key loses the canister. The other option is to keep Futura as a second controller by default, so Futura can upgrade and help, with a switch "take full ownership" that removes Futura. That would be "your own canister", not "Futura cannot touch it", until the switch is used. It needs a change in the factory's hand-over step.

**3. Moving existing users.** Everyone on ICP today is in the shared canister. Three choices: keep the shared canister as the home for free users and offer a personal canister as a paid step up; move everyone; or give personal canisters to new users only. Each choice except the last needs a tool that moves a capsule with its files from the shared canister into a personal one. That tool does not exist.
