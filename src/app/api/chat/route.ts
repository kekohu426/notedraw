import { type UIMessage, convertToModelMessages, streamText } from 'ai';
import { type NextRequest, NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/api-protection';
import { apiCreditsConfig } from '@/config/api-credits';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // API Protection: Check authentication, rate limits, and consume credits
  const { error: protectionError, session } = await protectApiRoute(
    req,
    apiCreditsConfig.chat,
    'Chat message'
  );

  if (protectionError) {
    return protectionError;
  }

  const {
    messages,
    model,
    webSearch,
  }: { messages: UIMessage[]; model: string; webSearch: boolean } =
    await req.json();

  const result = streamText({
    model: webSearch ? 'perplexity/sonar' : model,
    messages: convertToModelMessages(messages),
    system:
      'You are a helpful assistant that can answer questions and help with tasks',
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
