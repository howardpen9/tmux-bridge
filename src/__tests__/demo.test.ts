/**
 * Demo tests — requires tmux to be available.
 * Skipped if tmux is not installed.
 */
import { describe, it, expect, afterAll } from "vitest";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SESSION = "tmux-bridge-demo";

let tmuxAvailable = false;
try {
  execFileSync("tmux", ["-V"], { timeout: 3000 });
  tmuxAvailable = true;
} catch {
  tmuxAvailable = false;
}

async function tmux(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("tmux", args, { timeout: 10_000 });
  return stdout;
}

async function tmuxNoFail(...args: string[]): Promise<void> {
  try {
    await execFileAsync("tmux", args, { timeout: 10_000 });
  } catch {
    // ignore
  }
}

describe.skipIf(!tmuxAvailable)("demo", () => {
  afterAll(async () => {
    await tmuxNoFail("kill-session", "-t", SESSION);
  });

  it("runDemo creates session, panes, and labels", { timeout: 30_000 }, async () => {
    // Clean up any leftover session first
    await tmuxNoFail("kill-session", "-t", SESSION);

    // Import and run the demo
    const { runDemo } = await import("../demo.js");
    await runDemo();

    // Verify session exists
    const sessions = await tmux("list-sessions", "-F", "#{session_name}");
    expect(sessions).toContain(SESSION);

    // Verify 3 panes exist
    const paneOutput = await tmux(
      "list-panes",
      "-t",
      SESSION,
      "-F",
      "#{pane_id}"
    );
    const paneIds = paneOutput.trim().split("\n").filter(Boolean);
    expect(paneIds).toHaveLength(3);

    // Verify pane labels
    const labels: string[] = [];
    for (const paneId of paneIds) {
      const label = await tmux(
        "show-options",
        "-p",
        "-t",
        paneId,
        "-v",
        "@name"
      );
      labels.push(label.trim());
    }
    expect(labels).toContain("agent-1");
    expect(labels).toContain("agent-2");
    expect(labels).toContain("agent-3");
  });

  it("session can be killed cleanly", async () => {
    // Session should exist from prior test
    await tmux("kill-session", "-t", SESSION);

    // Verify session is gone
    try {
      await tmux("has-session", "-t", SESSION);
      // Should not reach here
      expect.unreachable("session should have been killed");
    } catch {
      // Expected: session not found error
    }
  });
});
