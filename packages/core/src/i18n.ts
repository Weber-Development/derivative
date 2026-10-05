import type { EntryType } from "./types";

export interface Messages {
  whatsNew: string;
  /** `{count}` is replaced. */
  unread: string;
  close: string;
  allChanges: string;
  /** Toast button that opens the panel. */
  show: string;
  /** Toast button that hides it. */
  dismiss: string;
  empty: string;
  error: string;
  unreleased: string;
  types: Record<EntryType, string>;
}

export const messages = {
  en: {
    whatsNew: "What's new",
    unread: "{count} new",
    close: "Close",
    allChanges: "All changes",
    show: "Show",
    dismiss: "Dismiss",
    empty: "No updates yet.",
    error: "Updates could not be loaded.",
    unreleased: "Coming soon",
    types: {
      feature: "New",
      improvement: "Improved",
      fix: "Fixed",
      breaking: "Breaking",
      security: "Security",
      deprecated: "Deprecated",
      removed: "Removed",
      other: "Changed",
    },
  },
  de: {
    whatsNew: "Neuigkeiten",
    unread: "{count} neu",
    close: "Schliessen",
    allChanges: "Alle Änderungen",
    show: "Ansehen",
    dismiss: "Ausblenden",
    empty: "Noch keine Neuigkeiten.",
    error: "Neuigkeiten konnten nicht geladen werden.",
    unreleased: "Demnächst",
    types: {
      feature: "Neu",
      improvement: "Verbessert",
      fix: "Behoben",
      breaking: "Wichtig",
      security: "Sicherheit",
      deprecated: "Veraltet",
      removed: "Entfernt",
      other: "Geändert",
    },
  },
  fr: {
    whatsNew: "Nouveautés",
    unread: "{count} nouveau(x)",
    close: "Fermer",
    allChanges: "Toutes les modifications",
    show: "Voir",
    dismiss: "Masquer",
    empty: "Aucune nouveauté pour le moment.",
    error: "Impossible de charger les nouveautés.",
    unreleased: "Bientôt",
    types: {
      feature: "Nouveau",
      improvement: "Amélioré",
      fix: "Corrigé",
      breaking: "Important",
      security: "Sécurité",
      deprecated: "Obsolète",
      removed: "Supprimé",
      other: "Modifié",
    },
  },
  it: {
    whatsNew: "Novità",
    unread: "{count} nuove",
    close: "Chiudi",
    allChanges: "Tutte le modifiche",
    show: "Vedi",
    dismiss: "Nascondi",
    empty: "Ancora nessuna novità.",
    error: "Impossibile caricare le novità.",
    unreleased: "In arrivo",
    types: {
      feature: "Nuovo",
      improvement: "Migliorato",
      fix: "Corretto",
      breaking: "Importante",
      security: "Sicurezza",
      deprecated: "Deprecato",
      removed: "Rimosso",
      other: "Modificato",
    },
  },
} satisfies Record<string, Messages>;

export type Locale = keyof typeof messages;

/** Picks messages for a BCP 47 tag (`de-CH` → `de`), falling back to English. */
export function getMessages(lang?: string | null, overrides?: Partial<Messages>): Messages {
  const base = (lang ?? "en").toLowerCase().split("-")[0] as Locale;
  const picked: Messages = messages[base] ?? messages.en;
  return overrides
    ? { ...picked, ...overrides, types: { ...picked.types, ...overrides.types } }
    : picked;
}

export function formatDate(date: string | undefined, lang?: string | null): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(lang ?? "en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: date.length === 10 ? "UTC" : undefined,
  }).format(parsed);
}
