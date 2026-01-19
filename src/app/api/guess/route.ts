import { NextResponse } from "next/server";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) {
      return NextResponse.json(
        { error: "缺少 imageBase64" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "缺少 GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "你是你画我猜的AI评委。请根据图片给出最可能的猜测，必须包含一句理由，使用中文回答，格式：猜测：<答案>（<一句理由>）。",
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 120,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: "Gemini 请求失败", detail: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();
    const guess = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text)
      .filter(Boolean)
      .join("")
      .trim();

    if (!guess) {
      return NextResponse.json(
        { error: "Gemini 未返回猜测" },
        { status: 500 }
      );
    }

    const normalizedGuess = guess.replace(/\s+/g, " ").trim();
    const normalizedWithClosing =
      /[（(]/.test(normalizedGuess) && !/[)）]$/.test(normalizedGuess)
        ? `${normalizedGuess}）`
        : normalizedGuess;
    const match = normalizedWithClosing.match(
      /(?:猜测[:：]\s*)?(.+?)(?:[（(](.+?)[)）])?$/
    );
    const answer = match?.[1]?.trim();
    const reason = match?.[2]?.trim();
    const fallbackReason = "图中线条呈现主体轮廓";
    const finalReason = reason || fallbackReason;
    const formattedGuess = answer
      ? `猜测：${answer}（${finalReason}）`
      : normalizedWithClosing;

    return NextResponse.json({
      guess: formattedGuess,
      answer: answer ?? "",
      reason: finalReason,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "服务异常", detail: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
