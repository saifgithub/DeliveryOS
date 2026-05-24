import type { RequirementSummary, TestSpec } from '@deliveryos/contracts';

export interface TestDesignerPromptInput {
  readonly requirement: RequirementSummary;
  readonly projectTitle: string;
  /** First paragraph of the PRD body. Empty string if no PRD body recorded. */
  readonly prdSummary: string;
  /** Reserved — `'None recorded yet.'` literal in MVP (no Design Memory yet). */
  readonly designContext?: string;
  /** If re-running on a requirement that already has a test spec, the old one. */
  readonly existingTestSpec?: TestSpec;
  /** Optional `assumptions` / `constraints` carried on the Requirement payload. */
  readonly assumptions?: readonly string[];
  readonly constraints?: readonly string[];
}

/**
 * Pure, deterministic prompt builder. Output is byte-identical for identical
 * input (no timestamps, no IDs in the body) so snapshot tests stay valid.
 *
 * Follows PRD §22's 7-section generic specialist shape; the `## Verification
 * Criteria` and `## Test Specification` headers are LOAD-BEARING — `resultParser`
 * keys off them (CHUNK-08 spec §3 note).
 */
export function buildTestDesignerPrompt(input: TestDesignerPromptInput): string {
  const {
    requirement,
    projectTitle,
    prdSummary,
    designContext,
    existingTestSpec,
    assumptions,
    constraints,
  } = input;

  const design = designContext ?? 'None recorded yet.';
  const summary = prdSummary.trim().length > 0 ? prdSummary.trim() : 'No PRD summary recorded.';

  const assumptionsLine =
    assumptions && assumptions.length > 0
      ? assumptions.map((a) => `  - ${a}`).join('\n')
      : '  - None recorded.';

  const constraintsLine =
    constraints && constraints.length > 0
      ? constraints.map((c) => `  - ${c}`).join('\n')
      : '  - None recorded.';

  const reviseBlock = existingTestSpec
    ? `\n## Existing Test Spec (for revision)\n\nA previous test spec already exists for this requirement. Improve or replace it.\n\n\`\`\`md\n${existingTestSpec.raw}\n\`\`\`\n`
    : '';

  return `# Specialist: Test Designer

## Role
You are a Test Designer for the project "${projectTitle}".
You produce verification criteria and a test specification for a single
approved requirement.

## Objective
Take the approved requirement below and produce:
1. A bulleted list of **verification criteria** — observable, falsifiable
   statements that, taken together, define what "this requirement is met"
   means.
2. A **test specification** — a set of named test cases, each expressed
   as markdown bullets. Cover happy-path and edge cases. Do not propose
   implementation; only describe what the tests must check.

## Project Context
- Project title: ${projectTitle}
- PRD summary: ${summary}
- Design context: ${design}

## Approved Inputs
You may rely **only** on the following inputs. Do not invent requirements
that are not stated here.

- Requirement ID: ${requirement.id}
- Title: ${requirement.title}
- Type: ${requirement.category}
- Priority: ${requirement.priority}
- Source PRD section: ${requirement.sourcePrdSection}
- Description:
${indentBlock(requirement.description, 2)}
- Assumptions:
${assumptionsLine}
- Constraints:
${constraintsLine}
${reviseBlock}
## Your Task
1. Write the verification criteria as a bulleted list under a level-2
   heading exactly named "## Verification Criteria".
2. Write the test specification under a level-2 heading exactly named
   "## Test Specification". Inside, each test case is a level-3 heading
   ("### T-<n> <test case title>") followed by bullets.
3. For each test case, include bullets labelled:
   - "- Given: <preconditions>"
   - "- When: <action>"
   - "- Then: <observable outcome>"
   (Use markdown bullets, not a Gherkin code block. Plain prose inside the
   labels is fine.)
4. Aim for 3–8 test cases per requirement.

## Output Format
Respond with **only** the markdown body — no preamble, no closing remarks,
no code-fence wrapper around the whole thing. The very first line of your
response must be "## Verification Criteria".

## Rules
- Test-first thinking: every criterion must be checkable from the outside
  (an observer of the running system can decide pass/fail).
- No implementation suggestions. Do not name files, classes, or libraries.
- Cover happy-path AND at least one edge / failure case.
- Do not introduce requirements that aren't in the Approved Inputs above.
  If something is unclear, list it under a final level-2 heading
  "## Open Questions" instead of guessing.
- If you must reference external systems, use the names that appear in
  the Project Context or Approved Inputs only.
`;
}

function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  const body = text.trim().length > 0 ? text : '(no description)';
  return body
    .split('\n')
    .map((line) => `${pad}${line}`)
    .join('\n');
}
