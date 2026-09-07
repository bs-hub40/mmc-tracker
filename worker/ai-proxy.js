import {
  ACTIVITY_SYSTEM_PROMPT,
  LOG_SYSTEM_PROMPT,
  MEAL_SYSTEM_PROMPT,
  USER_PREFIX,
} from "./prompts.js";

const TASKS = {
  log: LOG_SYSTEM_PROMPT,
  meal: MEAL_SYSTEM_PROMPT,
  activity: ACTIVITY_SYSTEM_PROMPT,
};

function allowedOrigins(env) {
  const raw =
    env.ALLOWED_ORIGINS ||
    "https://bs-hub40.github.io,http://127.0.0.1:5500,http://localhost:5500";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function requestOrigin(request) {
  return request.headers.get("Origin") || "";
}

function corsHeaders(env, request) {
  const origin = requestOrigin(request);
  const allowed = allowedOrigins(env);
  const ok = allowed.includes(origin) ? origin : allowed[0] || "";
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(env, request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(env, request),
    },
  });
}

function originAllowed(env, request) {
  const origin = requestOrigin(request);
  return allowedOrigins(env).includes(origin);
}

function extractJson(text) {
  const trimmed = String(text || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}

function withContext(context, body) {
  const reset =
    "Standalone request. Do not use prior conversation, chat memory, or remembered facts about this user. Use only this message.";
  const ctx = String(context || "").trim();
  return ctx ? `${reset}\n\n${ctx}\n\n${body}` : `${reset}\n\n${body}`;
}

async function readError(response) {
  try {
    const err = await response.json();
    return err?.error?.message || JSON.stringify(err);
  } catch {
    return await response.text();
  }
}

async function callOpenAICompatible({ endpoint, apiKey, model, system, user, label }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error((await readError(response)) || `${label} API error (${response.status})`);
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Empty response from ${label}`);
  return extractJson(content);
}

async function callAnthropic({ apiKey, model, system, user }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature: 0.2,
      system: `${system}\n\nReturn ONLY valid JSON. No markdown.`,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!response.ok) {
    throw new Error((await readError(response)) || `Claude API error (${response.status})`);
  }
  const payload = await response.json();
  const content = payload?.content?.map((p) => p.text || "").join("\n");
  if (!content) throw new Error("Empty response from Claude");
  return extractJson(content);
}

async function callGemini({ apiKey, model, system, user }) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${system}\n\nReturn ONLY valid JSON. No markdown.` }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!response.ok) {
    throw new Error((await readError(response)) || `Gemini API error (${response.status})`);
  }
  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("\n");
  if (!content) throw new Error("Empty response from Gemini");
  return extractJson(content);
}

async function callProvider(env, system, user) {
  const apiKey = String(env.AI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Hosted AI is not configured.");
  const provider = String(env.AI_PROVIDER || "gemini").trim().toLowerCase();
  const model = String(env.AI_MODEL || "").trim();

  if (provider === "anthropic") {
    return callAnthropic({
      apiKey,
      model: model || "claude-sonnet-5",
      system,
      user,
    });
  }
  if (provider === "openai") {
    return callOpenAICompatible({
      endpoint: "https://api.openai.com/v1/chat/completions",
      apiKey,
      model: model || "gpt-4o-mini",
      system,
      user,
      label: "ChatGPT",
    });
  }
  if (provider === "xai") {
    return callOpenAICompatible({
      endpoint: "https://api.x.ai/v1/chat/completions",
      apiKey,
      model: model || "grok-4.6",
      system,
      user,
      label: "Grok",
    });
  }
  return callGemini({
    apiKey,
    model: model || "gemini-3.6-flash",
    system,
    user,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json(env, request, { ok: true });
    }

    if (request.method !== "POST" || url.pathname !== "/parse") {
      return json(env, request, { error: "Not found" }, 404);
    }

    if (!originAllowed(env, request)) {
      return json(env, request, { error: "Origin not allowed" }, 403);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json(env, request, { error: "Invalid JSON" }, 400);
    }

    const task = String(body?.task || "").trim();
    const system = TASKS[task];
    const text = String(body?.text || "").trim();
    if (!system) return json(env, request, { error: "Unknown task" }, 400);
    if (!text) return json(env, request, { error: "Describe food or activity." }, 400);
    if (text.length > 8000) return json(env, request, { error: "That log is too long." }, 400);

    const context = String(body?.context || "").slice(0, 2500);
    const user = withContext(context, `${USER_PREFIX[task]}${text}`);

    try {
      const parsed = await callProvider(env, system, user);
      return json(env, request, parsed);
    } catch (err) {
      return json(env, request, { error: err.message || "AI request failed." }, 502);
    }
  },
};
