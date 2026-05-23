import MarkdownIt from 'markdown-it';
import type { DiscoveryRecord, DiscoveryQuestion } from '@deliveryos/contracts';

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

interface Props {
  discovery: DiscoveryRecord | null;
  questions: readonly DiscoveryQuestion[];
}

export function DiscoverySummary({ discovery, questions }: Props) {
  if (!discovery || !discovery.answers.length) {
    return (
      <section className="max-w-2xl">
        <h2 className="text-base font-semibold text-vscode-fg mb-1">Summary</h2>
        <p className="text-sm text-dos-muted">
          No discovery answers saved yet. Complete the Answers tab to see your summary here.
        </p>
      </section>
    );
  }

  const completedAt = new Date(discovery.completedAt).toLocaleString();

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-vscode-fg mb-0.5">Discovery summary</h2>
        <p className="text-xs text-dos-muted">Completed {completedAt}</p>
      </div>

      <div className="space-y-4">
        {discovery.answers.map((answer, idx) => {
          const question = questions.find((q) => q.prompt === answer.question) ?? questions[idx];
          return (
            <div
              key={idx}
              className="rounded-md border border-vscode-border bg-vscode-panel p-4 space-y-1"
            >
              <div className="flex items-center gap-2 mb-1">
                {question && (
                  <span className="text-xs text-dos-muted font-mono">{question.id}</span>
                )}
                <span className="text-sm font-medium text-vscode-fg">
                  {question?.topic ?? answer.question}
                </span>
              </div>
              <p className="text-xs text-dos-muted">{answer.question}</p>
              <div
                className="text-sm text-vscode-fg mt-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5 [&_code]:font-mono [&_code]:text-xs [&_strong]:font-semibold [&_em]:italic"
                dangerouslySetInnerHTML={{ __html: md.render(answer.answer) }}
              />
            </div>
          );
        })}
      </div>

      {discovery.unmatchedText && (
        <div className="rounded-md border border-dos-warn bg-vscode-panel px-3 py-2 text-xs text-dos-muted">
          <span className="font-medium text-vscode-fg">Unmatched text from paste: </span>
          {discovery.unmatchedText}
        </div>
      )}
    </section>
  );
}
