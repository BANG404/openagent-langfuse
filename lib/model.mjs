// Keep the public model projection separate from current-turn chat observations.
export function sanitizeModel(observation) {
  if (observation?.version !== 1 || !Array.isArray(observation.messages)) return;
  let truncated = observation.truncated === true;
  let remaining = 32768;
  const clip = value => {
    const bytes = Buffer.from(value, 'utf8');
    let end = Math.min(bytes.length, 8192);
    while (end > 0 && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    truncated ||= end < bytes.length;
    return bytes.subarray(0, end).toString('utf8');
  };
  const messages = [];
  for (const message of observation.messages.slice(-128).reverse()) {
    if (!['user', 'assistant', 'tool'].includes(message?.role) || typeof message.content !== 'string') continue;
    const selected = { role: message.role, content: clip(message.content) };
    if (message.role === 'tool' && typeof message.tool_call_id === 'string') selected.tool_call_id = message.tool_call_id.slice(0, 256);
    if (message.role === 'assistant' && Array.isArray(message.tool_calls)) {
      selected.tool_calls = message.tool_calls.slice(0, 32).filter(call => typeof call?.id === 'string' && typeof call.function?.name === 'string' && typeof call.function?.arguments === 'string').map(call => {
        const oversized = Buffer.byteLength(call.function.arguments) > 8192;
        truncated ||= oversized;
        return { id: call.id.slice(0, 256), type: 'function', function: { name: call.function.name.slice(0, 256), arguments: oversized ? JSON.stringify({ truncated: true }) : call.function.arguments } };
      });
    }
    const size = Buffer.byteLength(JSON.stringify(selected));
    if (size > remaining) { truncated = true; continue; }
    remaining -= size;
    messages.push(selected);
  }
  const result = { version: 1, messages: messages.reverse(), truncated: truncated || observation.messages.length > 128 };
  for (const key of ['model', 'provider']) if (typeof observation[key] === 'string') result[key] = observation[key].slice(0, 256);
  if (observation.usage && typeof observation.usage === 'object') {
    const usage = {};
    for (const key of ['input_tokens', 'output_tokens', 'total_tokens', 'cached_input_tokens', 'cache_creation_input_tokens', 'reasoning_tokens']) {
      const value = observation.usage[key];
      if (Number.isSafeInteger(value) && value >= 0) usage[key] = value;
    }
    if (Object.keys(usage).length) result.usage = usage;
  }
  return result;
}

export function modelAttributes(start, end, state, config) {
  if (!state.captureModelContent || !config.captureModelContent) return {};
  const before = start?.modelObservation;
  const after = end?.modelObservation;
  const value = after ?? before;
  if (!value) return {};
  const usage = value.usage;
  return {
    ...(before ? { 'langfuse.observation.input': JSON.stringify(before.messages) } : {}),
    ...(after ? { 'langfuse.observation.output': JSON.stringify(after.messages) } : {}),
    'langfuse.observation.model.name': value.model,
    'langfuse.observation.metadata.provider': value.provider,
    'langfuse.observation.metadata.content_scope': 'non-system-text-messages-v1',
    'langfuse.observation.metadata.content_truncated': String(before?.truncated === true || after?.truncated === true),
    ...(usage ? { 'langfuse.observation.usage_details': JSON.stringify({ input: usage.input_tokens, output: usage.output_tokens, total: usage.total_tokens, input_cached: usage.cached_input_tokens, input_cache_creation: usage.cache_creation_input_tokens, output_reasoning: usage.reasoning_tokens }) } : {}),
  };
}
