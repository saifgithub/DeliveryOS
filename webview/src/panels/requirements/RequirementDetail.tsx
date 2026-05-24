import { useEffect, useState } from 'react';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  RequirementsOpenBriefComposer,
  RequirementsOpenBriefFile,
  RequirementsOpenTestDesigner,
  RequirementsOpenTestSpecFile,
  type Requirement,
  type RequirementCategory,
  type RequirementPriority,
} from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

interface Props {
  requirement: Requirement;
  prdSections: readonly string[];
  onSave: (patch: {
    title?: string;
    description?: string;
    category?: RequirementCategory;
    priority?: RequirementPriority;
    sourcePrdSection?: string;
  }) => Promise<void>;
  onCancel: () => void;
  onDelete: () => Promise<void>;
}

export function RequirementDetail({ requirement, prdSections, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(requirement.title);
  const [description, setDescription] = useState(requirement.description);
  const [category, setCategory] = useState<RequirementCategory>(requirement.category);
  const [priority, setPriority] = useState<RequirementPriority>(requirement.priority);
  const [sourcePrdSection, setSourcePrdSection] = useState(requirement.sourcePrdSection);
  const [saving, setSaving] = useState(false);

  // Reset form whenever the selected requirement changes.
  useEffect(() => {
    setTitle(requirement.title);
    setDescription(requirement.description);
    setCategory(requirement.category);
    setPriority(requirement.priority);
    setSourcePrdSection(requirement.sourcePrdSection);
  }, [requirement.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    title !== requirement.title ||
    description !== requirement.description ||
    category !== requirement.category ||
    priority !== requirement.priority ||
    sourcePrdSection !== requirement.sourcePrdSection;

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await onSave({
        ...(title !== requirement.title ? { title } : {}),
        ...(description !== requirement.description ? { description } : {}),
        ...(category !== requirement.category ? { category } : {}),
        ...(priority !== requirement.priority ? { priority } : {}),
        ...(sourcePrdSection !== requirement.sourcePrdSection ? { sourcePrdSection } : {}),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRunTestDesigner = async () => {
    try {
      await messenger.sendRequest(RequirementsOpenTestDesigner, HOST_EXTENSION, {
        requirementEntryId: requirement.entryId,
      });
    } catch (err) {
      console.error('RequirementDetail: openTestDesigner failed', err);
    }
  };

  const handleOpenTestSpecFile = async () => {
    try {
      await messenger.sendRequest(RequirementsOpenTestSpecFile, HOST_EXTENSION, {
        requirementEntryId: requirement.entryId,
      });
    } catch (err) {
      console.error('RequirementDetail: openTestSpecFile failed', err);
    }
  };

  const handleComposeBrief = async () => {
    try {
      await messenger.sendRequest(RequirementsOpenBriefComposer, HOST_EXTENSION, {
        requirementEntryId: requirement.entryId,
      });
    } catch (err) {
      console.error('RequirementDetail: openBriefComposer failed', err);
    }
  };

  const handleOpenBrief = async (briefEntryId: string) => {
    try {
      await messenger.sendRequest(RequirementsOpenBriefComposer, HOST_EXTENSION, {
        requirementEntryId: requirement.entryId,
        briefEntryId,
      });
    } catch (err) {
      console.error('RequirementDetail: openBriefComposer (readonly) failed', err);
    }
  };

  const handleOpenBriefFile = async (briefEntryId: string) => {
    try {
      await messenger.sendRequest(RequirementsOpenBriefFile, HOST_EXTENSION, {
        briefEntryId,
      });
    } catch (err) {
      console.error('RequirementDetail: openBriefFile failed', err);
    }
  };

  const handleComposeNewVersion = async (supersedesEntryId: string) => {
    try {
      await messenger.sendRequest(RequirementsOpenBriefComposer, HOST_EXTENSION, {
        requirementEntryId: requirement.entryId,
        supersedesEntryId,
      });
    } catch (err) {
      console.error('RequirementDetail: openBriefComposer (supersedes) failed', err);
    }
  };

  const sourceOptions = prdSections.length > 0 ? prdSections : [requirement.sourcePrdSection];
  const sourceUnrecognised =
    requirement.sourcePrdSection.length > 0 &&
    !prdSections.includes(requirement.sourcePrdSection);

  return (
    <section className="border border-vscode-border rounded-md bg-dos-surface p-4 space-y-3">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono text-dos-muted">{requirement.id}</p>
          <h2 className="text-base font-semibold text-vscode-fg">Edit requirement</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunTestDesigner}
            className="px-3 py-1.5 rounded-md border border-dos-accent text-dos-accent text-xs font-medium hover:bg-dos-surface transition-colors"
          >
            Run Test Designer
          </button>
          <button
            onClick={handleComposeBrief}
            className="px-3 py-1.5 rounded-md border border-dos-accent text-dos-accent text-xs font-medium hover:bg-dos-surface transition-colors"
          >
            Compose Execution Brief
          </button>
          <button
            onClick={onCancel}
            className="text-xs text-dos-muted hover:text-vscode-fg transition-colors"
          >
            Close
          </button>
        </div>
      </header>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-dos-muted">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-dos-muted">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-y font-mono"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-dos-muted">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RequirementCategory)}
            className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm"
          >
            <option value="functional">Functional</option>
            <option value="non-functional">Non-functional</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-dos-muted">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as RequirementPriority)}
            className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm"
          >
            <option value="must">Must</option>
            <option value="should">Should</option>
            <option value="could">Could</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-dos-muted">Source PRD section</label>
          <select
            value={sourcePrdSection}
            onChange={(e) => setSourcePrdSection(e.target.value)}
            className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm"
          >
            {sourceUnrecognised && (
              <option value={requirement.sourcePrdSection}>
                {requirement.sourcePrdSection} (unrecognised)
              </option>
            )}
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s || '—'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-dos-muted">Verification criteria</label>
        {requirement.verificationCriteria.length > 0 ? (
          <ul className="rounded-md border border-vscode-border bg-vscode-bg p-3 text-sm list-disc pl-6 space-y-1">
            {requirement.verificationCriteria.map((vc, i) => (
              <li key={i}>{vc}</li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed border-vscode-border bg-vscode-bg p-3 text-xs text-dos-muted">
            No criteria yet — click <strong>Run Test Designer</strong> above to generate them.
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-dos-muted">Test specification</label>
        {requirement.testSpec ? (
          <div className="rounded-md border border-vscode-border bg-vscode-bg p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-mono text-vscode-fg">{requirement.testSpec.id}</p>
              <button
                onClick={handleOpenTestSpecFile}
                className="text-xs text-dos-accent hover:underline"
              >
                Open file
              </button>
            </div>
            {requirement.testSpec.caseTitles.length > 0 && (
              <ul className="text-xs text-dos-muted list-disc pl-4 space-y-0.5">
                {requirement.testSpec.caseTitles.map((title, i) => (
                  <li key={i}>{title}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-vscode-border bg-vscode-bg p-3 text-xs text-dos-muted">
            No test spec linked yet.
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-dos-muted">Execution briefs</label>
        {requirement.briefs.length > 0 ? (
          <ul className="rounded-md border border-vscode-border bg-vscode-bg p-3 space-y-2 text-sm">
            {requirement.briefs.map((brief) => {
              const isSuperseded = brief.supersededByEntryId !== undefined;
              return (
                <li
                  key={brief.entryId}
                  className="flex flex-wrap items-center gap-3 justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-vscode-fg truncate">{brief.id}</span>
                    <span className="text-xs text-dos-muted">v{brief.version}</span>
                    <span className="text-xs text-dos-muted">·</span>
                    <time className="text-xs text-dos-muted">{brief.createdAt}</time>
                    {isSuperseded && (
                      <span className="text-xs text-amber-400">· superseded</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => handleOpenBrief(brief.entryId)}
                      className="text-dos-accent hover:underline"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleOpenBriefFile(brief.entryId)}
                      className="text-dos-accent hover:underline"
                    >
                      Open file
                    </button>
                    {!isSuperseded && (
                      <button
                        onClick={() => handleComposeNewVersion(brief.entryId)}
                        className="text-dos-accent hover:underline"
                      >
                        Compose new version
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed border-vscode-border bg-vscode-bg p-3 text-xs text-dos-muted">
            No briefs yet — click <strong>Compose Execution Brief</strong> above to start one.
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md border border-vscode-border text-sm text-vscode-fg hover:bg-dos-surface transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete ${requirement.id} — "${requirement.title}"?`)) {
              void onDelete();
            }
          }}
          className="ml-auto px-3 py-2 rounded-md text-sm text-dos-muted hover:text-red-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </section>
  );
}
