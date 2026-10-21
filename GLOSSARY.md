# Glossary

- **Primary provider:** Claude Haiku 5.5, called only by the story Worker.
- **Fallback provider:** the Groq OpenAI-compatible API, called only by the scenario Pages Function.
- **Story Worker:** the private Cloudflare Worker `time-capsule-story`, reachable only through the `STORY_WORKER` service binding.
- **Scenario request:** the browser's `{topic, chapter, history}` body sent to `/api/scenario`.
- **Fallback-eligible failure:** a story Worker reply of 502 `PRIMARY_UNAVAILABLE`; the only failure that reaches the fallback provider.
- **Terminal failure:** a failure that must not reach the fallback provider: refusal, rate limit, invalid request, auth, quota, or a missing or broken story Worker.
