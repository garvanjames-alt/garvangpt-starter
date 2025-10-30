// helpers/compose.js
export function toBullets(text, max = 8) {
  if (!text) return [];
  const parts = text.replace(/\r/g, '')
    .split(/\n+|(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  return parts.slice(0, max).map(s => `- ${s}`);
}

export function formatComposerV2({ findingsText, summaryText, sources = [], memories = [] }) {
  const bullets = toBullets(findingsText);
  const src = (sources.length ? sources : ['(none)']).map(s => `- ${s}`).join('\n');
  const mem = (memories.length ? memories : ['(none)']).map(m => `- ${m}`).join('\n');
  const summary = (summaryText && summaryText.trim())
    || 'This is an informational summary and **not** a diagnosis. Consult a licensed clinician.';

  return [
    '## Here’s what I found',
    bullets.length ? bullets.join('\n') : '- (no specific findings extracted)',
    '\n## Summary (non-diagnostic)',
    summary,
    '\n## Sources used',
    src,
    '\n## Memories referenced',
    mem
  ].join('\n');
}
