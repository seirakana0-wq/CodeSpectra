import type { FetchedCode } from './github';

export const SYSTEM_PROMPT = `You are a senior staff engineer doing a code review. Be precise, direct, and brutally honest.

OUTPUT FORMAT (markdown, in this exact order):

## VERDICT
One line. Ship-ready / Needs work / Reject. Then a single severity score 1–10 (10 = critical bugs).

## SUMMARY
Two to four sentences. What does this code do? What's the overall quality?

## CRITICAL
Bugs that will break production, security holes, data loss risks. If none, write "None found."
Use bullet points. For each issue: file:line — what's wrong — why it matters — fix.

## HIGH
Real problems but not catastrophic: race conditions, missing error handling, perf issues at scale.

## MEDIUM
Style, naming, structural improvements. Keep this section short.

## NITS
Optional. One-liners only. Skip if nothing notable.

## STRENGTHS
What's done well. Be specific. Skip if mediocre.

RULES:
- Reference exact file paths and line numbers when possible.
- Cite code with backticks. Don't dump full files back.
- No hedging ("might", "perhaps", "could be"). State the issue directly.
- No congratulatory filler. No "great work!".
- If the input is too small to review meaningfully, say so in VERDICT and stop.
- Output language: same as the user's request (default English).`;

export function buildUserPrompt(code: FetchedCode): string {
  const header: string[] = [];
  header.push(`# Review target: ${code.title}`);
  header.push(`URL: ${code.url}`);
  header.push(`Kind: ${code.kind}`);
  if (code.meta?.description) header.push(`Description: ${code.meta.description}`);
  if (code.meta?.language) header.push(`Primary language: ${code.meta.language}`);
  if (code.meta?.author) header.push(`PR author: ${code.meta.author}`);
  if (code.meta?.base && code.meta?.head)
    header.push(`Branch: ${code.meta.head} -> ${code.meta.base}`);
  if (code.meta?.additions !== undefined)
    header.push(`Diff: +${code.meta.additions} -${code.meta.deletions} across ${code.meta.changed_files} files`);
  if (code.meta?.body) header.push(`PR description:\n${code.meta.body}`);
  if (code.truncated) header.push(`NOTE: input truncated. Reviewing first ${code.files.length} files.`);

  const sections = code.files.map((f) => {
    const ext = f.path.split('.').pop() ?? '';
    return `\n\n--- FILE: ${f.path} (${f.bytes} bytes) ---\n\`\`\`${ext}\n${f.content}\n\`\`\``;
  });

  return header.join('\n') + '\n' + sections.join('');
}
