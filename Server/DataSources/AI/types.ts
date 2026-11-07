export type TextChatOptions = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
};

/** The chat completions reply, which Groq's OpenAI-compatible endpoint shares. */
export interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string; code?: string; type?: string };
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string; status?: string; code?: number };
}
