# Stage Configuration

This is the v0.3 mechanic that lets one product serve both solo builders and regulated enterprise teams without feeling heavy by default.

## Model

Every DeliveryOS project has the same four default stages:

```text
DISCOVER → DEFINE → EXECUTE → VERIFY
```

Mid-stages are optional. They are added from a library when the project actually needs them, and each one is a real stage with its own artefact, owner, and gate (not a checklist item).

## How mid-stages get added

Three paths:

1. **Discovery-driven.** During the DISCOVER stage, the AI interview asks trigger questions. The answers map to suggested mid-stages. The user accepts, rejects, or modifies.
2. **Manual.** The user adds or removes mid-stages at any time from the stage manager.
3. **Profile-applied.** The user picks a saved profile at project creation (e.g., "Regulated SaaS Default"), which applies a curated set of mid-stages.

## Stage library (MVP set)

Each mid-stage definition includes:

- A name
- The default stage it slots into (usually DEFINE, sometimes VERIFY)
- Trigger questions and answers that suggest it
- The gate condition (what must be true to pass)
- The artefact it produces
- The default operating mode (Human-Led, AI-Assisted, AI-Led)
- The default owner role (Engineer, Security, Legal, etc.)

### Security Review
- **Slots into:** DEFINE (before Execution Brief)
- **Triggers:** "handles user data", "exposes APIs", "auth required", "stores credentials"
- **Gate:** Security verification criteria documented and signed off
- **Artefact:** Security review note + threat model + verification criteria
- **Default mode:** AI-Assisted (human approves)

### Privacy / Data Review
- **Slots into:** DEFINE
- **Triggers:** "stores PII", "processes personal data", "data retention matters"
- **Gate:** Data classification done, retention policy defined
- **Artefact:** Data inventory + retention policy + consent map
- **Default mode:** AI-Assisted

### Compliance Review
- **Slots into:** DEFINE
- **Triggers:** "regulated industry (health, finance, gov)", "SOC 2", "HIPAA", "GDPR", "PCI"
- **Gate:** Compliance checklist completed
- **Artefact:** Compliance map + audit notes
- **Default mode:** Human-Led

### Legal Sign-off
- **Slots into:** DEFINE (early) or VERIFY (pre-release)
- **Triggers:** "external publish", "customer-facing contracts", "third-party data", "open source release"
- **Gate:** Legal approval recorded
- **Artefact:** Legal approval record + scope of approval
- **Default mode:** Human-Led

### UX Review
- **Slots into:** DEFINE
- **Triggers:** "customer-facing", "multi-step user flow", "consumer product"
- **Gate:** UX flow reviewed + usability checklist passed
- **Artefact:** UX flow map + usability notes
- **Default mode:** AI-Assisted or Human-Led

### Accessibility Review
- **Slots into:** DEFINE or VERIFY
- **Triggers:** "public-facing", "WCAG required", "ADA exposure"
- **Gate:** Accessibility checklist passed
- **Artefact:** Accessibility audit
- **Default mode:** AI-Assisted

### Architecture Review
- **Slots into:** DEFINE
- **Triggers:** "multi-service", "scale matters", "touches core systems"
- **Gate:** ADR written and approved
- **Artefact:** Architecture decision record
- **Default mode:** Human-Led

### Cost / Ops Review
- **Slots into:** DEFINE or VERIFY
- **Triggers:** "production deploy", "cost-sensitive", "high-traffic"
- **Gate:** Cost estimate + ops runbook
- **Artefact:** Cost model + ops runbook
- **Default mode:** AI-Assisted

### Pre-release Sign-off
- **Slots into:** VERIFY (before release evidence)
- **Triggers:** "external release", "customers will see this"
- **Gate:** Release approval record signed
- **Artefact:** Release approval record
- **Default mode:** Human-Led

### Post-deploy Validation
- **Slots into:** VERIFY (after release evidence, recurring)
- **Triggers:** "production traffic", "live data dependency"
- **Gate:** Live verification result recorded
- **Artefact:** Post-deploy validation result
- **Default mode:** AI-Assisted

## Stage profiles

Saved bundles of mid-stages that can be applied at project creation.

- **Solo Default.** No mid-stages. The four-stage default.
- **Internal Tool.** Security Review.
- **Customer-facing SaaS.** Security, Privacy, UX, Pre-release Sign-off.
- **Regulated SaaS.** Security, Privacy, Compliance, Legal, Pre-release Sign-off, Post-deploy Validation.
- **Open Source Library.** Architecture, Legal (for licence), Pre-release Sign-off.
- **High-scale Production.** Security, Architecture, Cost/Ops, Pre-release Sign-off, Post-deploy Validation.

Users can save their own profiles.

## Stage gates

Every mid-stage has a gate. A gate is a boolean condition that must be true before the parent default stage can complete. Gates are explicit, named, and recorded in the memory graph.

Example: a Compliance Review gate condition might be "compliance_checklist.completed_at IS NOT NULL AND compliance_checklist.passed = true". If the gate is not met, DEFINE cannot hand off to EXECUTE.

Gates can be bypassed (with a recorded justification) for prototype or research work. Bypasses are visible in Release Evidence.

## Re-routing mid-project

If a stage is added after work has begun, DeliveryOS:

1. Halts in-flight work that would skip the new gate
2. Generates the artefact template for the new stage
3. Backfills the gate with any data that already exists
4. Notifies the user with a "what changed" summary

If a stage is removed mid-project, the existing artefact is preserved in memory but no longer blocks progression. This is also recorded.

## Why this is the v0.3 unlock

Before v0.3, the PRD described a 14-stage lifecycle that every project had to walk through. That made the product feel heavy regardless of project type.

In v0.3, the lifecycle is four default stages. Mid-stages exist, but only as a library that a project draws from when its discovery answers indicate they are needed. A weekend project sees four stages. A HIPAA-regulated product sees four stages with six gates inside them. The user interface is the same. The weight is different. The product earns its weight from the work the project actually requires.

This is also a stronger sales line: "DeliveryOS scales from a weekend hack to a regulated release. Same shape, configurable weight."
