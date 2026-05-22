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

export function __resetVscodeStub(): void {
  fileStore.clear();
  directories.clear();
}
