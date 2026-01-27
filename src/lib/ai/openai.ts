import OpenAI from 'openai';
import { AIGenerationError } from '@/errors';
import { withRetry, withTimeout } from '@/lib/utils/retry';

// Timeout for OpenAI API calls (60 seconds)
const OPENAI_TIMEOUT_MS = 60000;

let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIGenerationError('OPENAI_API_KEY is not configured');
    }

    openaiInstance = new OpenAI({
      apiKey,
    });
  }

  return openaiInstance;
}

export interface CompletionOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export async function createCompletion(options: CompletionOptions): Promise<string> {
  const {
    prompt,
    systemPrompt,
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 4096,
    responseFormat = 'text',
  } = options;

  const client = getOpenAIClient();

  // Wrap with timeout to prevent indefinite hangs, then retry on transient failures
  return withTimeout(
    () => withRetry(async () => {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: responseFormat === 'json' ? { type: 'json_object' } : undefined,
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new AIGenerationError('Empty response from OpenAI');
      }

      return content;
    }),
    OPENAI_TIMEOUT_MS,
    `OpenAI request timed out after ${OPENAI_TIMEOUT_MS / 1000} seconds`
  );
}

export async function createJSONCompletion<T>(
  options: Omit<CompletionOptions, 'responseFormat'>
): Promise<T> {
  const response = await createCompletion({
    ...options,
    responseFormat: 'json',
  });

  try {
    return JSON.parse(response) as T;
  } catch {
    throw new AIGenerationError(`Failed to parse OpenAI response as JSON: ${response.substring(0, 200)}`);
  }
}
