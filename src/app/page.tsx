"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SWATCHES = ["#111827", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];
const BRUSH_SIZES = [4, 8, 14, 22];

type GuessItem = {
  text: string;
  timestamp: string;
};

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSubmittingRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [brushColor, setBrushColor] = useState(SWATCHES[0]);
  const [guesses, setGuesses] = useState<GuessItem[]>([]);
  const [status, setStatus] = useState("准备绘画");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hintList = useMemo(
    () => ["动物", "食物", "建筑", "交通工具", "天气", "乐器"],
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineCap = "round";
    context.lineJoin = "round";

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(ratio, ratio);
      context.fillStyle = "#fef3c7";
      context.fillRect(0, 0, rect.width, rect.height);
    };

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);
    resizeCanvas();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.strokeStyle = brushColor;
    context.lineWidth = brushSize;
  }, [brushColor, brushSize]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = getCanvasPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    context.fillStyle = "#fef3c7";
    context.fillRect(0, 0, rect.width, rect.height);
    setStatus("画布已清空");
  };

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setStatus("AI 正在猜测...");

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];

    try {
      const response = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "AI 请求失败");
      }
      const guessText = payload.reason
        ? `猜测：${payload.answer}（${payload.reason}）`
        : payload.answer
          ? `猜测：${payload.answer}`
          : payload.guess;
      setGuesses((prev) => [
        {
          text: guessText,
          timestamp: formatTimestamp(new Date()),
        },
        ...prev,
      ]);
      setStatus("AI 猜测完成");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 请求失败";
      setStatus(message);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.2),_transparent_50%)]" />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.28em] text-amber-700">
            AI 你画我猜
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-slate-900 md:text-5xl">
                把灵感画出来，让 AI 猜一猜
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-700">
                在画布上创作，Gemini 将实时给出猜测。可以尝试不同主题：
                {" "}
                {hintList.join("、")}。
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white/70 px-5 py-4 text-sm text-slate-700 shadow-sm backdrop-blur">
              <p className="font-semibold text-slate-900">状态</p>
              <p className="mt-2">{status}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl border border-amber-200 bg-white/80 p-6 shadow-xl shadow-amber-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">画布</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  清空画布
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSubmitting ? "AI 猜测中..." : "发送给 AI"}
                </button>
              </div>
            </div>

            <div
              ref={containerRef}
              className="mt-6 h-[360px] w-full max-w-[640px] rounded-3xl border-2 border-dashed border-amber-200 bg-amber-100 md:h-[420px]"
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="h-full w-full rounded-3xl"
              />
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">画笔颜色</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBrushColor(color)}
                      className={`h-9 w-9 rounded-full border-2 transition ${
                        brushColor === color
                          ? "border-slate-900 ring-2 ring-slate-200"
                          : "border-white"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`颜色 ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">画笔粗细</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {BRUSH_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setBrushSize(size)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        brushSize === size
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-3xl border border-amber-200 bg-white/80 p-6 shadow-xl shadow-amber-100">
              <h2 className="text-lg font-semibold text-slate-900">AI 猜测记录</h2>
              <p className="mt-2 text-sm text-slate-600">
                每次发送后，AI 会给出一个猜测与一句简短理由。
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {guesses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-sm text-slate-600">
                    暂无猜测，先画点什么吧。
                  </div>
                ) : (
                  guesses.map((item, index) => (
                    <div
                      key={`${item.timestamp}-${index}`}
                      className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                    >
                      <p className="text-sm text-slate-500">{item.timestamp}</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {item.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-900 px-6 py-5 text-sm text-slate-100 shadow-lg">
              <p className="text-lg font-semibold">小提示</p>
              <ul className="mt-3 space-y-2 text-slate-200">
                <li>• 尽量用大轮廓与明显特征。</li>
                <li>• 可以先画主形，再补充细节。</li>
                <li>• 每次发送前清晰一下画面。</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
