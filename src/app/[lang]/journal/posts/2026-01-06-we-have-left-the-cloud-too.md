---
title: 'We have left the cloud (too)'
date: '2026-01-06'
author:
  - Léonard
tags:
  - cloud
  - infrastructure
  - minio
  - aws
  - self-hosting
  - storage
excerpt: 'How we migrated from AWS S3 to self-hosted MinIO, taking control of our storage infrastructure and significantly reducing costs.'
published: false
---

# We have left the cloud (too)

Inspired by [37signals' journey out of the cloud](https://world.hey.com/dhh/we-have-left-the-cloud-251760fb), we've made a similar decision for Futura's storage infrastructure. After months of planning and execution, we've successfully migrated from AWS S3 to a self-hosted MinIO solution.

## The Decision

Like many startups, we started with AWS S3 because it was the path of least resistance. It worked, it scaled, and it required minimal operational overhead. But as our storage needs grew, so did our monthly bills. The convenience came at a cost—both financial and in terms of vendor lock-in.

We realized that for a service like Futura, where we're storing wedding memories and personal content for our users, having full control over the storage infrastructure wasn't just about cost savings—it was about sovereignty and reliability.

## The Migration

The migration from AWS S3 to MinIO wasn't trivial, but it was far simpler than we initially anticipated. MinIO's S3-compatible API meant that most of our existing code continued to work with minimal changes. The main work was:

1. **Setting up the MinIO infrastructure** - We deployed MinIO on our own hardware, giving us complete control over the storage layer
2. **Data migration** - Moving existing data from S3 to MinIO required careful planning to ensure zero downtime
3. **Updating our storage abstraction layer** - While MinIO is S3-compatible, we took the opportunity to improve our storage abstraction to make future migrations even easier

## The Benefits

The immediate benefit is cost savings. By self-hosting our storage, we've dramatically reduced our monthly infrastructure costs. But more importantly:

- **Full control** - We own the infrastructure, the data, and the destiny of our storage solution
- **Performance** - With storage closer to our application servers, we've seen improved latency for our users
- **Transparency** - No more black box cloud services. We can see exactly what's happening with our storage
- **Flexibility** - We can optimize the hardware and configuration specifically for our workload

## The Stack

Our self-hosted storage solution uses:

- **MinIO** - S3-compatible object storage
- **Docker** - Containerized deployment for easy management
- **Our own hardware** - Dedicated storage servers in our data centers

This setup gives us the reliability we need while maintaining the operational simplicity we want.

## Lessons Learned

The cloud has its place, especially for early-stage companies where infrastructure management would be a distraction. But as we've grown, the economics and control benefits of self-hosting have become undeniable.

If you're running a service with predictable storage needs and the technical capability to manage infrastructure, self-hosting is worth serious consideration. The tools are there, they're open source, and the savings can be substantial.

We're not anti-cloud, but we are pro-sovereignty. And for Futura, that means owning our storage infrastructure.
