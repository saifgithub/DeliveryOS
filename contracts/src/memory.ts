// CHUNK-03 § 2.6 + § 5 — canonical memory schema.
// Single source of truth across the extension host and every webview.
// Webview-safe: no runtime imports (no `vscode`, no `sql.js`, no `fs`).
// Downstream chunks import these types directly; redeclaring any of them
// anywhere else is a violation of the cross-chunk contract.

export { LINK_KINDS, type LinkKind, type MemoryLink } from './links';

// --- 11 canonical memory types (§ 5.1) ------------------------------------

export const MEMORY_TYPES = [
  'intent',
  'requirement',
  'design',
  'codebase',
  'execution',
  'result',
  'verification',
  'release',
  'test-spec',
  'change-request',
  'bug',
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

// --- Base envelope (§ 5.2) ------------------------------------------------

export interface MemoryEntryBase<T extends MemoryType, P> {
  readonly id: string;
  readonly type: T;
  readonly title: string;
  readonly payload: P;
  readonly body: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// --- Typed payloads (§ 5.3) ----------------------------------------------

// 1. Intent — what the user originally wanted.

export interface RawIdea {
  readonly text: string;
  readonly capturedAt: number;
}

export interface DiscoveryAnswer {
  readonly question: string;
  readonly answer: string;
}

export interface DiscoveryRecord {
  readonly promptSnapshot: string;
  readonly answers: readonly DiscoveryAnswer[];
  readonly completedAt: number;
  readonly rawAnswersPaste?: string;
  readonly unmatchedText?: string;
}

// --- Interview types (DOS:P12) -------------------------------------------

export interface InterviewQuestion {
  readonly id: string; // 'I1', 'I2', ... global across rounds
  readonly topicRef?: string; // optional 'Q1'..'Q12'
  readonly question: string;
  readonly recommendedAnswer: string;
  readonly userAnswer: string | null;
}

export interface InterviewRound {
  readonly round: number;
  readonly rawPaste: string;
  readonly parsedAt: number;
  readonly questions: readonly InterviewQuestion[];
}

export interface InterviewRecord {
  readonly rounds: readonly InterviewRound[];
  readonly status: 'in_progress' | 'sufficient';
  readonly declaredSufficientAt: number | null;
  readonly sufficiencySource: 'ai' | 'user' | null;
}

export interface IntentPayload {
  readonly rawIdea: RawIdea;
  readonly discovery: DiscoveryRecord | null;
  /** Interview record. Treat missing (undefined) as null for backward compat. */
  readonly interview?: InterviewRecord | null;
  readonly problemStatement?: string;
  readonly userGoals?: readonly string[];
  readonly nonGoals?: readonly string[];
  readonly successCriteria?: readonly string[];
}

// 2. Requirement — what the system agreed to build.

export interface RequirementPayload {
  readonly category: 'functional' | 'non-functional';
  readonly priority: 'must' | 'should' | 'could';
  readonly sourcePrdSection?: string;
  readonly text: string;
  readonly verificationCriteria?: readonly string[];
  readonly assumptions?: readonly string[];
  readonly constraints?: readonly string[];
}

// 3. Design — how the system should be built.

export interface DesignPayload {
  readonly area: 'architecture' | 'data-model' | 'api' | 'security' | 'ux' | 'other';
  readonly decision: string;
  readonly rationale?: string;
  readonly rejectedOptions?: readonly string[];
  readonly tradeoffs?: string;
}

// 4. Codebase — what already exists.

export interface CodebaseKeyFile {
  readonly path: string;
  readonly purpose: string;
}

export interface CodebasePayload {
  readonly folderStructure?: string;
  readonly keyFiles?: readonly CodebaseKeyFile[];
  readonly conventions?: readonly string[];
  readonly testCommands?: readonly string[];
  readonly knownDefects?: readonly string[];
}

// 5. Execution — what the coding harness was asked to do.

export type HarnessName = 'claude-code' | 'codex' | 'cursor' | 'generic';

export interface ExecutionPayload {
  readonly briefMarkdown: string;
  readonly targetHarness: HarnessName;
  readonly harnessProfileId?: string;
  readonly contextPackageRef?: string;
  readonly expectedOutputs?: readonly string[];
  readonly briefVersion: number;
}

// 6. Result — what actually happened.
// `diffOutcome` is declared as an optional opaque slot here (CHUNK-13 owns the
// inner shape via the cross-chunk contract).

export interface ResultPayload {
  readonly rawOutput: string;
  readonly summary?: string;
  readonly filesChanged?: readonly string[];
  readonly testsAdded?: readonly string[];
  readonly testsRun?: readonly string[];
  readonly errors?: readonly string[];
  readonly risks?: readonly string[];
  readonly unresolvedQuestions?: readonly string[];
  readonly harness: HarnessName;
  readonly parseConfidence: 'high' | 'low';
  readonly diffOutcome?: unknown; // CHUNK-13 owns the shape.
}

// 7. Verification — whether the work passed.

export interface VerificationBypass {
  readonly requirementId: string;
  readonly reason: string;
  readonly approvedAt: number;
}

export interface VerificationPayload {
  readonly verdict: 'pass' | 'fail';
  readonly failedCriteria?: readonly string[];
  readonly defects?: readonly string[];
  readonly reworkNotes?: string;
  readonly approvedBy?: string;
  readonly approvedAt?: number;
  readonly bypasses?: readonly VerificationBypass[];
}

// 8. Release — what was released and why.

export interface ReleasePayload {
  readonly releaseId: string;
  readonly includedRequirementIds: readonly string[];
  readonly knownLimitations?: readonly string[];
  readonly deferredItems?: readonly string[];
  readonly finalSignOffAt: number;
  readonly evidencePackagePath?: string;
}

// 9. Test Spec — executable verification contract for a Requirement.
// CHUNK-08 (Test Designer) may extend this with additional optional fields
// non-breakingly; the surface below is the minimum stable shape downstream
// chunks rely on.

export interface TestScenario {
  readonly id: string;
  readonly description: string;
  readonly steps: readonly string[];
  readonly expected: readonly string[];
}

export interface TestSpecPayload {
  readonly requirementId: string;
  readonly scenarios: readonly TestScenario[];
  readonly fixtures?: readonly string[];
  readonly setupSteps?: readonly string[];
  readonly teardownSteps?: readonly string[];
  readonly notes?: string;
}

// --- Discriminated union (§ 5.4) -----------------------------------------

export type MemoryEntry =
  | MemoryEntryBase<'intent', IntentPayload>
  | MemoryEntryBase<'requirement', RequirementPayload>
  | MemoryEntryBase<'design', DesignPayload>
  | MemoryEntryBase<'codebase', CodebasePayload>
  | MemoryEntryBase<'execution', ExecutionPayload>
  | MemoryEntryBase<'result', ResultPayload>
  | MemoryEntryBase<'verification', VerificationPayload>
  | MemoryEntryBase<'release', ReleasePayload>
  | MemoryEntryBase<'test-spec', TestSpecPayload>
  | MemoryEntryBase<'change-request', import('./changeRequest').ChangeRequestPayload>
  | MemoryEntryBase<'bug', import('./bug').BugPayload>;

export type MemoryEntryOfType<T extends MemoryType> = Extract<MemoryEntry, { type: T }>;

export type MemoryPayloadOfType<T extends MemoryType> = MemoryEntryOfType<T>['payload'];

// Per-type aliases for call-site ergonomics.
export type IntentMemory = MemoryEntryOfType<'intent'>;
export type RequirementMemory = MemoryEntryOfType<'requirement'>;
export type DesignMemory = MemoryEntryOfType<'design'>;
export type CodebaseMemory = MemoryEntryOfType<'codebase'>;
export type ExecutionMemory = MemoryEntryOfType<'execution'>;
export type ResultMemory = MemoryEntryOfType<'result'>;
export type VerificationMemory = MemoryEntryOfType<'verification'>;
export type ReleaseMemory = MemoryEntryOfType<'release'>;
export type TestSpecMemory = MemoryEntryOfType<'test-spec'>;
export type ChangeRequestMemory = MemoryEntryOfType<'change-request'>;
export type BugMemory = MemoryEntryOfType<'bug'>;
