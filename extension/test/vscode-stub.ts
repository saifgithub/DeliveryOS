// In-memory `vscode` shim — just enough surface for MemoryStore tests to
// run headlessly. Aliased via tsconfig#compilerOptions.paths in
// test/tsconfig.json so `import * as vscode from 'vscode'` resolves here
// during tests.

const fileStore = new Map<string, Uint8Array>();
const directories = new Set<string>();

export class FileSystemError extends Error {
  constructor(public readonly code: string, message?: string) {
    super(message ?? code);
    this.name = 'FileSystemError';
  }
}

export class Uri {
  private constructor(
    readonly scheme: string,
    readonly path: string,
  ) {}

  static file(p: string): Uri {
    return new Uri('file', p);
  }

  static joinPath(base: Uri, ...segments: string[]): Uri {
    const joined = [base.path.replace(/\/+$/, ''), ...segments]
      .map((s) => s.replace(/^\/+|\/+$/g, ''))
      .filter((s) => s.length > 0)
      .join('/');
    return new Uri(base.scheme, '/' + joined);
  }

  get fsPath(): string {
    return this.path;
  }

  toString(): string {
    return `${this.scheme}://${this.path}`;
  }
}

export const workspace = {
  fs: {
    async readFile(uri: Uri): Promise<Uint8Array> {
      const bytes = fileStore.get(uri.toString());
      if (!bytes) throw new FileSystemError('FileNotFound', uri.toString());
      return bytes;
    },
    async writeFile(uri: Uri, bytes: Uint8Array): Promise<void> {
      fileStore.set(uri.toString(), bytes);
    },
    async createDirectory(uri: Uri): Promise<void> {
      directories.add(uri.toString());
    },
    async delete(uri: Uri, _options?: { useTrash?: boolean }): Promise<void> {
      fileStore.delete(uri.toString());
    },
    async stat(uri: Uri): Promise<{ type: number }> {
      if (fileStore.has(uri.toString()) || directories.has(uri.toString())) {
        return { type: 1 };
      }
      throw new FileSystemError('FileNotFound', uri.toString());
    },
    async rename(
      from: Uri,
      to: Uri,
      options?: { overwrite?: boolean },
    ): Promise<void> {
      const bytes = fileStore.get(from.toString());
      if (!bytes) throw new FileSystemError('FileNotFound', from.toString());
      if (fileStore.has(to.toString()) && !options?.overwrite) {
        throw new FileSystemError('FileExists', to.toString());
      }
      fileStore.set(to.toString(), bytes);
      fileStore.delete(from.toString());
    },
    async copy(
      from: Uri,
      to: Uri,
      options?: { overwrite?: boolean },
    ): Promise<void> {
      const bytes = fileStore.get(from.toString());
      if (!bytes) throw new FileSystemError('FileNotFound', from.toString());
      if (fileStore.has(to.toString()) && !options?.overwrite) {
        throw new FileSystemError('FileExists', to.toString());
      }
      fileStore.set(to.toString(), new Uint8Array(bytes));
    },
    async readDirectory(uri: Uri): Promise<Array<[string, number]>> {
      const prefix = uri.toString().replace(/\/+$/, '') + '/';
      const seen = new Set<string>();
      const out: Array<[string, number]> = [];
      for (const key of fileStore.keys()) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const top = rest.split('/')[0];
        if (!top || seen.has(top)) continue;
        seen.add(top);
        const isFile = rest === top;
        out.push([top, isFile ? 1 : 2]);
      }
      return out;
    },
  },
  createFileSystemWatcher(
    _pattern: unknown,
    _ignoreCreate?: boolean,
    _ignoreChange?: boolean,
    _ignoreDelete?: boolean,
  ): FileSystemWatcher {
    return new FileSystemWatcher();
  },
};

export class FileSystemWatcher implements Disposable {
  private readonly createEmitter = new EventEmitter<Uri>();
  private readonly changeEmitter = new EventEmitter<Uri>();
  private readonly deleteEmitter = new EventEmitter<Uri>();

  readonly onDidCreate = this.createEmitter.event;
  readonly onDidChange = this.changeEmitter.event;
  readonly onDidDelete = this.deleteEmitter.event;

  /** Test-only: drive the underlying emitters from a fixture. */
  __fireCreate(uri: Uri): void {
    this.createEmitter.fire(uri);
  }
  __fireChange(uri: Uri): void {
    this.changeEmitter.fire(uri);
  }
  __fireDelete(uri: Uri): void {
    this.deleteEmitter.fire(uri);
  }

  dispose(): void {
    this.createEmitter.dispose();
    this.changeEmitter.dispose();
    this.deleteEmitter.dispose();
  }
}

export class RelativePattern {
  constructor(
    readonly base: WorkspaceFolder | Uri | string,
    readonly pattern: string,
  ) {}
}

// --- Terminal surface ----------------------------------------------------

export class ThemeIcon {
  constructor(readonly id: string) {}
}

export const TerminalExitReason = {
  Unknown: 0,
  Shutdown: 1,
  Process: 2,
  User: 3,
  Extension: 4,
} as const;
export type TerminalExitReason = (typeof TerminalExitReason)[keyof typeof TerminalExitReason];

export interface TerminalExitStatus {
  readonly code: number | undefined;
  readonly reason: TerminalExitReason;
}

export interface Terminal {
  readonly name: string;
  readonly exitStatus: TerminalExitStatus | undefined;
  sendText(text: string, shouldExecute?: boolean): void;
  show(preserveFocus?: boolean): void;
  dispose(): void;
}

export interface TerminalOptions {
  readonly name?: string;
  readonly cwd?: Uri | string;
  readonly iconPath?: ThemeIcon | Uri;
  readonly isTransient?: boolean;
}

export const window = {
  createTerminal(_options?: TerminalOptions): Terminal {
    throw new Error('vscode-stub.window.createTerminal: not supported in headless tests');
  },
  onDidCloseTerminal(_listener: (terminal: Terminal) => unknown): Disposable {
    return { dispose() {} };
  },
  showErrorMessage(_message: string, ..._items: string[]): Promise<string | undefined> {
    return Promise.resolve(undefined);
  },
  showInformationMessage(_message: string, ..._items: string[]): Promise<string | undefined> {
    return Promise.resolve(undefined);
  },
  showWarningMessage(_message: string, ..._items: string[]): Promise<string | undefined> {
    return Promise.resolve(undefined);
  },
};

export interface ExtensionContext {
  readonly extensionUri: Uri;
  readonly globalStorageUri: Uri;
  readonly subscriptions: { dispose(): unknown }[];
}

export interface WorkspaceFolder {
  readonly uri: Uri;
  readonly name: string;
  readonly index: number;
}

export interface Webview {
  asWebviewUri(uri: Uri): Uri;
  readonly cspSource: string;
}

export interface Disposable {
  dispose(): unknown;
}

export type Event<T> = (listener: (e: T) => unknown) => Disposable;

export class EventEmitter<T> {
  private readonly listeners: Set<(e: T) => unknown> = new Set();

  readonly event: Event<T> = (listener) => {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  };

  fire(value: T): void {
    for (const listener of [...this.listeners]) {
      listener(value);
    }
  }

  dispose(): void {
    this.listeners.clear();
  }
}

export function __makeStubWebview(opts?: {
  cspSource?: string;
  asWebviewUri?: (uri: Uri) => Uri;
}): Webview {
  return {
    cspSource: opts?.cspSource ?? 'vscode-cdn.net',
    asWebviewUri:
      opts?.asWebviewUri ??
      ((uri) => Uri.file(`https://vscode-cdn.net${uri.fsPath}`)),
  };
}

export function __resetVscodeStub(): void {
  fileStore.clear();
  directories.clear();
}
