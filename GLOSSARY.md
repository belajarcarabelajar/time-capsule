# Glossary

- **Primary provider:** Claude Haiku 5.5, called only by the story Worker.
- **Fallback provider:** the Groq OpenAI-compatible API, called only by the scenario Pages Function.
- **Story Worker:** the private Cloudflare Worker `time-capsule-story`, reachable only through the `STORY_WORKER` service binding.
- **Scenario request:** the browser's `{topic, chapter, history}` body sent to `/api/scenario`.
- **Fallback-eligible failure:** a story Worker reply of 502 `PRIMARY_UNAVAILABLE`; the only failure that reaches the fallback provider.
- **Terminal failure:** a failure that must not reach the fallback provider: refusal, rate limit, invalid request, auth, quota, or a missing or broken story Worker.
- **Auto-tour:** the 3D camera moving to the next tour stop on every dialogue line of a chapter, without the visitor steering it.
- **Tour stop:** one camera pose (position and target) in a room's ordered tour, built only from verified room views and orbits inside the look-around limits.
- **Glide:** the eased camera move from the current pose to the next tour stop.
- **Drift:** the slow, bounded camera sway around the current tour stop while a line is read.
