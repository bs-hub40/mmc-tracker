window.MMC = window.MMC || {};

(() => {
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

  function providerConfig(providerId) {
    return (
      window.MMC.AI_PROVIDERS[providerId] || window.MMC.AI_PROVIDERS.xai
    );
  }

  function validateKey(providerId, apiKey) {
    const cfg = providerConfig(providerId);
    if (!apiKey) {
      throw new Error(`Add a ${cfg.label} API key in Settings.`);
    }
    if (cfg.keyPrefix && !apiKey.startsWith(cfg.keyPrefix)) {
      throw new Error(
        `${cfg.label} API key should start with ${cfg.keyPrefix}`
      );
    }
  }

  function resolveModel(providerId, model) {
    const cfg = providerConfig(providerId);
    const allowed = new Set(cfg.models.map((m) => m.id));
    if (allowed.has(model)) return model;
    return cfg.defaultModel;
  }

  async function callOpenAICompatible({
    endpoint,
    apiKey,
    model,
    system,
    user,
    providerLabel,
  }) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      let detail = "";
      try {
        const err = await response.json();
        detail = err?.error?.message || JSON.stringify(err);
      } catch {
        detail = await response.text();
      }
      throw new Error(detail || `${providerLabel} API error (${response.status})`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error(`Empty response from ${providerLabel}`);
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
        max_tokens: 4096,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      let detail = "";
      try {
        const err = await response.json();
        detail = err?.error?.message || JSON.stringify(err);
      } catch {
        detail = await response.text();
      }
      throw new Error(detail || `Claude API error (${response.status})`);
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
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      let detail = "";
      try {
        const err = await response.json();
        detail = err?.error?.message || JSON.stringify(err);
      } catch {
        detail = await response.text();
      }
      throw new Error(detail || `Gemini API error (${response.status})`);
    }

    const payload = await response.json();
    const content = payload?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("\n");
    if (!content) throw new Error("Empty response from Gemini");
    return extractJson(content);
  }

  async function callLlm({ provider, apiKey, model, system, user }) {
    const providerId = provider || "xai";
    const cfg = providerConfig(providerId);
    validateKey(providerId, apiKey);
    const resolvedModel = resolveModel(providerId, model);

    if (providerId === "anthropic") {
      return callAnthropic({
        apiKey,
        model: resolvedModel,
        system: `${system}\n\nReturn ONLY valid JSON. No markdown.`,
        user,
      });
    }

    if (providerId === "gemini") {
      return callGemini({
        apiKey,
        model: resolvedModel,
        system: `${system}\n\nReturn ONLY valid JSON. No markdown.`,
        user,
      });
    }

    const endpoint =
      providerId === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : "https://api.x.ai/v1/chat/completions";

    return callOpenAICompatible({
      endpoint,
      apiKey,
      model: resolvedModel,
      system,
      user,
      providerLabel: cfg.label,
    });
  }

  function normalizeMealPayload(data) {
    if (!data || !Array.isArray(data.items)) {
      throw new Error("JSON missing items array");
    }

    const items = data.items.map((item) => ({
      name: String(item.name || "Item").trim() || "Item",
      calories: Number(item.calories) || 0,
      protein: Number(item.protein) || 0,
      fat: Number(item.fat) || 0,
      carbs: Number(item.carbs) || 0,
      fiber: Number(item.fiber) || 0,
    }));

    const sum = items.reduce(
      (acc, item) => {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.fat += item.fat;
        acc.carbs += item.carbs;
        acc.fiber += item.fiber;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
    );

    return {
      items,
      totalCalories: Number(data.totalCalories ?? sum.calories) || sum.calories,
      totalProtein: Number(data.totalProtein ?? sum.protein) || sum.protein,
      totalFat: Number(data.totalFat ?? sum.fat) || sum.fat,
      totalCarbs: Number(data.totalCarbs ?? sum.carbs) || sum.carbs,
      totalFiber: Number(data.totalFiber ?? sum.fiber) || sum.fiber,
    };
  }

  function normalizeActivityPayload(data) {
    if (!data || !Array.isArray(data.items)) {
      throw new Error("JSON missing activity items array");
    }

    const items = data.items.map((item) => ({
      name: String(item.name || "Activity").trim() || "Activity",
      durationMin: Number(item.durationMin) || 0,
      caloriesBurned: Number(item.caloriesBurned) || 0,
      intensity: ["low", "moderate", "high"].includes(item.intensity)
        ? item.intensity
        : "moderate",
    }));

    const sum = items.reduce((acc, item) => acc + item.caloriesBurned, 0);

    return {
      items,
      totalCaloriesBurned: Number(data.totalCaloriesBurned ?? sum) || sum,
      summary: String(data.summary || "").trim(),
    };
  }

  window.MMC.resolveAiModel = resolveModel;
  window.MMC.getProviderConfig = providerConfig;

  window.MMC.parseMealWithGrok = async function parseMealWithGrok(opts) {
    const data = await callLlm({
      provider: opts.provider,
      apiKey: opts.apiKey,
      model: opts.model,
      system: window.MMC.SYSTEM_PROMPT,
      user: `Parse this meal into JSON macros:\n\n${opts.text}`,
    });
    return normalizeMealPayload(data);
  };

  window.MMC.parseActivityWithGrok = async function parseActivityWithGrok(opts) {
    const data = await callLlm({
      provider: opts.provider,
      apiKey: opts.apiKey,
      model: opts.model,
      system: window.MMC.ACTIVITY_SYSTEM_PROMPT,
      user: `Parse this completed activity into JSON calorie burn estimates:\n\n${opts.text}`,
    });
    return normalizeActivityPayload(data);
  };
})();
