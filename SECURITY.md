# Security

## Reporting a vulnerability

Email security@group17a.com. We acknowledge within 3 business days. Please do
not open public issues for exploitable vulnerabilities.

## Threat model

This tool's core input is attacker-authored content: vendor pitches and
vendor websites. The security claim is architectural, not detection-based:

- Verdict tiers, check selection, and question selection are computed by
  plain TypeScript over schema-validated data. No text inside a pitch or a
  fetched page can change which checks run or what the verdict is.
- Detection layers (hidden-text forensics, the intake screen) can only ADD
  caution findings, never remove them, and any adversarial-content finding
  caps the verdict tier.
- The published report only carries URLs present in the evidence ledger and
  never renders images.

Detection layers will sometimes be bypassed; the architecture is the
guarantee. Details in [docs/security.md](docs/security.md).

## Red-teaming invited

Try to make an injected pitch out-tier its clean twin. The static corpus
lives in `tests/redteam/`; new bypass classes are welcome as issues or PRs
with a fixture.
