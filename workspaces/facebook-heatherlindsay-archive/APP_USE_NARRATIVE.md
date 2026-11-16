# Semantic narrative of Facebook app use

**Evidence basis:** extracted Facebook HTML data export generated November 8, 2026. **Procedure nonce:** `4a94c461-67c3-4e68-8946-1a6adff670d9`. **Scope:** behavioral patterns supported by specified telemetry tables, not a complete reconstruction of the account holder's life or intentions.

## Overview: a multifunctional, mobile-centered social application experience

The export shows a Facebook account used across a mix of browsing, video playback, social navigation, groups, messaging, search and occasional commerce-oriented screens. It is not a simple collection of deliberately authored posts. Much of the data is *platform instrumentation*: impression records, content-delivery signals, app session statistics and inferred interests. Such records show what was displayed or logged, not necessarily what the account holder sought, valued or endorsed. The account's observed experience is best understood as an ongoing stream of presented media punctuated by more specific actions.

In a time-spent table covering **78 recorded dates from January 1, 2025 to October 26, 2026**, 1,581 time-value rows sum to **107,506.461 seconds (about 29.9 hours)**. This number is strictly a sum of values in that one exported table; it is **not** established as total lifetime screen time, because temporal overlap, sampling and export completeness have not been independently reconciled. The table identifies Android, iOS, Messenger and web interfaces, indicating multi-surface use across the recorded period. The separate activity-session sample contains both Facebook for Android and Facebook Messenger for Android. [E1–E2]

## Reels and viewing: sustained progression through a stream

The richest directly observable interaction cycle concerns Reels. A daily summary file contains **40 date rows** and **2,474 videos served** across those rows; a separate four-page interaction table contains **1,260 events**, including **465 'Viewed', 380 'Scrolled', 141 'Skipped forward or back', 107 'Paused', and 112 'Exited'**. These different measures must not be added or interpreted as unique videos watched. A video being *served* may be passive exposure, and a 'Viewed' event does not prove viewing to completion. [E3–E4]

Semantically, the sequences are consistent with someone encountering a succession of short videos and repeatedly choosing whether to continue, skip, pause, or leave. The scroll/skip/exit actions indicate interaction with the video interface beyond a single isolated play. They do not reveal why a particular video was appealing, whether it was watched attentively, or whether the platform's recommendations were welcome.

## Social connections: presentation versus participation

Friends-tab logging provides a clear illustration of the difference between **being shown a feature** and **electing to use it**. Among **340 rows**, **306** report `nav_bar_impression`, whereas **six** report `nav_bar_click` and **one** reports `notification_click`. Another 27 rows represent other impression types. The interface appeared repeatedly, but the recorded intentional selections were far less frequent. Those logs cannot measure all friendship-related activity elsewhere in Facebook. [E5]

The group activity table contains **356 rows**, **198** with its `Group member` column marked **Yes** and **158** marked **No**. This indicates encounters or activity contexts involving both joined and unjoined groups, not that 356 posts, comments, or unique group visits occurred. Group-related use therefore forms part of the account's social-content context, but the available fields require deeper investigation before describing actual discussions, affiliations, or community participation. [E6]

Story viewing is also represented by a table with 14 data rows, including dates and fields for creators and views. This confirms another social browsing surface, though its counts should remain distinct from Reels and feed interactions. [E7]

## Communication and navigation

The sampled `Activity sessions` table includes seven rows: **four Facebook for Android** and **three Facebook Messenger for Android**. This confirms the use of both the main app and Messenger within that particular table; it does **not** measure all conversations or full messaging history. A business messaging table separately contains events associated with conversation links and messaging-related interfaces, but those records alone cannot support a narrative about private conversation content or motives. [E2, E8]

Thus the account's recorded experience was not only content viewing. It also involved messaging surfaces and relationship-oriented interfaces. Their importance relative to video consumption remains uncertain until events are deduplicated and semantically matched across separate tables.

## Marketplace and directed searching

Commerce-related data offers examples of more directed actions. An October 10, 2026 Marketplace search activity row records a query from Facebook search results. An October 26 `marketplace_search_interests` table contains three `LOGGING_CLICK` entries and size-related keyword tokens. These are evidence of search/navigation signals and categorized interests, **not proof of an actual purchase, sale, item ownership, or seller conversation**. The export may be capturing both deliberate user input and system-derived interest terms. [E9–E10]

Compared with the repeated Reels and feed signals, the specific observed Marketplace examples are narrower in the inspected files. That does not establish Marketplace was unimportant overall, only that the cited records provide fewer unambiguous actions.

## Advertising and algorithmic mediation

Ad impressions, headlines and interaction metadata demonstrate that advertising was woven into the experience. An impression establishes delivery, not a choice to seek the ad. Similarly, recommendation, profile-category and inferred-interest fields reflect Meta's measurement or categorization, not verified attitudes. This distinction is central when interpreting what this account was shown versus what it actively chose. [E11]

## What the narrative supports — and what it does not

Taken together, the **supported pattern** is an account engaging with a mixed Facebook environment: frequently encountering media, repeatedly operating the Reels interface, browsing social-content surfaces and groups, accessing Messenger, and making some specific search/commerce interactions. **The higher-level interpretation** is a video-forward social browsing experience with episodic directed navigation and communication.

This narrative **does not** establish exact motives, psychological characteristics, a comprehensive daily routine, interpersonal relationships, location history, purchases, or complete message content. The HTML export contains many machine-generated log types; rows from different tables may describe overlapping events, and some metrics are estimated or otherwise opaque. Larger conclusions require tracing event identifiers across tables, validating timestamps and content, distinguishing active actions from impressions, and evaluating coverage gaps.

## Sources and reproduction

For exact source file paths, table columns, counts and verification directions, see `verification/NARRATIVE_EVIDENCE.md`. Reproduce measurements with `python src/narrative_metrics.py` from this workspace. Its output, `output/narrative-metrics.json`, stays ignored by Git.
