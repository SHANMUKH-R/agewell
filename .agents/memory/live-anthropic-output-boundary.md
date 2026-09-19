---
name: Live Anthropic output boundary
description: Real-provider behavior and the safety boundary required for AgeWell live assessments.
---

Treat live Anthropic output as untrusted classification input. The model may influence risk level and confidence, but every displayed headline, rationale, action, actor, and deviation must be reconstructed from deterministic server-owned data and templates.

**Why:** Real calls returned fenced JSON, sometimes included extra fields despite an exact response request, and could take more than 5.5 seconds. Common model wording also included advice-like language that is inappropriate for AgeWell.

**How to apply:** Parse fenced JSON, tolerate and ignore extra fields, validate only the classifier values the server consumes, never display model-authored narrative, and commit state changes only after the awaited assessment is ready.