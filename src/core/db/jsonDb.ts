import fs from "node:fs";
import { getAppConfig } from "@/core/config/appConfig";
import { ensureDataDirs } from "@/core/utils/fileStorage";

type TableName =
  | "documents"
  | "document_pages"
  | "chunks"
  | "chat_sessions"
  | "chat_messages"
  | "answer_citations";
type Row = Record<string, unknown>;
type Store = Record<TableName, Row[]>;

let store: JsonDb | null = null;

function emptyStore(): Store {
  return {
    documents: [],
    document_pages: [],
    chunks: [],
    chat_sessions: [],
    chat_messages: [],
    answer_citations: [],
  };
}

function readStore(filePath: string): Store {
  if (!fs.existsSync(filePath)) return emptyStore();
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<Store>;
  return { ...emptyStore(), ...parsed };
}

export class JsonDb {
  private filePath: string;
  private data: Store;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = readStore(filePath);
  }

  persist() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  all<T>(table: TableName): T[] {
    return [...this.data[table]] as T[];
  }

  insert<T>(table: TableName, row: T, unique?: (existing: T) => boolean): T {
    const rows = this.data[table] as T[];
    const existingIndex = unique
      ? rows.findIndex(unique)
      : rows.findIndex(
          (item) =>
            (item as { id?: unknown }).id === (row as { id?: unknown }).id,
        );
    if (existingIndex >= 0) rows[existingIndex] = row;
    else rows.push(row);
    this.persist();
    return row;
  }

  update<T>(
    table: TableName,
    predicate: (row: T) => boolean,
    updater: (row: T) => T,
  ) {
    const rows = this.data[table] as T[];
    let changed = false;
    for (let i = 0; i < rows.length; i += 1) {
      if (predicate(rows[i])) {
        rows[i] = updater(rows[i]);
        changed = true;
      }
    }
    if (changed) this.persist();
  }

  find<T>(table: TableName, predicate: (row: T) => boolean): T | null {
    return ((this.data[table] as T[]).find(predicate) as T | undefined) ?? null;
  }

  filter<T>(table: TableName, predicate: (row: T) => boolean): T[] {
    return (this.data[table] as T[]).filter(predicate);
  }
}

export function getDb(): JsonDb {
  if (store) return store;
  ensureDataDirs();
  store = new JsonDb(getAppConfig().metadataPath);
  store.persist();
  return store;
}
