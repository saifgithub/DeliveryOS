---
name: sm-elicitation
description: Business-analysis elicitation interview — the DeliveryOS counterpart to grill-me. Interview the user one question at a time across problem, stakeholders, scope, goals, constraints, assumptions and risks until the specification is complete, then persist the spec, the question log, and every decision to a transcript artifact AND DeliveryOS memory (`intent` + `design` entries). Use when the user runs /sm-elicitation, wants to elicit or stress-test requirements, run a BA interview, or capture a spec + decisions before a PRD.
---

# /sm-elicitation — Business-Analysis Elicitation

Interview me relentlessly until the specification is complete, then save it. The DeliveryOS BA counterpart to grill-me.

Walk the decision tree one branch at a time — problem & context, stakeholders, scope & non-goals, goals & success criteria, constraints, assumptions & risks, and the decision each branch resolves to. Ask one question at a time, always with your recommended answer. If a question is answerable from the repo, the PRD, or `.deliveryos/` memory, go read it instead of asking.

Stop when the problem is one crisp paragraph, every goal has a verifiable success criterion, non-goals are explicit, and every branch you opened is resolved or logged as deferred.

Then persist — exact formats in [REFERENCE.md](REFERENCE.md), match them or the rebuild skips the file:

- **Artifact (always):** the spec, the full question log, and the decisions → `.deliveryos/elicitation/<slug>.md` (or `docs/elicitation/<slug>.md` outside a DeliveryOS project).
- **Memory (DeliveryOS projects):** one `intent` body file for the spec + one `design` body file per decision under `.deliveryos/memory/`, each decision linked `derives-from` the intent. Then tell me to run **DeliveryOS: Rebuild Memory Index from Markdown** to land them in `memory.sqlite`.

Elicitation only — no code, no PRD.
