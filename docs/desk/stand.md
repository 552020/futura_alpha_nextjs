<!-- desk: Analysis -->

# Futura: where it stands and what it could be

State of 20 November 2026. The rows on the live site, passing memories on and personal canisters, and next steps 1 and 6, were updated on 25 November 2026.

## In short

Futura is a working, well-tested product that nobody is using. The software is far along: login with four methods, galleries, sharing, photographer-to-client delivery, a choice between normal and ICP storage, three languages. What is missing is everything around it: a live site, users, a confirmed market, and the core of the long-term promise (passing memories on after death). The cheapest real next step is the wedding-photographer use, with ICP as an optional extra rather than the foundation.

## The project in numbers

|           |                                                                                         |
| --------- | --------------------------------------------------------------------------------------- |
| Started   | February 2025 (web app), August 2025 (ICP canisters)                                    |
| Commits   | 1,200 web app, 493 canisters                                                            |
| Main work | March 2025, and August to October 2025; quiet since, short revival January 2026 and now |
| Web app   | about 66,000 lines of TypeScript, 40 pages, 56 server routes, 35 database tables        |
| Canisters | about 25,500 lines of Rust, 99 backend functions                                        |
| Funding   | a $5,000 grant in two milestones (landing pages, then an ad test)                       |

## What exists today

- **Login:** Google, GitHub, e-mail and password, Internet Identity; an Internet Identity can be linked to an existing account.
- **Memories:** upload of photos, videos, documents, notes; automatic display and thumbnail versions; folders and a dashboard.
- **Galleries and sharing:** galleries, share links, a client selection flow that notifies the photographer by e-mail.
- **Two kinds of storage:** Web2 (Postgres and Vercel Blob or S3) or Web3 (a personal capsule on ICP), chosen per person.
- **Transcendance AI:** a chat that interviews a person about their life ("a compassionate biographer"). It is a prompt on a general AI model, not yet a digital self built from someone's memories.
- **Quality:** every test suite green, no known vulnerable dependencies, CI green (details on the architecture page).

## What is not there yet

| Gap                 | Today                                                                                                                                                                  | Why it matters                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A live site         | The demo loads again at its Vercel address (25 November 2026; sign-up and uploads not checked there). The domain futura.now is gone                                    | Without an address of its own nobody finds it                              |
| Users               | none recorded                                                                                                                                                          | No feedback, no proof of demand                                            |
| Passing memories on | Built in the canister on 25 November 2026: trustees confirm a death, a waiting period runs, heirs can read. Tested locally. Not on mainnet, and no page in the web app | This is the heart of "digital inheritance"                                 |
| Latest fixes on ICP | Mainnet canister runs the code from before this month's fixes                                                                                                          | Gallery visibility, memory list and links are fixed only in the repository |
| Personal canisters  | Built and tested locally on 25 November 2026; the web app can create one. Not on mainnet. Open: who pays the running costs, and moving existing users                  | The strongest form of "you own your data"                                  |
| Business setup      | Photographer-client relation must be set up by hand in the database                                                                                                    | Blocks the photographer use without manual work                            |

## What the market test said

In December 2025 four Instagram ads ran for about €10 each, one per story:

| Story                                  | Format      | Views | Site visits | Cost per visit | Visit rate |
| -------------------------------------- | ----------- | ----- | ----------- | -------------- | ---------- |
| Transcendance (talk to your ancestors) | video       | 1,879 | 32          | €0.33          | 1.7%       |
| Wedding                                | video       | 2,166 | 45          | €0.24          | 2.1%       |
| Family                                 | video       | 3,331 | 38          | €0.28          | 1.1%       |
| Kiss (warm photo)                      | still image | 2,404 | 68          | €0.15          | 2.8%       |

On the site, 97% of visitors left after one page (227 sessions). There is no record of sign-ups. So: weddings and warm emotional images draw the most interest, the AI "talk to your ancestors" story the least per euro, and the landing pages did not turn interest into action. €40 is too small a test to rule anything out, but it is the only data there is.

## What it could be

Three directions, from smallest step to biggest.

**1. Wedding delivery with a "forever" option (recommended first).** The photographer delivers the wedding gallery through Futura; the couple selects, downloads and owns it; keeping it "forever" is an upsell. Almost everything exists, including the selection flow, and there is a partner (Salih Kurbet Films). Missing: a live site, onboarding for photographers without database work, a price.

**2. Family archive with inheritance.** Families keep memories and decide who gets what, when: after a death, on a birthday, at a wedding. The data model already has these conditions; the logic, a way to confirm a death, and the legal side are missing. Bigger step, stronger long-term story, slower to prove.

**3. Transcendance: a digital self.** An AI built from a person's memories that descendants can talk to. It fits where money and attention are in 2026, but it is the hardest to build well, ethically delicate, and it did worst in the ad test.

## Is ICP the right foundation?

Keep it, but not as the foundation. The analysis page on ICP and blockchain has the details. The short version: ICP is alive but shrinking and pivoting to an AI cloud, storage there costs roughly 50 times Amazon S3, and its prices are set to rise. Futura already treats ICP as one storage choice among others and keeps the Web2 side complete, which is the right shape: ICP as the "proof of ownership and inheritance" layer, cheap cloud storage for the files, and an export so nobody depends on a single network.

## Next steps

1. Give the site an address: the demo loads again on Vercel; check sign-up and uploads there and point a domain at it.
2. Deploy the canister fixes from November 2026 to mainnet.
3. Let a photographer set up client deliveries without database work, then run one real wedding through it.
4. Decide the price and what "forever" means in writing (who pays the storage after 10 years).
5. Move the ICP tooling from dfx to icp-cli (dfx is deprecated) before it breaks.
6. Inheritance and personal canisters are built in the canisters (see [Personal canisters and inheritance](/desk/personal-canisters)). Only then: bring them to mainnet and into the web app.
