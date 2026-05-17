import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'DeepSeek request failed',
          status: response.status,
          details: data,
        },
        { status: response.status },
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
