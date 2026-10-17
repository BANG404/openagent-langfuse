# Langfuse Tracing

Send agent execution and tool-call traces to Langfuse after setup; message and model-content capture are separately opt-in.

An installable, dependency-free observability integration inspired by
[Langfuse's Codex plugin](https://github.com/langfuse/codex-observability-plugin).
Requires Node.js 22+ and an OpenAgent Runtime supporting plugin protocol 1,
`configuration-v1`, `integration-v1`, `conversation-observations-v1`,
`model-observations-v1`, and `context-sessions-v1`.

Install **Langfuse** from the OpenAgent plugin catalog, or select the archive from
[GitHub Releases](https://github.com/BANG404/openagent-langfuse/releases).
Developers can install the `plugins/langfuse` directory through **Settings >
Plugins > Install local directory**. Installation copies the package; use its
local-source Refresh button after source changes. Local source installations
follow that directory; archive installations use the independent release channel.

In the plugin configuration, save your Langfuse project public key and secret key,
choose the base URL (default EU: `https://cloud.langfuse.com`), then enable upload.
US: `https://us.cloud.langfuse.com`; Japan: `https://jp.cloud.langfuse.com`.
HTTPS is required except for loopback and literal private IPv4 HTTP endpoints (10/8, 172.16/12, 192.168/16). Use HTTP only on a trusted local network: authentication is unencrypted.
Secrets use OpenAgent's private plugin settings store. Do not put them in this package.

- `/langfuse:status` reports readiness and queue counts without exposing credentials.
- `/langfuse:test` sends a synthetic span to verify authentication and OTLP ingestion.
- `/langfuse:retry` uploads up to three completed pending executions.

Each conversation branch and durable context stage becomes one session, following
[Langfuse sessions](https://langfuse.com/docs/observability/features/sessions).
Normal turns, tools, retries, approval resumes and restart keep the same ID.
Successful compaction starts a new session with `previous_session_id` metadata;
staging and failed compaction do not. Forks and child conversations are independent.
An execution crossing compaction exports one trace per context stage, each with
an Agent root, model timing generations and tool spans. Successful,
failed, cancelled and interrupted execution phases are retained. Child traces are
correlated by metadata; the plugin does not infer cross-execution parent span IDs.

**Capture model call content** is independently disabled by default. With Runtime
`model-observations-v1`, each generation receives its own provider-neutral
non-system text messages, tool call/result IDs, response, configured model and
reported token usage, following [LangSmith's per-call message design](https://docs.langchain.com/langsmith/log-llm-trace).
The first response may contain only tool calls; the next input contains their
results. System prompts, reasoning, attachment bytes, private metadata and
non-message context are excluded. This is a canonical message projection, not
raw provider HTTP data. Missing usage and costs are never inferred. Inputs and
outputs retain the newest 128 messages, 8192 UTF-8 bytes per text/arguments field,
and 32768 serialized message bytes per side; truncation is marked and oversized
argument objects become `{"truncated":true}`. Failed or cancelled calls can
remain incomplete without invented output. Enabling capture does not enrich
historical observations. Revocation suppresses queued model bodies.

The plugin uses only public contracts; it never reads internal databases,
Inspector files or Codex transcripts. **Capture tool content** separately opts
into tool-node inputs and outputs. Each value is truncated at 8192 characters;
local pending telemetry may include captured content.

**Capture chat messages** is a separate default-off switch. When explicitly
saved as enabled, Runtime supplies current-execution authored user text and visible
assistant replies at Stop. The plugin writes these to the Agent root's input and
output, following [Langfuse's root observation mapping](https://langfuse.com/faq/all/empty-trace-input-and-output).
It excludes history, system prompts, reasoning, attachments and internal/plugin
messages. Approval resumes expose only their new assistant segment. Text is
limited to 32 messages, 8192 UTF-8 bytes per message and 32768 text bytes total;
truncation is marked. Pending records can contain the captured messages. Existing
tool-content settings do not enable message capture, and old records are not
enriched retroactively. Turning message capture off suppresses queued bodies.

Uploads use Langfuse's supported
[OTLP HTTP/JSON endpoint](https://langfuse.com/integrations/native/opentelemetry)
with Basic project authentication and ingestion version 4. There are no npm runtime
dependencies and no install hook, daemon, MCP server or host-access exemption.
Normal OpenAgent process and network permissions apply. Allow the configured
Langfuse host in the active permission profile; enabling this plugin does not
broaden that profile.

Hooks record locally and upload at Stop. Failed uploads retain records and retry
on a later Stop or explicit retry. Uploads time out after four seconds, never
follow redirects, and only acknowledge complete acceptance. IDs are deterministic
so retries refer to the same spans. Hooks print no stdout and cannot add model
context or prevent Runtime finalization. Disabling upload prevents both recording
and sending pending telemetry. Turning off content capture also suppresses content
from previously queued records during export.

Package data uses version 1 records under `PLUGIN_DATA/executions`. Atomic writes
and cross-process locks protect parallel executions; at most 128 records and 1000
events per execution are retained. Delivered receipts are compacted; an
eligible receipt makes room for a new execution. Unsent records are never silently
evicted. A full queue skips new telemetry with `storage_limit`; clear only reviewed
task-owned records or upload the backlog. A crashed process lock expires after
30 seconds. Queued records survive updates and uninstall. Configuration changes
apply to subsequent hooks and pending uploads, so flush the queue before switching
Langfuse projects.
Pending records from 0.2.0 keep their original trace/session IDs and mark context
identity as `legacy_unknown`; the plugin cannot infer their historical stage.

## 中文使用说明

在插件目录中安装 Langfuse，或安装 GitHub Release 中的压缩包；开发时可从本地目录
安装 `plugins/langfuse`，并使用刷新按钮同步源码。在插件配置中填写 Langfuse
项目公钥、密钥和服务地址，再开启上传。默认关闭上传、聊天消息、模型调用和工具内容采集。
`/langfuse:status` 查看状态，`/langfuse:test` 发送连接测试，`/langfuse:retry`
重试失败记录。开启独立的“采集模型调用内容”后，每个 Model call 记录该次输入消息、
工具调用与结果、输出、模型名称和实际 token 用量。系统提示词、推理和附件不采集；
超长内容明确标记截断，未完成调用不填造输出，旧记录不会补采。
开启“采集工具内容”后，工具输入输出会写入本地待上传队列并发送到 Langfuse。
开启独立的“采集聊天消息”后，当前轮用户文本与可见助手回复会写入 Agent 根观测的
输入和输出。不包含历史上下文、系统提示词、推理或附件；旧记录不会补采。
升级需同时使用支持新能力的 Runtime 并刷新本地来源或重新安装 0.4.0 插件，原有密钥配置保留。
网络权限仍由 OpenAgent 控制；切换 Langfuse 项目前请先处理待上传队列。
同一分支与同一上下文阶段共用 session；压缩成功后创建新 session，并通过
`previous_session_id` 关联前一阶段。续聊、重试、审批恢复和重启保持 session；
分支和子会话独立归属。执行中压缩会拆成前后两条 trace，保留相同 execution ID。

## Verification

From the host checkout:

```sh
bun plugins/openagent-plugin-kit/scripts/validate-plugin.mjs plugins/langfuse --require-i18n --locales=en,zh
bun test plugins/langfuse/tests
bun plugins/langfuse/scripts/verify-runtime.mjs
```

The Runtime verifier uses the source-prepared server, a fresh isolated home,
fake credentials and loopback model/OTLP endpoints. It exercises installation,
saved configuration, real model/tool hooks, upload failure/retry, message capture
opt-in, per-model input/output and tool-round identity, revocation and ordinary-hook
isolation, plus disablement.
Reports stay under the system temporary directory.

To qualify an actual project, provide `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`
and `LANGFUSE_BASE_URL` only to the verifier process, then run
`bun plugins/langfuse/scripts/verify-runtime.mjs --live`. This writes ten fixture
executions into that project: content opt-out, message capture enabled, and
message capture revoked, failed/successful compaction, restoration, provider-limit
recovery across two context traces, a fork, switching back to the original branch, and per-model content capture.
It reads trace sessions back, checks the previous-session link and polls
the observations API to verify Agent/generation/
tool hierarchy and the root's authored input/visible reply. If the deployment does
not expose observations v2, select `--read-api=v1`. The production plugin still
uses private settings bindings, never these ambient variables. The verifier
removes its isolated credential settings and redacts its retained evidence.

For native settings qualification, launch a source-prepared Tauri instance with
a fresh temporary home containing `openagent-langfuse-native-` in its path. Set
`OPENAGENT_HOME`, that instance's explicit `TAURI_PILOT_SOCKET`, and its main HWND
in `BLACKBOX_NATIVE_WINDOW_HANDLE`, then run:

```sh
bun plugins/langfuse/scripts/verify-native.mjs
```

This runs the committed settings scenario in light/dark and English/Chinese,
saves and reopens parameters, verifies secret redaction/preservation/clearing,
captures native windows and removes only its fixture package.

Tests exercise mock OTLP ingestion, process hooks, concurrent writes, retries,
deduplication, cancellation, configuration and privacy boundaries. A real project
is qualified separately with `/langfuse:test` and a tool-using conversation.
