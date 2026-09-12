"use client";
/**
 * CRUD over LiveAvatar contexts — the avatar's knowledge and personality.
 *
 * A context holds the system prompt, the opening line, and any knowledge links.
 * Without one attached to a session the avatar starts in restricted mode and
 * won't answer at all, so this panel is load-bearing, not a nice-to-have.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createContext as createContextRequest,
  deleteContext as deleteContextRequest,
  fetchContext,
  fetchContexts,
  updateContext as updateContextRequest,
} from "@/heygen/client";
import type { AvatarContext, ContextDraft, ContextLink, ContextSummary } from "@/heygen/types";
import { Button, ErrorNote, Field, Panel, TextArea, TextInput } from "./primitives";

const EMPTY_DRAFT: ContextDraft = {
  name: "",
  prompt: "",
  openingText: "",
  links: [],
};

const STARTER_PROMPT = `You are a helpful in-person assistant greeting visitors.

Tone: warm, concise, never more than three sentences.
Knowledge: answer only from what you are told here; if you don't know, say so and offer to take a message.`;

/** Dynamic variables the prompt references, e.g. \${visitor_name}. */
function detectVariables(draft: ContextDraft) {
  const found = new Set<string>();
  const pattern = /\$\{([a-zA-Z0-9_]{1,64})\}/g;
  for (const text of [draft.prompt, draft.openingText]) {
    for (const match of text.matchAll(pattern)) found.add(match[1]);
  }
  return [...found];
}

function toDraft(context: AvatarContext): ContextDraft {
  return {
    name: context.name,
    prompt: context.prompt,
    openingText: context.openingText,
    links: context.links.map((link) => ({ ...link })),
  };
}

type Props = {
  /** The context the next session will use. */
  activeContextId: string;
  onUseContext: (id: string) => void;
};

export function KnowledgeManager({ activeContextId, onUseContext }: Props) {
  const [contexts, setContexts] = useState<ContextSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContextDraft>(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState<ContextDraft>(EMPTY_DRAFT);
  const [listing, setListing] = useState(true);
  const [loadingBody, setLoadingBody] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isNew = selectedId === null;
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline),
    [draft, baseline],
  );
  const variables = useMemo(() => detectVariables(draft), [draft]);

  const refresh = useCallback(async () => {
    setListing(true);
    try {
      setContexts(await fetchContexts());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load contexts.");
    } finally {
      setListing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const open = useCallback(
    async (id: string) => {
      setConfirmDelete(false);
      setLoadingBody(true);
      setSelectedId(id);
      try {
        const next = toDraft(await fetchContext(id));
        setDraft(next);
        setBaseline(next);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load that context.");
      } finally {
        setLoadingBody(false);
      }
    },
    [],
  );

  const startNew = useCallback(() => {
    setConfirmDelete(false);
    setSelectedId(null);
    const next: ContextDraft = { ...EMPTY_DRAFT, prompt: STARTER_PROMPT, links: [] };
    setDraft(next);
    setBaseline(EMPTY_DRAFT);
    setError(null);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = isNew
        ? await createContextRequest(draft)
        : await updateContextRequest(selectedId!, draft);
      const next = toDraft(saved);
      setDraft(next);
      setBaseline(next);
      setSelectedId(saved.id);
      setSavedAt(Date.now());
      await refresh();
      // A brand-new context is almost always the one you want to run next.
      if (isNew) onUseContext(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the context.");
    } finally {
      setSaving(false);
    }
  }, [draft, isNew, onUseContext, refresh, selectedId]);

  const remove = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await deleteContextRequest(selectedId);
      if (activeContextId === selectedId) onUseContext("");
      setSelectedId(null);
      setDraft(EMPTY_DRAFT);
      setBaseline(EMPTY_DRAFT);
      setConfirmDelete(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the context.");
    } finally {
      setSaving(false);
    }
  }, [activeContextId, onUseContext, refresh, selectedId]);

  const patchLink = (index: number, patch: Partial<ContextLink>) =>
    setDraft((current) => ({
      ...current,
      links: current.links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    }));

  const canSave = Boolean(
    draft.name.trim() && draft.prompt.trim() && draft.openingText.trim() && (dirty || isNew),
  );

  return (
    <Panel
      title="Knowledge"
      subtitle="Contexts define what the avatar knows, how it opens, and how it behaves."
      actions={
        <div className="flex items-center gap-1.5">
          <Button onClick={refresh} disabled={listing} className="px-2 py-1.5" title="Refresh list">
            {listing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
          </Button>
          <Button onClick={startNew} variant="primary" className="px-2.5 py-1.5 text-xs">
            <Plus size={13} /> New
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
        <ul className="flex max-h-[26rem] flex-col gap-1 overflow-y-auto pr-1">
          {contexts.length === 0 && !listing && (
            <li className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-[11px] leading-relaxed text-ink-400">
              No contexts yet. Create one so the avatar has something to say.
            </li>
          )}
          {contexts.map((context) => {
            const active = context.id === selectedId;
            const inUse = context.id === activeContextId;
            return (
              <li key={context.id}>
                <button
                  type="button"
                  onClick={() => void open(context.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition",
                    active
                      ? "border-aurora-cyan/50 bg-aurora-cyan/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-ink-200 hover:border-white/25",
                  )}
                >
                  <BookOpen size={13} className="shrink-0 text-ink-400" />
                  <span className="min-w-0 flex-1 truncate">{context.name}</span>
                  {inUse && (
                    <span className="shrink-0 rounded-full bg-aurora-cyan/20 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] text-aurora-cyan">
                      live
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex min-w-0 flex-col gap-3">
          {error && <ErrorNote>{error}</ErrorNote>}

          {loadingBody ? (
            <div className="flex items-center gap-2 py-10 text-xs text-ink-400">
              <Loader2 size={14} className="animate-spin" /> Loading context…
            </div>
          ) : (
            <>
              <Field label="Name">
                <TextInput
                  value={draft.name}
                  maxLength={64}
                  placeholder="Front-desk greeter"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </Field>

              <Field
                label="Opening line"
                hint="Spoken as soon as a session connects."
              >
                <TextInput
                  value={draft.openingText}
                  placeholder="Hi there — I'm Mano's front desk. What can I help you find?"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, openingText: event.target.value }))
                  }
                />
              </Field>

              <Field
                label="Prompt"
                hint="Role, tone, knowledge boundaries and guardrails. Use ${variable} for per-session personalization."
              >
                <TextArea
                  value={draft.prompt}
                  rows={10}
                  placeholder={STARTER_PROMPT}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, prompt: event.target.value }))
                  }
                />
              </Field>

              {variables.length > 0 && (
                <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-400">
                  Dynamic variables:
                  {variables.map((name) => (
                    <code
                      key={name}
                      className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-aurora-violet"
                    >
                      {name}
                    </code>
                  ))}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
                    Knowledge links
                  </span>
                  <Button
                    className="px-2 py-1 text-[11px]"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        links: [...current.links, { url: "", faq: "" }],
                      }))
                    }
                  >
                    <Plus size={12} /> Add
                  </Button>
                </div>
                {draft.links.length === 0 ? (
                  <p className="text-[11px] text-ink-500">
                    Optional. Point at a page and describe what it answers.
                  </p>
                ) : (
                  draft.links.map((link, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-ink-900/40 p-2.5 sm:flex-row sm:items-start"
                    >
                      <Link2 size={13} className="mt-2.5 hidden shrink-0 text-ink-500 sm:block" />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <TextInput
                          value={link.url}
                          placeholder="https://example.com/faq"
                          inputMode="url"
                          className="py-1.5 text-xs"
                          onChange={(event) => patchLink(index, { url: event.target.value })}
                        />
                        <TextInput
                          value={link.faq}
                          placeholder="What this page answers"
                          className="py-1.5 text-xs"
                          onChange={(event) => patchLink(index, { faq: event.target.value })}
                        />
                      </div>
                      <Button
                        variant="danger"
                        className="shrink-0 px-2 py-1.5"
                        title="Remove link"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            links: current.links.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <X size={13} />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button variant="primary" disabled={!canSave || saving} onClick={save}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {isNew ? "Create context" : "Save changes"}
                </Button>

                {!isNew && selectedId !== activeContextId && (
                  <Button onClick={() => onUseContext(selectedId!)}>
                    <Check size={14} /> Use for session
                  </Button>
                )}

                {!isNew &&
                  (confirmDelete ? (
                    <>
                      <Button variant="danger" onClick={remove} disabled={saving}>
                        <Trash2 size={14} /> Really delete
                      </Button>
                      <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    </>
                  ) : (
                    <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                      <Trash2 size={14} /> Delete
                    </Button>
                  ))}

                {dirty ? (
                  <span className="text-[11px] text-aurora-gold">Unsaved changes</span>
                ) : (
                  savedAt && <span className="text-[11px] text-ink-400">Saved</span>
                )}
              </div>

              {!isNew && selectedId === activeContextId && (
                <p className="text-[11px] text-ink-400">
                  Attached to the next session. Restart the session to apply edits.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
