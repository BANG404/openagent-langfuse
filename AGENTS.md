# Langfuse package ownership

This independent package owns external observability configuration,
public hook collection, OTLP conversion and bounded pending telemetry.
Use the host's `openagent-plugin-development` and `deliver-via-owt` skills.
Session ownership uses Runtime `context-sessions-v1`, including the selected
branch and durable compaction stage. Never infer it from hook counts, prompts,
timestamps or parent conversation IDs. Split an execution at context boundaries.
Never extend internal SDK telemetry access implicitly. Publish accepted source
and immutable root-level archives at BANG404/openagent-langfuse before advancing
the OpenAgent gitlink and reviewed catalog version. Never replace released bytes.

Keep upload, chat-message capture, model-content capture and tool-content capture off by default. Message
projection requires the declared Runtime capability and its independently saved
consent field; model capture requires a distinct field from chat capture. Never infer permission from tool capture. Configuration is supplied
through private plugin bindings; do not read ambient credentials or host settings.
Hook stdout stays empty. Tests use fake credentials and loopback mock ingestion.
Run the Plugin Kit validator with all platform locales and package-owned tests.
Do not replace mock success with a claim of authenticated Langfuse readiness.
