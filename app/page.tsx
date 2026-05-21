'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Meta {
  title: string;
  url: string;
  kind: string;
  files: number;
  totalBytes: number;
  truncated: boolean;
}

const SAMPLES = [
  'github.com/vercel/next.js/pull/72000',
  'github.com/anthropics/anthropic-sdk-python',
  'github.com/sindresorhus/p-limit/blob/main/index.js',
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (outputRef.current && running) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, running]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!url.trim() || running) return;

    setError(null);
    setOutput('');
    setMeta(null);
    setStage(null);
    setElapsed(0);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const block of events) {
          const event = parseSse(block);
          if (!event) continue;
          if (event.event === 'status') setStage(event.data.stage);
          else if (event.event === 'meta') setMeta(event.data);
          else if (event.event === 'chunk')
            setOutput((prev) => prev + event.data.text);
          else if (event.event === 'error') setError(event.data.message);
          else if (event.event === 'done') setStage('done');
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setError(e.message ?? 'Request failed');
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function abort() {
    abortRef.current?.abort();
    setRunning(false);
    setStage(null);
  }

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-16">
        <Hero mounted={mounted} />

        <form
          onSubmit={handleSubmit}
          className={`mt-12 sm:mt-16 ${mounted ? 'animate-slide-up stagger-2' : 'opacity-0'}`}
        >
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-ash mb-3 block">
              Paste GitHub URL
            </span>
            <div className="glass-input flex flex-col sm:flex-row items-stretch">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="github.com/owner/repo  ·  /pull/123  ·  /blob/main/file.ts"
                disabled={running}
                className="flex-1 bg-transparent px-5 py-4 sm:py-5 text-base sm:text-lg outline-none placeholder:text-ash/50 font-mono text-bone"
                spellCheck={false}
                autoFocus
              />
              {!running ? (
                <button
                  type="submit"
                  className="glass-btn mx-3 my-3 px-8 py-3 text-sm font-semibold tracking-wide text-bone whitespace-nowrap"
                >
                  Review →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={abort}
                  className="mx-3 my-3 px-8 py-3 text-sm font-semibold tracking-wide whitespace-nowrap rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                >
                  Stop
                </button>
              )}
            </div>
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ash/60 mr-1">Try:</span>
            {SAMPLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => !running && setUrl(s)}
                className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-ash/70 hover:text-bone hover:border-accent/30 hover:bg-accent/[0.05] transition-all font-mono text-[11px]"
              >
                {s.replace('github.com/', '')}
              </button>
            ))}
          </div>
        </form>

        <div className={mounted ? 'animate-slide-up stagger-3' : 'opacity-0'}>
          <StatusBar
            running={running}
            stage={stage}
            elapsed={elapsed}
            meta={meta}
            error={error}
          />
        </div>

        <div className={mounted ? 'animate-slide-up stagger-4' : 'opacity-0'}>
          <Output output={output} running={running} outputRef={outputRef} />
        </div>

        <div className={mounted ? 'animate-slide-up stagger-5' : 'opacity-0'}>
          {!output && !running && !error && <Empty />}
        </div>
      </div>

      <Footer mounted={mounted} />
    </main>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSse(block: string): { event: string; data: any } | null {
  const lines = block.split('\n');
  let event = 'message';
  let dataLine = '';
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLine = line.slice(5).trim();
  }
  if (!dataLine) return null;
  try {
    return { event, data: JSON.parse(dataLine) };
  } catch {
    return null;
  }
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink/60 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
          <Logo />
          <span className="font-semibold text-base sm:text-lg tracking-tight text-bone group-hover:text-accent-light transition-colors">
            CodeReview
            <span className="text-ash/40 font-normal">.ai</span>
          </span>
        </a>
        <div className="hidden sm:flex items-center gap-5 text-xs text-ash/60">
          <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] font-mono text-[11px]">
            v0.1
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
            Online
          </span>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl bg-gradient-to-br from-accent to-indigo-500 text-white font-bold text-sm shadow-glow-sm">
      ⚡
    </div>
  );
}

function Hero({ mounted }: { mounted: boolean }) {
  return (
    <div className={mounted ? 'animate-slide-up stagger-1' : 'opacity-0'}>
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-accent/70 mb-4">
        AI-Powered Code Analysis
      </div>
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
        <span className="text-bone">Paste a repo.</span>
        <br />
        <span className="text-gradient">Get the verdict.</span>
      </h1>
      <p className="mt-5 text-ash text-base sm:text-lg max-w-xl leading-relaxed">
        Instant AI code review for any public GitHub URL. Security, performance,
        architecture — no login, no tracking. Streams in real-time.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {[
          { label: 'Repos', icon: '◆' },
          { label: 'Pull Requests', icon: '◆' },
          { label: 'Files & Dirs', icon: '◆' },
        ].map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-ash/60"
          >
            <span className="text-accent/50 text-[8px]">{item.icon}</span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusBar({
  running,
  stage,
  elapsed,
  meta,
  error,
}: {
  running: boolean;
  stage: string | null;
  elapsed: number;
  meta: Meta | null;
  error: string | null;
}) {
  if (!running && !meta && !error && elapsed === 0) return null;

  const statusColor = error
    ? 'bg-red-400'
    : running
      ? 'bg-accent animate-pulse-soft'
      : stage === 'done'
        ? 'bg-emerald-400'
        : 'bg-ash/40';

  return (
    <div className="mt-8 glass overflow-hidden animate-scale-in">
      <div className="px-5 py-3 border-b border-white/[0.04] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono">
        <span className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
          <span className="uppercase tracking-widest text-ash/70">
            {error
              ? 'error'
              : running
                ? stage ?? 'starting'
                : stage === 'done'
                  ? 'complete'
                  : 'idle'}
          </span>
        </span>
        <span className="text-ash/50">
          <span className="text-accent/60">t</span>
          <span className="text-ash/40">=</span>
          {elapsed}s
        </span>
        {meta && (
          <>
            <span className="text-ash/50">
              <span className="text-accent/60">files</span>
              <span className="text-ash/40">=</span>
              {meta.files}
            </span>
            <span className="text-ash/50">
              <span className="text-accent/60">bytes</span>
              <span className="text-ash/40">=</span>
              {meta.totalBytes.toLocaleString()}
            </span>
            {meta.truncated && (
              <span className="text-amber-400/70 uppercase tracking-widest text-[11px]">
                truncated
              </span>
            )}
          </>
        )}
      </div>
      {meta && (
        <div className="px-5 py-2.5 text-sm border-b border-white/[0.04]">
          <span className="text-bone font-medium">{meta.title}</span>
          <a
            href={meta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-light/70 hover:text-accent-light ml-3 text-xs transition-colors"
          >
            ↗ open
          </a>
        </div>
      )}
      {error && (
        <div className="px-5 py-3 text-sm text-red-400/90 bg-red-500/[0.05] border-t border-red-500/10">
          ✕ {error}
        </div>
      )}
    </div>
  );
}

function Output({
  output,
  running,
  outputRef,
}: {
  output: string;
  running: boolean;
  outputRef: RefObject<HTMLDivElement>;
}) {
  if (!output && !running) return null;
  return (
    <div className="mt-6 glass overflow-hidden animate-scale-in">
      <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-ash/50">
          Review Output
        </span>
        {output && !running && (
          <button
            onClick={() => navigator.clipboard.writeText(output)}
            className="text-xs text-ash/40 hover:text-accent-light px-3 py-1 rounded-lg hover:bg-white/[0.03] transition-all"
          >
            Copy
          </button>
        )}
      </div>
      <div
        ref={outputRef}
        className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto prose-glass text-sm sm:text-base"
      >
        {output ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
        ) : (
          <div className="text-ash/50 flex items-center gap-3">
            <span className="inline-block w-2 h-4 bg-accent/60 animate-blink rounded-sm" />
            <span>Initializing model...</span>
          </div>
        )}
        {running && output && (
          <span className="inline-block w-2 h-4 bg-accent/60 align-middle animate-blink ml-1 rounded-sm" />
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        {
          n: '01',
          t: 'Security',
          d: 'SQL injection, XSS, secrets in code, auth bypass.',
          icon: '🛡',
        },
        {
          n: '02',
          t: 'Performance',
          d: 'N+1 queries, blocking I/O, memory leaks, hot paths.',
          icon: '⚡',
        },
        {
          n: '03',
          t: 'Architecture',
          d: 'Coupling, abstractions, error handling, testability.',
          icon: '🏗',
        },
      ].map((c) => (
        <div
          key={c.n}
          className="glass glass-hover p-6 group cursor-default"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">{c.icon}</span>
            <span className="text-[11px] font-mono text-accent/40 tracking-wider">
              {c.n}
            </span>
          </div>
          <div className="font-semibold text-base text-bone mb-2 group-hover:text-accent-light transition-colors">
            {c.t}
          </div>
          <div className="text-ash/60 text-sm leading-relaxed">{c.d}</div>
        </div>
      ))}
    </div>
  );
}

function Footer({ mounted }: { mounted: boolean }) {
  return (
    <footer
      className={`border-t border-white/[0.04] mt-16 ${mounted ? 'animate-fade-in stagger-5' : 'opacity-0'}`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-ash/40">
        <div className="flex items-center gap-3">
          <span>Stateless · No DB · No Auth · No Tracking</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Powered by AI</span>
          <span className="text-ash/20">·</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent-light transition-colors"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
