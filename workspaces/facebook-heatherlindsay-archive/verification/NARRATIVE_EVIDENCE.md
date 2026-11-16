# Narrative evidence register

Source root: `workspaces/facebook-heatherlindsay-archive/extracted/`. Each source listed below is archive-relative. Numerical counts use HTML table data rows, excluding the first two header/description rows, and include all `page_*.html` files for the exact named directory. They are telemetry **rows**, not necessarily distinct human actions, videos, people or sessions.

| ID | Source path under extracted/ | Direct evidence | Interpretation limit |
|---|---|---|---|
| E1 | `data_logs/content/account_and_profile_interactions_21/time_spent_493/page_1.html` | 1,581 rows, 78 unique date strings 2025-01-01 through 2026-10-26; sum Time Spent = 107,506.461 seconds; interface entries include Android, iOS, Messenger, web | Sum may include overlapping time and does not establish full app history |
| E2 | `data_logs/content/device_and_connection_information_1/activity_sessions_520/page_1.html` | 7 rows, four Facebook for Android and three Messenger for Android | A specific sampled session export table, not the full messaging history |
| E3 | `data_logs/content/content_and_social_interactions_22/reels_viewing_activity_3/page_1.html` | 40 daily rows; 2,474 summed Video views served | Served does not mean completed watch; ratio/time fields require independent semantics |
| E4 | `data_logs/content/content_and_social_interactions_22/reels_feed_activities_205/page_1.html` and `page_2.html`, `page_3.html`, `page_4.html` | 1,260 action rows: Viewed 465; Scrolled 380; Skipped forward or back 141; Paused 107; Exited 112; Other 33; Selected description 12; Selected reel 10 | Event categories may describe multiple stages of the same session/video |
| E5 | `data_logs/content/content_and_social_interactions_22/friends_tab_interactions_195/page_1.html` | 340 event rows: nav_bar_impression 306; cta_impression 18; notification_impression 9; nav_bar_click 6; notification_click 1 | Impression is feature exposure, not evidence of intentional engagement |
| E6 | `data_logs/content/content_and_social_interactions_22/group_activity_270/page_1.html` | 356 rows: Group member Yes 198, No 158; records include group reference, application and activity amount | Neither unique groups nor post/comment counts |
| E7 | `data_logs/content/content_and_social_interactions_22/story_viewing_activity_checks_507/page_1.html` | 14 rows with date and viewing summary fields | Rows do not capture all stories, motivations or content |
| E8 | `data_logs/content/business_message_activity_20/messaging_activity_with_businesses_595/page_1.html` | Messaging activity event columns and a recorded business-conversation navigation event | Does not establish personal message content |
| E9 | `data_logs/content/content_and_social_interactions_22/your_marketplace_search_activity_126/page_1.html` | One table row dated October 10, 2026, referring to Facebook search results | Search does not establish a transaction |
| E10 | `data_logs/content/search_and_navigation_interactions_24/marketplace_search_interests_156/page_1.html` | Three October 26, 2026 LOGGING_CLICK rows with size-related terms | May include inferred/duplicated keywords; no purchase proof |
| E11 | `data_logs/content/ads_you_saw_12/ad_headline_impressions_26/page_1.html`, `ad_interactions_16/page_1.html` | Ad impression metadata including displayed headline and app; daily advertising interaction categories | Impressions are not endorsements; exact totals not inferred here |

## Reproduction
Run `python workspaces/facebook-heatherlindsay-archive/src/narrative_metrics.py` from repository root. Recalculate each cited metric by choosing its table name and event column in `output/narrative-metrics.json`; compare sample original rows. The narrative intentionally avoids identifying individual conversation correspondents, group names, search names, ad targeting details or sensitive location data.

## Coverage boundaries
The 78 unique dates are only from the cited time-spent table; no claim of continuous daily use across the intervening period. No complete deduplication across log categories has been performed. Semantic interpretation of the entire set of 1,202 HTML pages has not been completed.
