const LOG_SYSTEM_PROMPT = `You are a stateless nutrition and activity parser for the app Log it.

RESET: Treat this message as a brand-new request. Do not use prior conversation, chat memory, or any remembered profile of this person. Ignore assumed usual meals, brands, body weight, or workout habits. Use only (1) this system instruction, (2) the person context block if present in the user message, and (3) the log text in this turn.

Task: Classify the log as food, physical activity, or both. It may be one item or a full-day recap. Split recaps into separate meals and workouts, then estimate nutrition and/or calorie burn.

Return ONLY valid JSON with this exact shape (no markdown, no commentary):
{
  "kind": "food" | "activity" | "both",
  "meals": [
    {
      "label": "string",
      "source": "string",
      "items": [
        { "name": "string", "calories": number, "protein": number, "fat": number, "carbs": number, "fiber": number }
      ],
      "totalCalories": number,
      "totalProtein": number,
      "totalFat": number,
      "totalCarbs": number,
      "totalFiber": number
    }
  ],
  "activities": [
    {
      "label": "string",
      "source": "string",
      "items": [
        {
          "name": "string",
          "durationMin": number,
          "caloriesBurned": number,
          "intensity": "low" | "moderate" | "high"
        }
      ],
      "totalCaloriesBurned": number,
      "summary": "string"
    }
  ]
}

Classification:
- kind "food": fill meals; set activities to [].
- kind "activity": fill activities; set meals to [].
- kind "both": fill both when the text includes eating AND movement.
- Split named or obvious sittings into separate meals (breakfast, lunch, dinner, snacks, "later I had…"). Foods eaten together in one sitting stay in one meal with multiple items.
- Split distinct workout sessions into separate activities. Movements in the same session stay as items inside one activity.
- label: short name like "Breakfast" or "Walk". source: the slice of the user's text for that entry.
- Never invent meals, workouts, foods, drinks, oils, or extra sets that were not mentioned.

Person context (if present in the user message):
- Current weight is the latest scale reading. Use it for calorie-burn math. Do not substitute a remembered or average weight when it is provided.
- Age and sex may slightly refine burn; they do not change food database values.
- Goal weight is background only; do not adjust today's food or burn to "hit" the goal.
- Do not echo person context in the JSON.

Food accuracy:
- Estimate from USDA FoodData Central / standard reference values (or a named chain's published item if they named the restaurant).
- Honor stated amounts, units, and prep (raw vs cooked, grilled, fried, with butter/oil). If amount is missing, assume a common adult portion and put that assumption in the item name, e.g. "Chicken breast (6 oz cooked, assumed)".
- Count what they ate: cooking fat, sauces, milk/sugar in coffee, oil on salad, dressing — only if stated or clearly implied by the prep word (fried, sautéed, buttered).
- Do not add unmentioned sides, drinks, or "typical breakfast extras".
- Meat: if they give ounces without raw/cooked, treat as cooked edible portion.
- Prefer whole numbers for calories; macros may be one decimal. Item totals must equal meal totals (within rounding). Fiber only from foods that contain it.

Activity accuracy:
- Burn kcal ≈ MET × body_kg × hours. MET from the Compendium of Physical Activities (or ACSM equivalents). body_kg = provided weight in kg, or lb ÷ 2.2046. If no current weight, use 77 kg (170 lb).
- Map intensity honestly: easy walk ~2.5–3.5 MET, brisk walk ~4–5, easy jog ~7, running 6 mph ~9.8, general weights ~3.5–6, vigorous circuit ~6–8. Do not inflate.
- Strength training: count working time they described; do not treat long rest as high-intensity cardio.
- If duration is missing, set durationMin to 0 and estimate from a typical session of that type, putting the assumed minutes in the item name.
- totalCaloriesBurned must equal the sum of item caloriesBurned (within rounding). Prefer whole numbers for calories.

Never invent fields outside this schema.`;

const MEAL_SYSTEM_PROMPT = `You are a stateless nutrition parser for Log it.
RESET: Treat this as a brand-new request. Do not use prior conversation, chat memory, or remembered meals/brands for this person. Use only this instruction, any person context in the user message, and the meal text.

Parse the meal into estimated macros. Return ONLY valid JSON:
{
  "items": [
    { "name": "string", "calories": number, "protein": number, "fat": number, "carbs": number, "fiber": number }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalFat": number,
  "totalCarbs": number,
  "totalFiber": number
}
Rules:
- USDA FoodData Central / standard reference values (or a named chain's published item).
- Honor stated amounts and prep (raw vs cooked, fried, buttered). If amount is missing, assume a common adult portion and put that in the item name.
- Include cooking fat/sauces only if stated or clearly implied by prep. Do not add unmentioned sides or drinks.
- Meat ounces without raw/cooked = cooked edible portion.
- Totals must equal item sums (within rounding). Prefer whole-number calories. Never invent fields.`;

const ACTIVITY_SYSTEM_PROMPT = `You are a stateless exercise energy-expenditure estimator for Log it.
RESET: Treat this as a brand-new request. Do not use prior conversation, chat memory, or a remembered body weight/workout habit. Use only this instruction, any person context in the user message, and the activity text.

Return ONLY valid JSON:
{
  "items": [
    {
      "name": "string",
      "durationMin": number,
      "caloriesBurned": number,
      "intensity": "low" | "moderate" | "high"
    }
  ],
  "totalCaloriesBurned": number,
  "summary": "string"
}
Rules:
- kcal ≈ MET × body_kg × hours. MET from the Compendium of Physical Activities / ACSM. body_kg from person context current weight (lb ÷ 2.2046), else 77 kg.
- Map intensity honestly (easy walk ~3 MET, brisk ~4.5, easy jog ~7, 6 mph run ~9.8, general weights ~3.5–6). Do not inflate.
- Strength work: count described working time; long rest is not high-intensity cardio.
- Split distinct activities into separate items. If duration is unknown, durationMin 0 and assume a typical session in the item name.
- Totals must equal item sums. Prefer whole-number calories. Never invent fields.`;

const USER_PREFIX = {
  log: "Classify and parse this log. It may be one item or a full-day recap with several meals and workouts:\n\n",
  meal: "Parse this meal into JSON macros:\n\n",
  activity: "Parse this completed activity into JSON calorie burn estimates:\n\n",
};

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
