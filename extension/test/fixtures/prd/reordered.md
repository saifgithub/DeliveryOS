# Bug Triage Assistant

## Problem

Engineering teams receive GitHub issues in an unstructured stream. Triaging them manually
takes 30–60 minutes per week and requires domain expertise that junior team members lack.

## Users

Primary: engineering team leads who own the issue backlog.
Secondary: junior developers who need guidance on issue severity.

## Goals

- Auto-classify incoming issues by likely severity and component.
- Surface duplicates before a developer begins work.
- Reduce triage time from 30 minutes to under 5 minutes per week.

## Non-Goals

- Does not resolve issues automatically.
- Does not replace human judgement for ambiguous cases.
- Does not integrate with Jira, Linear, or other project management tools in v1.

## Constraints

- Must run within existing GitHub Actions budget (no new paid services).
- Must not store issue content outside the user's own GitHub repository.

## Assumptions

- The repository uses GitHub Issues (not GitLab or Jira).
- The team has at least one person with GitHub Actions write permissions.

## Success Criteria

- Triage time drops by at least 50% in the first month.
- Zero false-positive "critical" classifications in the first 100 issues processed.

## Risks

- **Model accuracy** — classification may be inconsistent across issue categories. Mitigation: human review step before labels are applied.
- **Rate limits** — GitHub API rate limits may cause delays. Mitigation: exponential backoff + queue.
