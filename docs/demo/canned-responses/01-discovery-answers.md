# Discovery Answers — Bug Triage Assistant

*Paste this into the AI chat when the demo reaches Step 3. Then copy the answer block back into the DeliveryOS Answers tab.*

---

**Question 1:** Who are the primary users of this system?

**Answer:** Internal engineering teams — developers and QA engineers — who need to report, track, and prioritise bugs without leaving their existing tools. The API will be consumed by CI pipelines, VS Code extensions, and internal dashboards.

---

**Question 2:** What does success look like in the first iteration?

**Answer:** A developer can POST a new bug report and receive a unique ID in response. They can retrieve any report by ID. The system returns a structured JSON response with severity, status, and creation timestamp. Four integration tests pass with `pytest -q` and zero ruff lint errors.
