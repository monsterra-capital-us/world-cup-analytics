import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { TournamentState } from "./types";

/**
 * Pluggable persistence for the tournament state.
 *
 * - With POSTGRES_URL (or DATABASE_URL) set — e.g. on Vercel with a
 *   Postgres/Neon database attached — state lives in a single JSONB row.
 * - Otherwise it falls back to data/state.json on disk, which is fine for
 *   local development and any host with a persistent filesystem.
 */
export interface StateStorage {
  load(): Promise<TournamentState | null>;
  save(state: TournamentState): Promise<void>;
}

// ─────────────────────────── file backend ───────────────────────────

const STATE_FILE = path.join(process.cwd(), "data", "state.json");

class FileStorage implements StateStorage {
  async load(): Promise<TournamentState | null> {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as TournamentState;
    } catch {
      return null;
    }
  }

  async save(state: TournamentState): Promise<void> {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }
}

// ───────────────────────── postgres backend ─────────────────────────

class PostgresStorage implements StateStorage {
  private pool: Pool;
  private ready: Promise<void> | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 3 });
  }

  private ensureTable(): Promise<void> {
    if (!this.ready) {
      this.ready = this.pool
        .query(
          `CREATE TABLE IF NOT EXISTS tournament_state (
             id INT PRIMARY KEY,
             data JSONB NOT NULL,
             updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
           )`,
        )
        .then(() => undefined);
    }
    return this.ready;
  }

  async load(): Promise<TournamentState | null> {
    await this.ensureTable();
    const res = await this.pool.query(
      "SELECT data FROM tournament_state WHERE id = 1",
    );
    return res.rows[0] ? (res.rows[0].data as TournamentState) : null;
  }

  async save(state: TournamentState): Promise<void> {
    await this.ensureTable();
    await this.pool.query(
      `INSERT INTO tournament_state (id, data, updated_at)
       VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [JSON.stringify(state)],
    );
  }
}

// ─────────────────────────── selection ───────────────────────────

declare global {
  // survive Next.js dev-mode module reloads
  var __wc26Storage: StateStorage | undefined;
}

export function getStorage(): StateStorage {
  if (!globalThis.__wc26Storage) {
    const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
    globalThis.__wc26Storage = url ? new PostgresStorage(url) : new FileStorage();
  }
  return globalThis.__wc26Storage;
}
