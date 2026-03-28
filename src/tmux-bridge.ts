import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TMUX_BRIDGE_BIN = process.env.TMUX_BRIDGE_PATH || "tmux-bridge";

export interface PaneInfo {
  target: string;
  sessionWindow: string;
  size: string;
  process: string;
  label: string;
  cwd: string;
}

async function run(
  ...args: string[]
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(TMUX_BRIDGE_BIN, args, {
    timeout: 10_000,
    env: { ...process.env },
  });
}

export async function list(): Promise<PaneInfo[]> {
  const { stdout } = await run("list");
  const lines = stdout.trim().split("\n").slice(1); // skip header
  return lines
    .map((line) => {
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length < 4) return null;
      return {
        target: parts[0],
        sessionWindow: parts[1],
        size: parts[2],
        process: parts[3],
        label: parts[4] === "-" ? "" : (parts[4] ?? ""),
        cwd: parts[5] ?? "",
      };
    })
    .filter((p): p is PaneInfo => p !== null);
}

export async function read(
  target: string,
  lines: number = 50
): Promise<string> {
  const { stdout } = await run("read", target, String(lines));
  return stdout;
}

export async function type(target: string, text: string): Promise<void> {
  await run("type", target, text);
}

export async function message(target: string, text: string): Promise<void> {
  await run("message", target, text);
}

export async function keys(target: string, ...keyList: string[]): Promise<void> {
  await run("keys", target, ...keyList);
}

export async function name(target: string, label: string): Promise<void> {
  await run("name", target, label);
}

export async function resolve(label: string): Promise<string> {
  const { stdout } = await run("resolve", label);
  return stdout.trim();
}

export async function id(): Promise<string> {
  const { stdout } = await run("id");
  return stdout.trim();
}

export async function doctor(): Promise<string> {
  const { stdout } = await run("doctor");
  return stdout;
}
