import type {
  GitFileChange,
  ClaimedFileChange,
  StoredResultPayload,
} from '@deliveryos/contracts';
import { ResultAcknowledge } from '@deliveryos/contracts';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { messenger } from '../../shared/messenger';

interface Props {
  resultId: string;
  payload: StoredResultPayload;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="text-sm font-semibold text-vscode-foreground mb-1">{title}</h2>
      <div className="text-sm text-vscode-foreground">{children}</div>
    </section>
  );
}

function ItemList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="italic text-vscode-descriptionForeground">None</p>;
  return (
    <ul className="list-disc pl-4 space-y-0.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function ClaimedFiles({ files }: { files: ClaimedFileChange[] }) {
  if (files.length === 0)
    return <p className="italic text-vscode-descriptionForeground">None reported</p>;
  return (
    <ul className="list-disc pl-4 space-y-0.5">
      {files.map((f, i) => (
        <li key={i}>
          <code>{f.path}</code>
          {f.claimedStatus !== 'unknown' && (
            <span className="ml-2 text-xs text-vscode-descriptionForeground">
              ({f.claimedStatus})
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function GitFiles({ files }: { files: GitFileChange[] }) {
  if (files.length === 0)
    return <p className="italic text-vscode-descriptionForeground">No changes detected</p>;
  return (
    <ul className="list-disc pl-4 space-y-0.5">
      {files.map((f, i) => (
        <li key={i}>
          <code>{f.path}</code>
          <span className="ml-2 text-xs text-vscode-descriptionForeground">({f.status})</span>
        </li>
      ))}
    </ul>
  );
}

export function ResultDetail({ resultId, payload }: Props) {
  const { parsed, filesChanged } = payload;
  const { sections, confidence, rawText } = parsed;

  const handleAcknowledge = async () => {
    await messenger.sendRequest(ResultAcknowledge, HOST_EXTENSION, { resultId });
  };

  return (
    <div className="p-4 max-w-3xl">
      {confidence === 'low' && (
        <div className="mb-4 p-3 bg-vscode-inputValidation-warningBackground border border-vscode-inputValidation-warningBorder rounded text-sm">
          Parser could not detect expected sections — showing raw output.
        </div>
      )}
      {!filesChanged.gitAvailable && (
        <div className="mb-4 p-3 bg-vscode-inputValidation-infoBackground border border-vscode-inputValidation-infoBorder rounded text-sm">
          git not available — file changes shown reflect harness self-report only.
        </div>
      )}

      <Section title="Summary">
        {sections.summary ? (
          <p>{sections.summary}</p>
        ) : (
          <p className="italic text-vscode-descriptionForeground">No summary</p>
        )}
      </Section>

      <Section title="Files Changed (harness reported)">
        <ClaimedFiles files={sections.filesChangedClaimed ?? []} />
      </Section>

      <Section title="Files Changed (git ground truth)">
        <GitFiles files={filesChanged.fromGit} />
      </Section>

      <Section title="Tests Added / Updated">
        <ItemList items={sections.testsAdded ?? []} />
      </Section>

      <Section title="Tests Run">
        <ItemList items={sections.testsRun ?? []} />
      </Section>

      <Section title="Risks">
        <ItemList items={sections.risks ?? []} />
      </Section>

      <Section title="Unresolved Questions">
        <ItemList items={sections.questions ?? []} />
      </Section>

      <details className="mb-4">
        <summary className="cursor-pointer text-sm font-semibold text-vscode-foreground">
          Raw output
        </summary>
        <pre className="mt-2 text-xs bg-vscode-editor-background p-3 rounded overflow-auto whitespace-pre-wrap">
          {rawText}
        </pre>
      </details>

      <button
        onClick={handleAcknowledge}
        className="px-3 py-1.5 text-sm bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground"
      >
        Acknowledge result
      </button>
    </div>
  );
}
