<!-- desk: Architecture -->

# Personal canisters and inheritance

For readers who know the web but not the Internet Computer (ICP). State of 25 November 2026. Everything here was built and tested on a local ICP network. None of it is in use on mainnet. The web app has a first piece: a card on the ICP page where a signed-in person creates their personal canister and sees that it is theirs. Everything else is done from a terminal so far. Creation is closed by default: the factory creates a canister only for someone Futura's admin gave a credit. The factory also keeps the canisters alive: once a day it tops up their cycles, within a monthly cap.

A word first: a **canister** is a program on ICP together with its data. A **controller** is a key that may install new code into a canister, stop it or delete it. **Cycles** are what a canister pays for computing and storage; a canister without cycles stops and is later deleted.

## The idea in one paragraph

Today every Futura user on ICP has a capsule inside one shared canister that Futura controls. A personal canister gives one person a canister of their own. A small program called the canister factory creates it, installs Futura's backend program in it with that person as owner, and then removes itself from the list of controllers. From that moment the person is the only controller: Futura cannot change the code, stop the canister or read its status. It is the same backend program as in the shared canister, started in "personal mode", where only the owner can store or change anything. The model is Juno, a platform that hands each developer their own canister in the same way.

<figure>
<img src="/diagrams/today-to-personal.png" alt="From today to personal canisters">
<figcaption>Today and the target side by side. Solid: built and tested on a local network. Dashed: not built, which is who pays the cycles, moving existing users, most of the web app, and the mainnet deployment.</figcaption>
</figure>

<figure>
<img src="/diagrams/personal-canisters-running.png" alt="Personal canisters running: who controls what">
<figcaption>Who controls what: Futura's admin releases the backend program in the factory. You ask the factory once. It creates your canister, installs the program and removes itself (dashed arrow). After that you talk to your canister directly, with your own key.</figcaption>
</figure>

## Juno and Futura side by side

Juno calls its factory the "console" and the canister it hands over a "satellite". Juno has been in maintenance mode since May 2026, so it is a design reference here, not something Futura depends on.

| Question                         | Juno                                                                                         | Futura, shared canister (mainnet today) | Futura, personal canister (built, local only)                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who controls the canister        | The user only. The console removes itself after the first install                            | Futura                                  | The user only. The factory removes itself after the first install                                                                                         |
| Who pays to create it            | The console pays from its own cycles; the user pays Juno 3T cycles, or uses a free credit    | Futura                                  | The factory pays 2T cycles: 0.5T is the network's creation fee, about 1.5T is the canister's starting balance. The user pays nothing; no payment is built |
| Who pays to keep it running      | The user: tops up by hand, or runs an own monitor that does it. An empty canister is deleted | Futura                                  | The factory, from Futura's cycles: a daily top-up, at most 3T a month per owner. Nobody pays the factory yet                                              |
| Who upgrades                     | The user pulls the release, checks its hash, installs it with their own key                  | Futura                                  | The user pulls the release from the factory, checks its sha256, installs it with their own key                                                            |
| Can the platform push code       | No: it is not a controller                                                                   | Yes                                     | No: it is not a controller                                                                                                                                |
| How many people use one canister | Many: a satellite is one app with many end users                                             | Many: one capsule per person            | One owner. People the owner gave access can read their share                                                                                              |
| Who may ask for a canister       | Signed-in accounts with a credit or a payment; one free credit per account by default        | Not applicable                          | Only a principal that Futura's admin gave a credit. No free credits, no rate limit                                                                        |

## Who may create one

Creation is closed by default. Each new canister costs the factory real cycles, so the factory creates one only for a principal that holds a **credit**.

- Futura's admin gives a credit with `personal_credit_set(principal, n)`. One credit pays for one canister. It is used up at the moment the canister exists, so finishing a creation that stopped half-way needs no second credit.
- Admins of the factory need no credit.
- A call without a credit is refused with "no credit", and nothing is stored in the registry. Strangers cannot fill it with empty entries.
- A person can ask how many credits they hold: `my_personal_credits`.
- `personal_open_set(true)` opens creation to every signed-in principal. That is meant for local test networks only; the browser test needs it.

This is Juno's lesson. Juno gave every new account one free credit and had a rate limit; in April 2026 someone made 60 to 70 identities to collect free canisters, and the rate limit did not stop it. What stopped it was "no credit unless we gave you one".

What is missing: a way to get a credit without the admin typing a command, for example at sign-up or after a payment. The card in the web app checks for a credit: without one it shows no button, but a text saying that personal canisters are by invitation, with the person's principal to pass on.

## What it costs

Cycles are bought at a fixed rate: 1T (a trillion) cycles costs about 1.37 US dollars. The prices below are the network's list prices for a standard subnet, read on 25 November 2026. Nothing here was measured on a running canister.

| Item                        | Cycles      | US dollars |
| --------------------------- | ----------- | ---------- |
| Creating a canister, once   | 0.5T        | 0.68       |
| An empty canister, per year | about 0.4T  | about 0.50 |
| Storing 1 GiB, per year     | about 10T   | about 14   |
| Uploading 1 GiB, once       | about 2.15T | about 2.90 |

What follows for a personal canister:

- **The start is small.** The factory pays 2T. After the creation fee about 1.5T is left. Uploading costs 2.15T per GiB, so without a refill the cycles alone would be gone at roughly 0.7 GiB uploaded, and because of the deposit below the canister would stop at roughly 0.5 GiB.
- **The factory tops it up, within a cap.** See [Keeping it alive](#keeping-it-alive-top-ups). The cap is 3T a month per owner, about 4 dollars, so at most about 49 dollars a year. That is what Futura spends on one person; nobody pays Futura for it yet.
- **What 3T a month can carry.** Storing 1 GiB costs about 0.83T a month, so 3T pays the storage of about 3.5 GiB when nothing new comes in. Uploading 1 GiB costs 2.15T and locks another 0.8T as deposit, so 3T pays for about 1 GiB of new uploads in a month into an empty canister, and less as it fills. Between two daily checks a canister has at most 2T to spend: about 0.7 GiB of uploads in one day, then it waits for the next check.
- **Without cycles it freezes before it is deleted.** A canister whose cycles would last less than its freezing threshold stops answering and keeps its data. Only when the cycles are gone does the network delete code and data. New personal canisters get a threshold of 30 days, the network's default, set explicitly. That gives a month to notice.
- **The threshold is a deposit.** The cycles for those 30 days cannot be spent. For 1 GiB that is about 0.8T. So a new canister with 1.5T freezes when 1.5T minus 2.15T per GiB uploaded falls to 0.8T per GiB stored: at roughly 0.5 GiB. A threshold of 90 days was tried first: it reserves about 2.5T per GiB and would have frozen the canister at roughly 0.3 GiB. A longer threshold only makes sense together with more starting cycles and top-ups. All of this, and the two points above, is arithmetic from the price list, not a test.
- **Compared with cloud storage:** Amazon S3 costs about 0.28 dollars per GiB per year, roughly a fiftieth.

## Keeping it alive: top-ups

After the hand-over the factory is not a controller, so it cannot ask the network how many cycles a personal canister has. Two things still work without any rights: the canister can tell the factory, and anybody may deposit cycles into any canister.

<figure>
<img src="/diagrams/top-up-steps.png" alt="Topping up a personal canister, step by step">
<figcaption>Topping up: once a day the factory asks each canister what it can still spend. Below 1T it fills up to 2T, at most 3T per owner in a calendar month. Depositing needs no rights.</figcaption>
</figure>

- **The canister reports, to two parties only.** A personal canister remembers which factory installed it. It tells its owner and that factory how many cycles it can still spend before it freezes. Nobody else can read the number.
- **Once a day, and on request.** The factory checks every finished canister once a day. An owner can ask for a check of their own canister, an admin for anyone's.
- **Floor, target, cap.** Below 1T spendable the factory fills up to 2T. It sends at most 3T per owner in a calendar month; an admin can set another cap for one owner. The factory never spends below its own minimum.
- **A frozen canister is refilled too.** It cannot answer; that counts as a balance of zero, provided it answered at least once before. The deposit unfreezes it.
- **The number is not trusted beyond the cap.** The canister's code belongs to its owner, who could install a program that always reports a low balance. The factory cannot check it. Such a canister gets its monthly cap and no more: that is the limit of the loss.

Shown by the test on a local network: a fresh canister gets nothing, a deposit arrives when the floor is set above its balance, the cap stops the second check, an admin raises the cap, strangers are refused. Not tested yet: the daily timer and the change of month, which need a simulated clock.

Canisters created before 25 November 2026 have no factory stored and cannot report to it.

## Creating one

<figure>
<img src="/diagrams/personal-create-steps.png" alt="Creating a personal canister, step by step">
<figcaption>Creating: the admin releases the program and gives you a credit, you ask, the factory creates the canister with itself and you as controllers, installs the program with you as owner, then leaves you as the only controller.</figcaption>
</figure>

Four details matter:

- **No credit, no canister.** See [Who may create one](#who-may-create-one).

- **The owner is fixed at install.** The factory passes `owner = you` when it installs the program. The owner is kept in the canister's permanent memory and survives upgrades. No endpoint changes it.
- **A failed creation can be resumed.** The factory's registry remembers the canister and the last finished step (Pending, Created, Installed, Ready). Calling `create_personal_canister` again continues from there. No second canister is created and no cycles are spent twice. A call that hangs (for example because the factory was upgraded in between) blocks a new attempt for 10 minutes, then it can be resumed too.
- **The factory keeps no door open.** In the test, the factory's admin could not even read the status of the finished canister. The network only answers controllers.

In the web app this is one button. The card "Your personal canister" on the ICP page (`/user/icp`) calls the factory with the person's Internet Identity key, then asks the new canister itself whose it is and shows "Only you". If a creation stopped half-way, the card shows the step and a "Continue" button. The card appears only when the app is built with the factory's canister id (`NEXT_PUBLIC_CANISTER_ID_FACTORY`); without a factory there is nothing to show. A browser test creates a canister this way and passes.

## Upgrading one

<figure>
<img src="/diagrams/personal-upgrade-steps.png" alt="Upgrading a personal canister, step by step">
<figcaption>Upgrading: you look at the release in the factory, download it, check its sha256 and install it with your own key. The factory cannot do it, because it is not a controller.</figcaption>
</figure>

Upgrades are pulled, never pushed. This is the price of real ownership: nobody upgrades for you. The hash check proves that the downloaded file is the file the factory lists. It does not prove that the program is good. For that, the source code and a repeatable build would have to be public, which is not set up.

The test upgraded a personal canister by installing the same release a second time. The stored memory, the mode and the owner were unchanged afterwards. An upgrade from one version to a newer one has not been tested on a personal canister. The web app does not upgrade: its card only says when the factory offers a different release than the one it installed.

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
- **The waiting period protects the living.** It starts when enough trustees have confirmed. During the wait a trustee can take a confirmation back; if that leaves too few confirmations, the wait stops and starts again from zero when enough have confirmed. The owner can cancel with their own key, during the wait or after it; then all confirmations are dropped and heirs are locked out again. A capsule whose settings were never touched has a waiting period of 30 days, but also no trustees, so nobody can start anything. When the owner names trustees, the owner also sets the waiting period. Offering 30 days as the default there is a job for the web app.
- **Nothing runs on a timer.** The canister stores the dates and compares them each time someone asks for access.
- **A trustee gets no access.** A trustee can confirm and nothing more. An heir sees only the memories shared with them, and of each memory's access list only their own entry (and a public entry, if the memory has one).
- **Strangers learn nothing.** Someone who is neither owner, trustee nor heir gets "not found" on every call, so nobody can test whether a capsule exists.
- **Other events.** The owner can also tie access to a wedding, a graduation or an event of their own, and records or revokes those alone. A death cannot be recorded that way.

## Built and not built

| Piece                                                                                         | State                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Factory: release, create, hand over, registry, resume after a failure                         | Built. Tested on a local network on 25 November 2026 (resume, also of a call stuck for more than 10 minutes, is in the code and its unit tests, not in the network test)                                                                                                                                               |
| Factory: creation only with a credit from the admin                                           | Built and tested the same day: refused without a credit, nothing stored, credit used up after creation                                                                                                                                                                                                                 |
| Backend in personal mode: only the owner may write                                            | Built and tested. Every update call from someone else is refused before the canister pays for it. Three exceptions: a trustee confirming a death or taking that back, and the sign-in handshake. Reading what the owner shared stays possible                                                                          |
| Backend hardening, both modes                                                                 | Seven debug and wipe endpoints removed. Deleting a file or clearing a capsule needs write access to that capsule. Only the person who began an upload can continue or finish it. "The first caller becomes admin" is gone. An upgrade that cannot read the old data stops and is rolled back instead of starting empty |
| Upgrade by the owner: download, check sha256, install                                         | Built and tested from a terminal, with the same release                                                                                                                                                                                                                                                                |
| Inheritance: trustees, waiting period, cancel, heirs read                                     | Built and tested on the shared canister. The test on the network used a waiting period of 0 seconds; a wait of 7 days is covered by the unit tests, with a simulated clock                                                                                                                                             |
| Fix for files lost on upgrade                                                                 | Fixed 25 November 2026. Mainnet not yet upgraded                                                                                                                                                                                                                                                                       |
| Web app: creating a personal canister and seeing it                                           | Built: a card on the ICP page. One browser test on a local network                                                                                                                                                                                                                                                     |
| Web app: storing memories in the personal canister, upgrading it, trustees, heirs             | Not built. Uploads still go to the shared canister                                                                                                                                                                                                                                                                     |
| Factory on mainnet                                                                            | Not deployed                                                                                                                                                                                                                                                                                                           |
| Cycles top-ups: the canister reports, the factory refills daily within a monthly cap          | Built. Tested on a local network on 25 November 2026. The daily timer and the change of month are not tested yet                                                                                                                                                                                                       |
| A warning before a canister runs dry, by e-mail or in the web app; the balance in the web app | Not built                                                                                                                                                                                                                                                                                                              |
| Payment: who pays the factory for the cycles; plans or a quota                                | Not built                                                                                                                                                                                                                                                                                                              |
| Getting a credit without the admin: at sign-up or after payment                               | Not built                                                                                                                                                                                                                                                                                                              |
| Moving an existing capsule from the shared canister into a personal one                       | Not built                                                                                                                                                                                                                                                                                                              |
| File links over HTTP for heirs (today heirs read through canister calls only)                 | Not built                                                                                                                                                                                                                                                                                                              |

Where the code is, in `futura_alpha_icp`: `src/canister_factory/src/personal.rs` (factory), `src/canister_factory/src/top_up.rs` (top-ups), `src/backend/src/personal.rs` (mode), `src/backend/src/legacy.rs` (inheritance), `src/backend/src/upgrade.rs` (the upgrade fix). The exact flows are the test scripts `tests/backend/personal/test_personal_canister.sh`, `tests/backend/personal/test_top_up.sh` and `tests/backend/legacy/test_legacy_inheritance.sh`. In the web app (`futura_alpha_nextjs`): `src/components/icp/personal-canister-card.tsx` and the browser test `e2e/personal-canister.spec.ts`.

## Open decisions

**1. Who pays for cycles.** The mechanism exists: the factory refills each canister from its own cycles, up to 3T a month per owner. What is missing is the money behind it. Nobody pays the factory, and there is no plan or quota. At about 14 dollars per GiB per year plus 3 dollars per GiB uploaded, a paid plan would have to charge roughly 1.50 euros per GiB per month to cover storage alone. Juno does it the other way: the user prepays and runs their own monitor, which does not fit couples and families. The numbers are in [What it costs](#what-it-costs).

**2. Sole owner, or Futura as co-controller by default.** What is built is the strict version: the user is the only controller. That is the strongest promise, and the hardest to live with. A person who never upgrades stays on old code, and a person who loses their key loses the canister. The other option is to keep Futura as a second controller by default, so Futura can upgrade and help, with a switch "take full ownership" that removes Futura. That would be "your own canister", not "Futura cannot touch it", until the switch is used. It needs a change in the factory's hand-over step.

**3. Moving existing users.** Everyone on ICP today is in the shared canister. Three choices: keep the shared canister as the home for free users and offer a personal canister as a paid step up; move everyone; or give personal canisters to new users only. Each choice except the last needs a tool that moves a capsule with its files from the shared canister into a personal one. That tool does not exist.
