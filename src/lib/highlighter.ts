import { createHighlighter, type BundledLanguage, type BundledTheme, type HighlighterGeneric } from 'shiki/bundle/web';

type Highlighter = HighlighterGeneric<BundledLanguage, BundledTheme>;

let highlighter: Highlighter | null = null;
let loading: Promise<Highlighter> | null = null;

const LANGS: BundledLanguage[] = [
  'typescript', 'tsx', 'javascript', 'jsx',
  'html', 'css', 'json', 'yaml', 'markdown',
  'bash', 'shellscript', 'sql', 'python',
  'java', 'c', 'cpp',
];

export type { Highlighter };

export async function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return highlighter;
  if (loading) return loading;
  loading = createHighlighter({
    themes: ['github-dark-default'],
    langs: LANGS,
  });
  highlighter = await loading;
  return highlighter!;
}

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  mjs: 'javascript', cjs: 'javascript', mts: 'typescript',
  html: 'html', css: 'css', json: 'json',
  yaml: 'yaml', yml: 'yaml', toml: 'toml',
  md: 'markdown', mdx: 'markdown',
  sh: 'bash', bash: 'bash', zsh: 'bash',
  dockerfile: 'dockerfile',
  sql: 'sql', py: 'python',
  go: 'go', rs: 'rust', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
};

export function getLangFromFile(filepath: string): string | null {
  const basename = filepath.split('/').pop()?.toLowerCase() ?? '';
  if (basename === 'dockerfile' || basename.startsWith('dockerfile.')) return 'dockerfile';
  if (basename === '.bashrc' || basename === '.zshrc' || basename === '.profile') return 'bash';
  const ext = basename.split('.').pop() ?? '';
  return EXT_TO_LANG[ext] ?? null;
}

export interface HighlightedToken {
  content: string;
  color?: string;
}

export function highlightCode(code: string, lang: string, hl: Highlighter): HighlightedToken[][] {
  try {
    const result = hl.codeToTokens(code, {
      lang: lang as BundledLanguage,
      theme: 'github-dark-default',
    });
    return result.tokens.map((line) =>
      line.map((token) => ({
        content: token.content,
        color: token.color,
      })),
    );
  } catch {
    // Language not available in web bundle — return plain text
    return code.split('\n').map((line) => [{ content: line }]);
  }
}
