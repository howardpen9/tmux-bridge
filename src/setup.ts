import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

const MCP_ENTRY = {
  command: "npx",
  args: ["-y", "tmux-bridge-mcp"],
};

interface AgentResult {
  name: string;
  ok: boolean;
  detail: string;
}

export async function whichBinary(name: string): Promise<boolean> {
  try {
    await execFileAsync("which", [name], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Pure merge logic: given existing JSON content (or undefined/empty for new file),
 * returns the merged JSON string with tmux-bridge entry added/updated.
 * Throws on invalid JSON.
 */
export function mergeConfigJson(
  existing: string | undefined,
  entry: Record<string, unknown> = MCP_ENTRY
): string {
  let config: Record<string, unknown> = {};
  if (existing !== undefined && existing.trim() !== "") {
    config = JSON.parse(existing);
  }
  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }
  (config.mcpServers as Record<string, unknown>)["tmux-bridge"] = entry;
  return JSON.stringify(config, null, 2) + "\n";
}

async function jsonMergeConfig(
  filePath: string,
  agentName: string
): Promise<AgentResult> {
  try {
    // Ensure parent directory exists
    const dir = join(filePath, "..");
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    let config: Record<string, unknown> = {};
    if (existsSync(filePath)) {
      const raw = await readFile(filePath, "utf-8");
      config = JSON.parse(raw);
      // Backup with timestamp
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      await copyFile(filePath, `${filePath}.backup-${ts}`);
    }

    // Ensure mcpServers key exists
    if (!config.mcpServers || typeof config.mcpServers !== "object") {
      config.mcpServers = {};
    }
    (config.mcpServers as Record<string, unknown>)["tmux-bridge"] = MCP_ENTRY;

    await writeFile(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
    return { name: agentName, ok: true, detail: `config written to ${filePath.replace(homedir(), "~")}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { name: agentName, ok: false, detail: msg };
  }
}

async function setupClaudeCode(): Promise<AgentResult> {
  const name = "Claude Code (claude)";
  if (!(await whichBinary("claude"))) {
    return { name, ok: false, detail: "not found" };
  }
  const configPath = join(homedir(), ".claude.json");
  return jsonMergeConfig(configPath, name);
}

async function setupGemini(): Promise<AgentResult> {
  const name = "Gemini CLI (gemini)";
  if (!(await whichBinary("gemini"))) {
    return { name, ok: false, detail: "not found" };
  }
  const configPath = join(homedir(), ".gemini", "settings.json");
  return jsonMergeConfig(configPath, name);
}

async function setupCodex(): Promise<AgentResult> {
  const name = "Codex CLI (codex)";
  if (!(await whichBinary("codex"))) {
    return { name, ok: false, detail: "not found" };
  }
  try {
    await execFileAsync("codex", ["mcp", "add", "tmux-bridge", "--", "npx", "tmux-bridge-mcp"], {
      timeout: 15_000,
    });
    return { name, ok: true, detail: "added via codex mcp add" };
  } catch (e) {
    const msg = e instanceof Error ? (e as NodeJS.ErrnoException & { stderr?: string }).stderr || e.message : String(e);
    return { name, ok: false, detail: msg };
  }
}

async function setupKimi(): Promise<AgentResult> {
  if (!(await whichBinary("kimi"))) {
    return { name: "Kimi CLI (kimi)", ok: false, detail: "not found" };
  }

  // Check version
  let version = "unknown";
  try {
    const { stdout } = await execFileAsync("kimi", ["--version"], { timeout: 5_000 });
    version = stdout.trim().replace(/^kimi\s*/i, "");
  } catch {
    // ignore
  }

  const name = `Kimi CLI v${version}`;

  // Parse version: need >= 1.26
  const vMatch = version.match(/^(\d+)\.(\d+)/);
  if (vMatch) {
    const major = parseInt(vMatch[1], 10);
    const minor = parseInt(vMatch[2], 10);
    if (major < 1 || (major === 1 && minor < 26)) {
      return {
        name,
        ok: false,
        detail: `version ${version} < 1.26 — MCP not supported. Use kimi-tmux wrapper instead.`,
      };
    }
  }

  try {
    await execFileAsync("kimi", ["mcp", "add", "tmux-bridge", "--", "npx", "tmux-bridge-mcp"], {
      timeout: 15_000,
    });
    return { name, ok: true, detail: "added via kimi mcp add" };
  } catch (e) {
    const msg = e instanceof Error ? (e as NodeJS.ErrnoException & { stderr?: string }).stderr || e.message : String(e);
    return { name, ok: false, detail: msg };
  }
}

export async function runSetup(): Promise<void> {
  console.log("tmux-bridge-mcp setup\n");
  console.log("Detecting agents...");

  const results = await Promise.all([
    setupClaudeCode(),
    setupGemini(),
    setupKimi(),
    setupCodex(),
  ]);

  for (const r of results) {
    const icon = r.ok ? "\u2713" : "\u2717";
    console.log(`  ${icon} ${r.name} — ${r.detail}`);
  }

  const anyOk = results.some((r) => r.ok);
  console.log("");
  if (anyOk) {
    console.log("Setup complete! Restart your agents to activate tmux-bridge tools.");
    console.log("Run 'npx tmux-bridge-mcp demo' to see it in action.");
  } else {
    console.log("No agents were configured. Install at least one supported agent CLI first.");
  }
}
