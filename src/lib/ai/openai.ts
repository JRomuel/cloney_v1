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

/**
 * TEMPORARY: Generate dummy response for testing without OpenAI
 */
function getDummyResponse(options: CompletionOptions): string {
  const systemPrompt = options.systemPrompt?.toLowerCase() || '';
  const prompt = options.prompt.toLowerCase();

  // Check if this is a theme/branding related request
  if (systemPrompt.includes('theme') || systemPrompt.includes('color') || systemPrompt.includes('brand') || prompt.includes('theme')) {
    return JSON.stringify({
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937'
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Open Sans'
      },
      brandName: 'Test Store',
      layout: {
        style: 'modern'
      }
    });
  }

  // Check if this is a product related request
  if (systemPrompt.includes('product') || prompt.includes('product')) {
    return JSON.stringify({
      products: [
        {
          title: 'Sample Product 1',
          description: 'This is a test product description for development purposes. Great quality and excellent value.',
          price: 29.99,
          compareAtPrice: 39.99,
          tags: ['test', 'sample'],
          vendor: 'Test Vendor',
          productType: 'General'
        },
        {
          title: 'Premium Item 2',
          description: 'Another fantastic test product with amazing features. Perfect for testing your store.',
          price: 49.99,
          compareAtPrice: 69.99,
          tags: ['premium', 'featured'],
          vendor: 'Test Vendor',
          productType: 'Premium'
        },
        {
          title: 'Budget Option 3',
          description: 'An affordable test product for budget-conscious customers. Great starter item.',
          price: 14.99,
          compareAtPrice: 19.99,
          tags: ['budget', 'sale'],
          vendor: 'Test Vendor',
          productType: 'Budget'
        },
        {
          title: 'Deluxe Product 4',
          description: 'Our deluxe test product with all the bells and whistles. Top of the line quality.',
          price: 99.99,
          compareAtPrice: 129.99,
          tags: ['deluxe', 'featured'],
          vendor: 'Test Vendor',
          productType: 'Deluxe'
        }
      ]
    });
  }

  // Default generic response
  return JSON.stringify({
    success: true,
    message: 'Dummy response for testing',
    data: {}
  });
}

export async function createCompletion(options: CompletionOptions): Promise<string> {
  // TEMPORARY: Return dummy data for testing
  if (process.env.USE_DUMMY_AI === 'true') {
    return getDummyResponse(options);
  }

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
