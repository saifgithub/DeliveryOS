import type { DiscoveryQuestion } from '@deliveryos/contracts';

export const DISCOVERY_QUESTIONS_MVP: readonly DiscoveryQuestion[] = [
  {
    id: 'Q1',
    topic: 'problem',
    prompt:
      'What problem does this solve, and for whom? Be concrete — a one-paragraph problem statement and the primary user or buyer.',
  },
  {
    id: 'Q2',
    topic: 'scope',
    prompt:
      'What is in scope for the first usable version, and what is explicitly out of scope?',
    helperText:
      'List the minimum behaviours that make this useful, and the things that look related but you are deliberately not building.',
  },
  {
    id: 'Q3',
    topic: 'users',
    prompt:
      'Who are the users? How many user types are there, and what does each one do with the system?',
  },
  {
    id: 'Q4',
    topic: 'data',
    prompt:
      'What data does the system store, read, or write? Does any of it count as personal, sensitive, or regulated (PII, PHI, payment, credentials)?',
  },
  {
    id: 'Q5',
    topic: 'regulated-industry',
    prompt:
      'Does this operate in a regulated industry (health, finance, government, education)? Any compliance regimes that apply (HIPAA, GDPR, SOC 2, PCI, ADA, WCAG)?',
  },
  {
    id: 'Q6',
    topic: 'surface',
    prompt:
      'Is this customer-facing, internal-only, or somewhere in between? Is there a user interface, an API, both?',
  },
  {
    id: 'Q7',
    topic: 'integrations',
    prompt:
      'What external systems does it integrate with? Auth providers, payment gateways, third-party APIs, internal services, AI models?',
  },
  {
    id: 'Q8',
    topic: 'performance-scale',
    prompt:
      'What scale and performance does it need at launch? Request rates, data volumes, response-time expectations, concurrent users.',
  },
  {
    id: 'Q9',
    topic: 'success-criteria',
    prompt:
      'How will you know it works? Three to five concrete success criteria — outcomes you could test or measure against.',
  },
  {
    id: 'Q10',
    topic: 'constraints',
    prompt:
      'What constraints does the work have? Deadline, budget, headcount, stack you must use, stack you must avoid, deployment target.',
  },
  {
    id: 'Q11',
    topic: 'risks-unknowns',
    prompt:
      'What are the biggest unknowns or risks? Things you do not know yet that could change the shape of the build.',
  },
  {
    id: 'Q12',
    topic: 'release-shape',
    prompt:
      'What does a first release look like? Internal demo, customer beta, public launch. Who needs to sign off before it ships?',
  },
];
