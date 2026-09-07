window.MMC = window.MMC || {};

Object.assign(window.MMC, {
  AI_PROVIDERS: {
    xai: {
      id: "xai",
      label: "Grok (xAI)",
      keyHint: "Starts with xai-",
      keyPrefix: "xai-",
      keyUrl: "https://console.x.ai/",
      keyUrlLabel: "console.x.ai",
      defaultModel: "grok-4.6",
      models: [
        { id: "grok-4.6", label: "grok-4.6 (recommended)" },
        { id: "grok-4.5", label: "grok-4.5" },
        { id: "grok-4.3", label: "grok-4.3" },
        { id: "grok-4", label: "grok-4" },
      ],
    },
    openai: {
      id: "openai",
      label: "ChatGPT (OpenAI)",
      keyHint: "Starts with sk-",
      keyPrefix: "sk-",
      keyUrl: "https://platform.openai.com/api-keys",
      keyUrlLabel: "platform.openai.com",
      defaultModel: "gpt-5.6-terra",
      models: [
        { id: "gpt-5.6-sol", label: "gpt-5.6-sol (flagship)" },
        { id: "gpt-5.6-terra", label: "gpt-5.6-terra (balanced)" },
        { id: "gpt-5.6-luna", label: "gpt-5.6-luna (fast/cheap)" },
        { id: "gpt-4o", label: "gpt-4o" },
        { id: "gpt-4o-mini", label: "gpt-4o-mini" },
      ],
    },
    anthropic: {
      id: "anthropic",
      label: "Claude (Anthropic)",
      keyHint: "Starts with sk-ant-",
      keyPrefix: "sk-ant-",
      keyUrl: "https://console.anthropic.com/settings/keys",
      keyUrlLabel: "console.anthropic.com",
      defaultModel: "claude-sonnet-5",
      models: [
        { id: "claude-sonnet-5", label: "claude-sonnet-5 (recommended)" },
        { id: "claude-opus-4-8", label: "claude-opus-4-8" },
        { id: "claude-fable-5", label: "claude-fable-5" },
        { id: "claude-haiku-4-5", label: "claude-haiku-4-5" },
      ],
    },
  },
});
