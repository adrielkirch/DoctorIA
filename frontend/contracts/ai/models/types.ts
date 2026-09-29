/**
 * Catálogo de modelos IA do Assistant (AiChat) — contrato canônico.
 *
 * Fonte de verdade única: consumido pelo frontend (`ModelSelector.vue`,
 * `useAiChatMessagesStore`) e, no backend real (`rp-doctoria-utils`), como
 * catálogo servido/validado pelas rotas do assistant.
 *
 * Identifiers and English display copy are defined together so every consumer
 * uses the same model catalog.
 */

export type AiModelTier = 'premium' | 'standard' | 'basic'

export interface AiModel {
  id: string
  provider: string
  name: string
  description: string
  tier: AiModelTier
}

/** Catálogo estático de modelos IA (16) da interface do Assistant. */
export const AI_MODELS: AiModel[] = [

  { id: 'gpt-5.6', provider: 'OpenAI', name: 'GPT-5.6', description: "OpenAI's most advanced multimodal model", tier: 'premium' },
  { id: 'gpt-5.1', provider: 'OpenAI', name: 'GPT-5.1', description: "OpenAI's balanced flagship for speed and reasoning", tier: 'premium' },
  { id: 'gpt-4o', provider: 'OpenAI', name: 'GPT-4o', description: "OpenAI's versatile multimodal model", tier: 'premium' },
  { id: 'gpt-4o-mini', provider: 'OpenAI', name: 'GPT-4o Mini', description: 'Optimized GPT-4o for simpler tasks', tier: 'standard' },


  { id: 'claude-opus-5', provider: 'Anthropic', name: 'Claude Opus 5', description: "Anthropic's most powerful model for complex tasks", tier: 'premium' },
  { id: 'claude-sonnet-4.5', provider: 'Anthropic', name: 'Claude Sonnet 4.5', description: 'Balanced Anthropic model with excellent reasoning', tier: 'premium' },
  { id: 'claude-haiku-4.5', provider: 'Anthropic', name: 'Claude Haiku 4.5', description: 'Fast Anthropic model for quick answers', tier: 'standard' },


  { id: 'gemini-3-pro', provider: 'Google', name: 'Gemini 3 Pro', description: "Google's most capable multimodal model", tier: 'premium' },
  { id: 'gemini-2.5-flash', provider: 'Google', name: 'Gemini 2.5 Flash', description: 'Optimized Gemini for speed and scale', tier: 'standard' },
  { id: 'gemini-2.0-flash', provider: 'Google', name: 'Gemini 2.0 Flash', description: 'Reliable Google model for general use', tier: 'standard' },


  { id: 'deepseek-v3', provider: 'DeepSeek', name: 'DeepSeek V3', description: 'Advanced DeepSeek chat model', tier: 'premium' },
  { id: 'deepseek-r1', provider: 'DeepSeek', name: 'DeepSeek R1', description: 'DeepSeek reasoning model for hard tasks', tier: 'premium' },
  { id: 'deepseek-coder', provider: 'DeepSeek', name: 'DeepSeek Coder', description: 'Specialized in programming and code', tier: 'standard' },


  { id: 'kimi-k2', provider: 'Moonshot AI', name: 'Kimi K2', description: "Moonshot AI's advanced multimodal model", tier: 'premium' },
  { id: 'kimi-latest', provider: 'Moonshot AI', name: 'Kimi Latest', description: 'Moonshot AI chat model', tier: 'standard' },
  { id: 'kimi-thinking', provider: 'Moonshot AI', name: 'Kimi Thinking', description: 'Kimi optimized for deep reasoning', tier: 'standard' },
]

export const DEFAULT_MODEL_ID = AI_MODELS[0]?.id ?? 'gpt-4o'
