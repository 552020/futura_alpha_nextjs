---
title: "Building with Juno"
subtitle: 'A Developer Experience Report'
date: '2026-01-12'
author:
  - Léonard
tags:
  - juno
  - icp
  - internet-computer
  - analytics
  - web3
  - serverless
  - fake-door-testing
  - developer-experience
excerpt: "When we set out to validate Futura's market segments through fake door testing, we needed a deployment platform that could handle staging environments, decentralized analytics, and serverless functions. This is our experience building on Juno, some of the challenges we faced, the solutions we found, and the exceptional support that made it possible."
published: true
---

# Building with Juno

## Introduction

Futura aims to be a digital multimedia memory album for newlyweds—a space for couples to collect, share, and preserve their wedding memories with true ownership through Web3 technologies.[^1] More broadly, it is a digital memory preservation platform, and before we refined its focus on weddings, we explored different variations of the idea.

We wanted to validate the wedding concept against the original family-oriented vision. During discussions with the DFINITY Foundation team, a third vertical—Transcendence—emerged as an additional direction to test. The validation would take the form of fake door testing: three landing pages, one for each vertical, with an advertising campaign to measure which resonated most.

This validation effort became part of a grant from the DFINITY Foundation. The grant's core condition was to utilize Juno and its analytics capabilities to demonstrate how the platform can be used in a live environment.[^2]

This essay documents our experience building on Juno: the implementation of staging environments, the evolution of our analytics approach, and the challenges we encountered along the way. Throughout this journey, Davide, Juno's founder and maintainer, provided exceptional support—explaining concepts, updating documentation, and implementing fixes when needed.

## What We Built

### The Project: Fake Door Testing on the Internet Computer

Fake door testing is a product validation technique where you present potential features or products to users before they are fully built, measuring their interest through engagement metrics.[^3] For Futura, this meant creating three landing pages—one for each vertical—and driving traffic to them through an ad campaign to determine which market segment showed the strongest interest.

The architecture was straightforward: each landing page lives at its own URL path (`/family`, `/wedding`, `/transcendence`), and users who express interest are directed to a shared onboarding form. The challenge was measuring not just traffic to each page, but tracking which vertical ultimately drove conversions—a user completing the onboarding flow.

Our landing pages are deployed on `ic.futura.now`, powered by Juno, while the full application (wedding branch), web2 frontend with Web3 storage capabilities runs on `futura.now`.

## Implementation

### Staging and Production Environments

One of the first requirements for any serious development workflow is environment separation. You need a staging environment where you can test changes before they affect real users. On traditional platforms, this is trivial. On the Internet Computer, it requires understanding how Juno's satellite architecture works.

A Juno satellite is essentially a smart contract (canister) that hosts your application. The insight—and credit goes to Davide for clarifying this early—is that staging and production are simply two different satellites with different canister IDs.[^4]

Our `juno.config.ts` defines both:

```typescript
satellite: {
  ids: {
    staging: "5yoof-ciaaa-aaaal-asevq-cai",
    production: "uocd6-laaaa-aaaal-asfga-cai",
  },
  source: "out",
  predeploy: ["pnpm run build"],
}
```

We then created separate GitHub Actions workflows: one that deploys to staging on feature branch pushes using `--mode staging`, and another that deploys to production on main branch merges using `--mode production`. Each workflow uses its own authentication token, ensuring clean separation of concerns.

### Analytics: From Page Views to Conversion Attribution

Our analytics implementation evolved through two distinct phases, driven by a fundamental problem we discovered only after the initial deployment.

**Phase 1: Juno Orbiter**

Juno provides Orbiter, a decentralized analytics service that runs entirely on the Internet Computer.[^5] Setting it up was straightforward—add the Orbiter satellite ID to our config, install the `@junobuild/analytics` package, and wrap our application in a provider that initializes tracking:

```typescript
import { initOrbiter } from "@junobuild/analytics";

export function OrbiterProvider({ children }) {
  useEffect(() => {
    initOrbiter({
      options: {
        userAgentParser: true,
        performance: true
      }
    });
  }, []);
  return <>{children}</>;
}
```

This gave us page views, performance metrics (Web Vitals), and device information—all collected without relying on third-party services, stored on the blockchain. For basic traffic analysis, this worked well.

**Phase 2: The Attribution Problem**

The problem emerged when we tried to answer a simple question: which vertical is converting best?

With Orbiter, we could see that users visited `/family`, `/wedding`, and `/transcendence`. We could see that users completed the onboarding form. But we could not connect these two pieces of information. When a user arrived at the shared onboarding form, we had no way of knowing which landing page they came from.

This is a classic attribution problem in analytics. Traffic metrics tell you where users land; conversion metrics tell you what users do. But without linking them, you cannot measure funnel performance per segment.

**The Solution: UTM-Based Segment Tracking**

The solution involved three components working together.

First, we added UTM parameters to all links from landing pages to the onboarding flow. When a user on `/family` clicks "Get Started," the URL becomes `/onboarding?utm_source=family`. This is standard web analytics practice, and Juno's analytics automatically captures UTM parameters when `utm_source` is present.[^6]

Second, we extended our event tracking to include segment metadata. When a user completes the onboarding flow, we fire a custom event:

```typescript
await trackEventAsync({
  name: "memory_shared",
  metadata: {
    segment: utmSource,
    files_count: files.length.toString(),
    relationship: userData.relationship || '',
    family_role: userData.familyRelationship || '',
  }
});
```

Third, we persisted the segment information in our backend. The Rust serverless function that processes form submissions now stores the originating segment alongside the user data:

```rust
#[derive(Serialize, Deserialize)]
struct EmailRequest {
    // ... other fields
    #[serde(default)]
    segment: Option<String>,
}
```

The result is full-funnel attribution. We can now measure not just which vertical drives the most traffic, but which vertical drives the most conversions—the metric that actually matters for validating market interest.

## Challenges Encountered

### Custom Domain Configuration

Tying a Juno deployment to a custom domain proved more complex than anticipated. The standard documentation covers the basic flow, but we encountered edge cases that required intervention from the DFINITY team to resolve (or so it was our understanding).[^7]

### The Proxy Function: A Bittersweet Story

One of the most instructive part of our Juno experience involves a feature we built that quickly became obsolete.

We wanted to send emails when users completed the onboarding form. On a traditional platform, you would call an PI such as Mailgun directly from your backend. On the Internet Computer, HTTP outcalls required IPv6 support on the target server, they had to be deterministic and idempotent, and the request/response cycle had to work within the consensus mechanism.

Mailgun did not meet these constraints. So we built a proxy.

Or rather we refactored to our need one Davide's offered in his repo.[^10] The architecture worked as follows: when a user completes the sharing flow, the email request is stored in Juno's datastore under an `email_requests` collection—capturing the sender's name, recipient's email, and the segment they came from. This triggers an `on_set_doc` hook in our Rust serverless function, which reads the request, retrieves the Mailgun API token from a separate restricted datastore document, and forwards the email to an off-chain proxy running on Cloudflare, which in turn calls Mailgun.[^8]

It worked. We were rather proud of it.

Then, shortly after we finished, the Internet Computer rolled out non-replicated calls for simple requests, and relaxed determinism constraints. The very limitations that made our proxy necessary were removed.

How do you feel when you have built a careful workaround for a platform limitation, only to have the platform fix the limitation right after you finish? There is a German word for this feeling, probably.[^9] But honestly, how can you not be happy about the IC fixing something? The proxy was always a bridge solution—a concession to platform immaturity. That the platform matured is good news. Our proxy can now be deprecated, the architecture ready to be simplified, and future developers will never need to solve this problem.

The takeaway is not that we wasted time. The takeaway is that the Internet Computer is actively evolving, and solutions that are necessary today may become unnecessary tomorrow. This is a sign of a healthy platform.

## Working with Davide

Throughout this project, Davide's support was exceptional. When we struggled with the staging setup, he explained the satellite architecture and check our code to find possible errors. When we hit the custom domain issue, he coordinated with the DFINITY team to find a resolution. When we had questions about analytics capabilities, he pointed us to documentation and, when documentation was insufficient, updated it.

This level of responsiveness from a platform maintainer is rare. Juno is fundamentally the work of one person, and the quality of support reflects both deep technical knowledge and genuine investment in developers' success.

For teams considering Juno for their Internet Computer projects, our experience suggests it is a capable platform with strong fundamentals and exceptional support. The ecosystem is still young, and you will encounter rough edges. But you will not encounter them alone.

## Footnotes

---

[^1]: Futura is described in detail in our companion essay, "Futura's Solution: The Missing Memory Album for Newlyweds." The project aims to provide true ownership of digital memories through Web3 technologies. A deeper analysis of the evolution of the idea is in progress.

[^2]: The grant was a $5k award from the DFINITY Foundation. See the forum discussion: https://forum.dfinity.org/t/futura-an-app-to-store-memories/62052

[^3]: Fake door testing (also called "painted door" testing) involves creating the appearance of a feature or product—typically a landing page with a call-to-action—before the underlying functionality exists. User engagement with this "fake door" validates interest before significant development investment. The technique is widely used in lean startup methodology.

[^4]: The staging versus production discussion with Davide is documented in our Discord thread: https://discord.com/channels/1076791076544847982/1408822636259053679/1408823203588997312

[^5]: Juno Orbiter documentation: https://juno.build/docs/build/analytics/setup. Orbiter is a dedicated analytics satellite that collects page views, performance metrics, and custom events without relying on third-party services.

[^6]: Juno's UTM tracking is documented at https://juno.build/docs/build/analytics/development. The `utm_source` parameter is required; if missing, campaign data will not be tracked.

[^7]: The custom domain resolution required coordination with DFINITY boundary node infrastructure. The Discord discussion documenting this issue: https://discord.com/channels/1076791076544847982/1076791077308219414/1404022953448046653

[^8]: The proxy implementation involved storing the Mailgun API token in Juno's datastore with `read: "controllers"` and `write: "controllers"` permissions, ensuring the token was accessible only to the serverless function and not exposed to frontend code.

[^9]: The German word might be *Verschlimmbesserung* (an improvement that makes things worse) or perhaps its inverse. But really, there is no word for "relief that your workaround is no longer needed, mixed with mild regret that you built it at all."

[^10]: The original Juno proxy repository: https://github.com/junobuild/proxy. And yes, we know—it's 404 now. That's rather the point.
