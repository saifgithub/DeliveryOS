import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        dos: {
          ink: '#0F172A',
          surface: '#FFFFFF',
          accent: '#6D5BD0',
          danger: '#DC2626',
          success: '#16A34A',
          warn: '#D97706',
          muted: '#64748B',
        },
        vscode: {
          bg: 'var(--vscode-editor-background)',
          fg: 'var(--vscode-editor-foreground)',
          panel: 'var(--vscode-sideBar-background)',
          border: 'var(--vscode-panel-border)',
          focusBorder: 'var(--vscode-focusBorder)',
          inputBorder: 'var(--vscode-input-border)',
          inputBg: 'var(--vscode-input-background)',
          inputFg: 'var(--vscode-input-foreground)',
        },
      },
      fontFamily: {
        sans: ['var(--vscode-font-family)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--vscode-editor-font-family)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        vsbody: 'var(--vscode-font-size)',
      },
    },
  },
  plugins: [],
} satisfies Config;
