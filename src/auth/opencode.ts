import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import { UsageError } from "../domain.js"

export type OAuthCredential = {
  access: string
  accountID?: string
  expires?: number
}

type StoredCredential = {
  type?: unknown
  access?: unknown
  expires?: unknown
  accountId?: unknown
}

export interface CredentialSource {
  getOAuth(providerID: string): Promise<OAuthCredential>
}

export function authFilePath(env: NodeJS.ProcessEnv = process.env): string {
  const dataHome = env.XDG_DATA_HOME || join(env.HOME || homedir(), ".local", "share")
  return join(dataHome, "opencode", "auth.json")
}

function parseStore(value: string, source: string): Record<string, StoredCredential> {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected an object")
    return parsed as Record<string, StoredCredential>
  } catch (error) {
    throw new UsageError("auth_unsupported", `OpenCode authentication data from ${source} is invalid.`, {
      cause: error,
    })
  }
}

export class OpenCodeCredentialSource implements CredentialSource {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async getOAuth(providerID: string): Promise<OAuthCredential> {
    let raw: string
    let source: string

    if (this.env.OPENCODE_AUTH_CONTENT) {
      raw = this.env.OPENCODE_AUTH_CONTENT
      source = "OPENCODE_AUTH_CONTENT"
    } else {
      source = authFilePath(this.env)
      try {
        raw = await readFile(source, "utf8")
      } catch (error) {
        throw new UsageError(
          "auth_missing",
          `No OpenCode authentication store was found. Connect ${providerID} with /connect first.`,
          { cause: error },
        )
      }
    }

    const stored = parseStore(raw, source)[providerID]
    if (!stored) {
      throw new UsageError("auth_missing", `No ${providerID} account is connected. Use /connect first.`)
    }
    if (stored.type !== "oauth" || typeof stored.access !== "string" || !stored.access) {
      throw new UsageError(
        "auth_unsupported",
        `${providerID} usage requires a ChatGPT OAuth connection. Reconnect it with /connect.`,
      )
    }
    if (typeof stored.expires === "number" && stored.expires <= Date.now()) {
      throw new UsageError(
        "auth_expired",
        `The ${providerID} session has expired. Reconnect it with /connect or make an ${providerID} request to refresh it.`,
      )
    }

    return {
      access: stored.access,
      accountID: typeof stored.accountId === "string" ? stored.accountId : undefined,
      expires: typeof stored.expires === "number" ? stored.expires : undefined,
    }
  }
}
