<!-- desk: Analysis -->

# ICP and blockchain in November 2026: alive, or eaten by AI?

State of 20 November 2026. Every figure has its source and date; where only a search summary was seen, that is marked.

## In short

ICP is not dead, but it is fading and changing shape: the token is about 99.6% below its 2021 peak, the number of canisters barely moved in three months, and DFINITY is turning ICP into an AI cloud. Blockchain as a whole is in a bear market, but its useful core (stablecoins, tokenized assets) keeps growing and is getting proper law. "Eaten by AI" is true for venture money, attention and newcomers; it is not true for crypto's money-moving core. For Futura: ICP is fine as an optional layer, not as the only home of anyone's photos.

## ICP

| What        | Figure                                                                                                                                                 | Source                                                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Token price | about $2.1 to $2.9 in November 2026; market value about $1.6 billion; about 99.6% below the 2021 peak                                                  | [Global Banking & Finance, 15 Nov 2026](https://www.globalbankingandfinance.com/internet-computer-falls-9-29-percent-icp-2026-11-15/), [cryptonews.net, Nov 2026](https://cryptonews.net/news/analytics/33735489/) |
| Canisters   | about 1.28 million, up only 1.1% since late August                                                                                                     | [ICP dashboard, Nov 2026](https://dashboard.internetcomputer.org/) (search summary)                                                                                                                                |
| Activity    | about 4,600 messages per second across 42 subnets in October                                                                                           | [DFINITY forum, Oct 2026](https://forum.dfinity.org/t/dashboard-cycle-burn-rate-dropped-58-in-one-step-on-10-oct-every-subnet-computation-unchanged-metric-change-or-protocol-change/76046)                        |
| Developers  | 187 full-time ICP developers against 3,699 on Ethereum (Electric Capital figures; date of the underlying data unclear)                                 | [CoinStats, Nov 2026](https://coinstats.app/ai/a/investment-analysis-internet-computer)                                                                                                                            |
| Token plan  | "Mission 70": cut new ICP by 70% by end of 2026; needs about 15 times more usage to work; proposes up to 5 times higher prices for compute and storage | [Mission 70 white paper, Feb 2026](https://internetcomputer.org/whitepapers/mission70.pdf), [cryptonews.net, Feb 2026](https://cryptonews.net/news/altcoins/32390830/)                                             |

**What DFINITY is doing.** It builds an AI cloud on ICP: Caffeine, an AI app builder launched in 2025 (some users call the results "early prototypes", [forum, Apr 2026](https://forum.dfinity.org/t/caffeine-does-not-work-the-way-i-expected-it-to/67359)), and "Cloud Engines", private subnets for companies and governments, sold since mid-November 2026, with 20% of revenue used to buy and burn ICP ([Crypto Briefing, 2026](https://cryptobriefing.com/dfinity-cloud-engines-sovereign-cloud-icp/)). There are no public customer numbers yet.

**What it means for Futura's code.** The `dfx` tool is deprecated in favour of `icp-cli` ([migration guide](https://cli.internetcomputer.org/1.8/migration/from-dfx/)); Futura still uses dfx, pinned to 0.31.0 because 0.32.0 does not start a local network on our machine. Internet Identity 2.0 now uses passkeys without an identity number and offers "Sign in with Google" ([DFINITY support, Aug 2025](https://identitysupport.dfinity.org/hc/en-us/articles/39593373981588-Internet-Identity-2-0)).

**Verdict on ICP:** alive, shipping, but smaller every quarter and betting its future on the AI pivot. No public sign yet that the pivot brings real usage.

## Blockchain in general

| What                 | Figure                                                                                                           | Source                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bitcoin              | about $61,000 to $65,000 on 20 Nov 2026, about half its $126,000 peak of October 2025                            | [Investing News, 20 Nov 2026](https://investingnews.com/cryptocurrency-market-recap/)                                                                 |
| Bitcoin funds (ETFs) | US spot funds lost $515 million in October 2026, the first monthly outflow since June                            | [CryptoRank, Nov 2026](https://cryptorank.io/news/feed/dc09e-bitcoin-price-prediction-november-2026-can-btc-reclaim-80225-as-etf-flows-turn-negative) |
| Stablecoins          | about $289 billion, down from $310 billion in May                                                                | [Crypto Briefing, 9 Nov 2026](https://cryptobriefing.com/stablecoin-market-cap-drops-21b-since-may/)                                                  |
| Stablecoin law (US)  | GENIUS Act signed July 2025, takes effect 18 January 2027                                                        | [US Treasury, 2026](https://home.treasury.gov/news/press-releases/sb0605)                                                                             |
| Tokenized assets     | about $38.6 billion (September 2026), up from $33.5 billion in July; $14.7 billion of it US government bonds     | [Stobox / rwa.xyz, Sep 2026](https://www.stobox.io/reports/state-of-rwa-2026)                                                                         |
| Crypto venture money | $4.5 billion in Q3 2026, down 20% on the quarter; year on pace for about $19 billion against $20 billion in 2025 | [Galaxy Research, 28 Oct 2026](https://www.galaxy.com/insights/research/crypto-blockchain-venture-capital-q3-2026-deal-count-fundraising-later-stage) |

**Verdict on blockchain:** a bear market for prices, but the parts that move real money (stablecoins, tokenized bonds) are growing and becoming regulated. The "put everything on a chain" era is over; "use a chain where money and proof of ownership need it" remains.

## Has AI eaten blockchain?

**Where it holds:**

- **Money.** AI took about 80% of all venture capital in Q1 2026 (about $242 billion of $300 billion); crypto got about $8.6 billion ([insights4vc, Apr 2026](https://insights4vc.substack.com/p/ai-captured-80-of-global-venture), [CoinDesk, 18 Apr 2026](https://www.coindesk.com/business/2026/04/18/ai-is-increasingly-eating-into-vc-fundings-and-here-is-how-crypto-firms-are-adapting)).
- **Developers.** Weekly crypto code commits fell about 75% from early 2025 and active developers 56%, while GitHub grew by 36 million developers and AI projects by 178% ([CoinDesk, 12 Mar 2026](https://www.coindesk.com/tech/2026/03/12/crypto-developer-activity-sinks-to-multi-year-low-as-ai-absorbs-github-s-talent-boom)).
- **Companies.** Bitcoin miners are turning their sites into AI data centres; one expects 71% of its revenue from AI by end of 2026 ([Bloomberg, 27 Jul 2026](https://www.bloomberg.com/news/articles/2026-07-27/crypto-to-data-centers-treasury-model-bust-has-firms-chasing-ai)). DFINITY's own pivot to an AI cloud is the same move.

**Where it does not:**

- Experienced crypto developers grew about 27% and now write 70% of the code: those leaving are mostly newcomers and part-timers (CoinDesk, same article).
- Crypto venture money is roughly flat year on year, not collapsing (Galaxy).
- Stablecoins and tokenized assets keep growing and are getting law behind them.

**Verdict:** AI ate the hype, the money and the newcomers. It did not eat the use of blockchains for money and ownership records. A memory product that sells "blockchain" as its main feature is selling the part that was eaten.

## Storing memories "forever": what it costs

For 100 GB of family photos and videos:

| Where                          | How you pay               | Cost                                        | Source                                                                                    |
| ------------------------------ | ------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| ICP (13-node subnet)           | yearly, in cycles         | about $1,370 per year                       | [ICP cycle costs, 22 May 2026](https://docs.internetcomputer.org/references/cycle-costs/) |
| Arweave                        | once, "permanent"         | about $3,600 once (moves with the AR token) | [Arweave fee calculator, Nov 2026](https://ar-fees.arweave.net/)                          |
| Amazon S3 Standard             | monthly                   | about $28 per year                          | [AWS S3 pricing, 17 Nov 2026](https://aws.amazon.com/s3/pricing/)                         |
| Amazon S3 Glacier Deep Archive | monthly, slow to retrieve | about $1.20 per year                        | same                                                                                      |

ICP's own documentation contradicts itself on storage prices (another page suggests about $5 per GB per year), and the token plan proposes raising prices: measure on mainnet before promising anything. On every chain, "forever" lasts only as long as someone keeps paying (ICP) or the network's funds and miners last (Arweave).

## What this means for Futura

1. **Never make ICP the only copy.** Keep files on cheap cloud storage and offer an export, so nobody's photos depend on one network.
2. **Use ICP for what it does well:** proof of who owns a memory, rules for who may see it and when (inheritance), and passkey login. Not as a bulk file store.
3. **Do not lead with "blockchain".** Lead with the outcome: "your wedding photos, yours, for your grandchildren". The ad test points the same way.
4. **Keep the code independent of ICP** (it already is: storage is a per-person choice), so ICP can be dropped if it keeps shrinking.
5. **Move from dfx to icp-cli** before dfx stops working.
6. **Look again in about six months:** do Caffeine and Cloud Engines raise real usage of the network?
