---
title: "Futura's Solution"
subtitle: 'The missing memory album for newlyweds'
date: '2026-01-08'
author:
  - Stefano
tags:
  - wedding
  - memory
  - album
  - privacy
  - ownership
  - beauty
  - forever
excerpt: "Couples don't own their wedding galleries the same way they own their albums. There's no dedicated digital system designed for wedding memories—only temporary galleries and generic cloud storage. This essay explores the problem and how Futura addresses it through ownership, forever preservation, and beauty."
published: true
---

# The challenges Futura solves

## Introduction

Futura aims to be a digital multimedia memory album for newlyweds. Spouses can collect the memories of their wedding, share them with their loved ones, and, thanks to Web3 technologies, preserve them in a space that belongs to them. Forever.

In this essay we outline the problems that Futura solves and describe the approaches we're taking to address them. We are still in early stage development, so some work still needs to be done.

## The Problem

_Couples don't own their wedding galleries the same way they own their wedding album._ Most online gallery hosting systems, which are also used in the wedding photography space, address the needs of photographers more than those of newlyweds. This is already visible in how the most prominent services present themselves: Pixieset positions itself as a "Client Photo Gallery for Modern Photographers," Pic-Time as "Online Photo Galleries for Professional Photographers," and many others follow the same pattern.[^1] The primary customer being addressed is not the client of the photographer, in our case the couple, but the professionals themselves.

This approach makes sense from a business perspective. Photographers shoot weddings and other events every day, while people usually marry once, or very few times, in a lifetime. Gallery platforms therefore optimize for recurring professional users rather than for one-off clients. But the consequence of this market logic is that wedding galleries are usually created and managed under the photographer's account. Couples are granted access to them, but only for a limited period—which may be long and is typically defined in the contract. However, they have no possibility to redeem the gallery, take ownership of it, and maintain it as a persistent digital space tied to their wedding.

Galleries are not the only way couples receive their wedding photos. They also typically receive a physical album with a selection of the best images and a complete digital copy—either on a physical drive or via cloud download. But they are then left alone with the task of preserving these digital files properly over time. That this is a real and recurring issue is evident from the large number of guides published by wedding photographers themselves, explaining to clients how to safely store their wedding photos.[^2] Redundancy, of course, is always presented as the key principle: multiple copies, multiple locations, and at least one copy in the cloud.

But what's revealing is which cloud solutions photographers recommend. Almost without exception, they suggest mainstream consumer storage platforms such as Google Drive, Dropbox, iCloud, or Amazon Photos. This exposes a clear disconnect. On the one hand, photographers rely on specialized gallery platforms to present and deliver wedding images. On the other hand, couples are expected to preserve those same images long-term using generic cloud storage systems that are not designed around the specificity, structure, or symbolic weight of a wedding gallery. _There is no dedicated digital album system that serves as the counterpart to the physical wedding album._

## How Futura Solves It

Futura is that dedicated digital album. It offers newlyweds **true ownership** of a **beautiful**, **private** digital space designed specifically for their wedding memories — something far more meaningful than a folder on Google Drive — and a way to share them with the people they love and preserve it **forever**.

We address these challenges through one fundamental requirement — beauty—and three core features: ownership, foreverness, and privacy.

_Beauty as a Requirement_. Before anything else, Futura must be beautiful. Wedding memories demand a space that honors their significance—not just functional storage, but a meaningful, elegant experience. This is why we have James Dominique Barranger[^10] and Massimiliano Muner[^11] serving as art directors for the project, ensuring that every aspect of Futura reflects the importance of what it preserves.

_Ownership_. Futura gives to the newlyweds true ownership over their gallery, not only for the simple reason that they hold the gallery account, as they could with any other cloud gallery systems, but thanks to web3 technologies[^3], they can have control over the digital space that hosts their gallery, even beyond the existence of Futura itself. Within the Web3 ecosystem ICP, the Internet Computer, stands out for its capability to host a full-stack application on-chain. And therefore we picked up ICP for our Web3 backend.

The backend of an app is not a monolith, but a complex system. There is normally a computational layer that performs operations, a Database that holds the data, and for heavyweight assets, like photos or videos, you use a so called Blob storage. The Blob storage is the place where the memories of your wedding album are physically stored. We will discuss our choices regarding the storage layer in the next paragraph.

_Foreverness_. Futura's promise to store your wedding gallery forever is a bold one.[^7] Nothing seems to be forever. We mean it as for really long time, at least lifelong.[^4] The first learning if you enter the space of long-term storage strategies is that redundancy is the key. The famous 3-2-1 backup rule says you should have at least 3 copies of the data you want to store, in two different media, one of them offsite, i.e. somehwere else that where are you keeping the other two. The challenge in our case is also to let the spouses to store their memories 'forever' though an upfront payment.

A possible strategy to tackle the problem would be an **endowment** system[^5], yet in the blockchain horizon we adopt, it would shift the responsibility for foreverness from a computational mechanism to financial management, and the financial model would become the weak chain element.

But which are the storage technologies we can leverage? First: thinking about a **self-hosted** solution of a wanna-be company would be foolish. Maybe one day Futura will be a trusted institution, the way the Internet Archive is, for family heritage preservation, but we are not there yet. But even if we would not be concerned with true data owndership and we would consider as main storing system the mainstream Web2 solutions, and we would consider the most prominent among them, **AWS**, it is notworthy what was Jeff Bezos self-assesment about the future of Amazon during an internal meeting in 2018 where he responded to a question about Sears's bankruptcy by telling employees that "Amazon is not too big to fail… In fact, I predict one day Amazon will fail. Amazon will go bankrupt. If you look at large companies, their lifespans tend to be 30-plus years, not a hundred-plus years."[^6]

Since Futura has been borned in the **ICP** ecosystem and we chose ICP as the Web3 backend, it's natural to think as ICP of one possible Blob Storage solution. A smart conract (canister) has 500 GiB of stable memory, which in ICP terms is the non-volatile memory. Storing a selection of 50 photos as JPEG in full resolution for 100 years would cost around 500$.[^8] It's worth noting that DFINITY is preparing to roll out an updated blob storage service as part of the Caffeine Phase III upgrade (targeting early October 2024), which will dramatically decrease the price of storage, bringing 1 GiB for 100 years to approximately 25 Euros.[^9]

The ohter blockchain based infrastructure which is relevant for our scope is Arweave.

[Privacy]

- Apps are often blackboxes you can't look inside. The fact that Futura is Open Source means that our codebase can be audited and read by anyone, so that you know (or you could potentially know) what happens to your memories when you upload them on Futura.
- Encryption
  [Singularity]
  [Flexibility]
  [Beauty]

It doesn't replace gallery cloud hosting systems and it doesn't replace the big cloud storage.

## Key Features

## Conclusion

---

[^1]: Examples of gallery platforms positioning themselves for photographers include: Pixieset ("Client Photo Gallery for Modern Photographers"), Pic-Time ("Online Photo Galleries for Professional Photographers"), ShootProof ("Online Photo Galleries for Photographers," "Created By Photographers, For Photographers"), CloudSpot ("Online Galleries for Photographers"), Zenfolio ("Website & Gallery Solutions for Photographers"), Picdrop ("Best Photo Sharing Platform for Photographers").

[^2]: Wedding photographers frequently publish client guides on safely storing digital wedding photos, emphasizing downloads from galleries, external drives, and cloud backups. Examples include: (1) Heather Sham Photography, ["Backup Wedding Photos"](https://heathersham.com/backup-wedding-photos/); (2) Jose Melgarejo, ["How to Store Your Wedding Photos"](https://www.josemelgarejo.com/how-to-store-your-wedding-photos/); (3) Helena & Laurent, ["The Ultimate Guide to Backing Up & Storing Wedding Photos"](https://www.helenaandlaurent.com/tips-and-guides/the-ultimate-guide-to-backing-up-storing-wedding-photos/); (4) Caitlin Elizabeth, ["How to Safely Store and Backup Your Wedding Photos"](https://www.caitlinelizabeth.com/blog/how-to-safely-store-and-backup-your-wedding-photos); (5) Heidi Talic Photography, ["How to Backup and Safely Store Your Photos"](https://heiditalicphotography.com/how-to-backup-and-safely-store-your-photos/); (6) Love Life Images, ["Your Guide to Digitally Storing Your Wedding Photos"](https://www.lovelifeimages.com/blog/2021/7/23/your-guide-to-digitally-storing-your-wedding-photos); (7) Andrew Franciosa, ["How to Back Up Your Wedding Photos"](https://andrewfranciosa.com/how-to-back-up-your-wedding-photos/); (8) S. Arnold Photo, ["How to Store and Organize Wedding Photos"](https://sarnoldphoto.com/2025/01/20/how-to-store-and-organize-wedding-photos/); (9) Victoria J Photography, ["Storing Your Digital Wedding Photographs"](https://www.victoriajphotography.com/storing-your-digital-wedding-photographs); (10) Saywell HQ, ["How I Keep Your Wedding Photos Safe"](https://saywellhq.co.uk/blog/how-i-keep-your-wedding-photos-safe); (11) Emily Nicole Photography, ["How to Safely Store Your Wedding Photos"](https://emilynicolephotography.com/how-to-safely-store-your-wedding-photos/); (12) Kelly McPhail, ["How to Safely Store Your Digital Photos"](https://kellymcphail.com/how-to-safely-store-your-digital-photos/); (13) DK Photo, ["7 Tips: Storing Digital Wedding Photos Forever"](https://www.dkphoto.ie/bride-guide/7-tips-storing-digital-wedding-photos-forever/).

[^3]: The passage from web1 to web2 to web3 can be explained as the evolution of the fruition of the internet by normal users: a read, write, own evolution. Web1 was the initial phase, where normal users were able mainly to read content on the websites. Web2 was the phase where people were able also to produce content. This is the season of the blogs. The blog platforms themselves, like YouTube or Instagram today, were owned by a company, but the users were able to easily publish new content. With the rise of blockchain technologies the normal user is able to own portions of the web. This is made possible through the creation of decentralized or distributed systems, whose stability is ensured by complex cryptographic mechanisms, which are basically not owned by anyone. See https://en.wikipedia.org/wiki/Web3

[^4]: For a good discussion of the problem of long-term digital storage, see Maxwell Neely-Cohen, "Century-Scale Storage," https://lil.law.harvard.edu/century-scale-storage/

[^5]: An endowment is a financial mechanism where funds are invested to generate returns, with only the investment income (not the principal) being used to support ongoing operations. This allows for long-term sustainability through a one-time upfront payment. American universities commonly use endowment systems to fund their operations indefinitely. A similar strategy is used by permanent.org, which, like Futura, operates in the long-term digital preservation space. See https://www.permanent.org/blog/how-our-endowment-works/

[^6]: Jeff Bezos, internal meeting at Amazon, 2018. This episode is reported in Maxwell Neely-Cohen, "Century-Scale Storage," https://lil.law.harvard.edu/century-scale-storage/

[^7]: We used to associate the idea of a blockchain with immutable content. Normally content saved on-chain has been stored 'forever' or at least as long as the blockchain exists. [elaborate a little bit on this]

[^8]: In contemporary wedding photography, the photographer typically delivers a curated gallery of approximately 500 edited images, although this number varies with the scale of the event and the duration of coverage; final collections may range from about 300 to as many as 1000 photographs. For high-resolution exports, individual files are most often provided in JPEG format, whose upper size limit is roughly 20 MB per image. The physical wedding album, by contrast, comprises a much narrower selection of around 50 photographs. Consequently, the complete digital delivery generally amounts to about 10 GiB, while a brief online selection shared for convenience is close to 1 GiB. Regarding ICP storage costs: storing data costs the same whether it's in heap or stable memory. On a 13-node subnet, 1 GiB for 1 year costs approximately 4 trillion cycles (~$5.35). Therefore, storing 10 GiB for 1 year costs approximately 40 trillion cycles (~$53.50). See https://docs.internetcomputer.org/building-apps/essentials/gas-cost#storage

[^9]: DFINITY is preparing to roll out the updated blob storage service as part of the Caffeine Phase III upgrade, targeting early October 2024. Blob storage will let apps store large files like photos, videos, and documents directly on-chain at a fraction of today's cost. Dominic Williams announced this rollout and shared a target of about $0.025 per GB per year, which is significantly cheaper than AWS S3 Standard ($0.276), Wasabi ($0.084), Backblaze B2 ($0.072), and Storj ($0.048). https://x.com/dominic_w/status/1955447139347337491

[^10]: James Dominique Barranger is [add brief bio and relevant experience]. [Add portfolio/website link if available]

[^11]: Massimiliano Muner is [add brief bio and relevant experience]. [Add portfolio/website link if available]
