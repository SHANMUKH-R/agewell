---
name: Shared patient selection
description: Cross-session rule for synchronizing AgeWell patient-detail routes with the globally shared demo selection.
---

Patient-detail routes may select their route patient once when the route is entered. They must not reselect that patient whenever a later shared-state poll reports a different selection.

**Why:** The demo selection is global. Poll-driven route enforcement caused open browser sessions on different patient-detail routes to repeatedly overwrite each other, making Elder and Family views switch patients after navigation.

**How to apply:** Treat route entry or route-parameter change as the selection event. Polling may display the current shared selection, but it must not trigger another selection mutation.