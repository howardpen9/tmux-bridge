/**
 * Setup module tests — JSON merge logic (pure function) and whichBinary.
 */
import { describe, it, expect } from "vitest";
import { mergeConfigJson, whichBinary } from "../setup.js";

describe("mergeConfigJson", () => {
  it("creates new config when existing is undefined", () => {
    const result = mergeConfigJson(undefined);
    const parsed = JSON.parse(result);
    expect(parsed.mcpServers).toBeDefined();
    expect(parsed.mcpServers["tmux-bridge"]).toEqual({
      command: "npx",
      args: ["-y", "tmux-bridge-mcp"],
    });
  });

  it("creates new config when existing is empty string", () => {
    const result = mergeConfigJson("");
    const parsed = JSON.parse(result);
    expect(parsed.mcpServers["tmux-bridge"]).toBeDefined();
  });

  it("preserves existing mcpServers entries", () => {
    const existing = JSON.stringify({
      mcpServers: {
        other: { command: "other-cmd" },
      },
    });
    const result = mergeConfigJson(existing);
    const parsed = JSON.parse(result);
    expect(parsed.mcpServers.other).toEqual({ command: "other-cmd" });
    expect(parsed.mcpServers["tmux-bridge"]).toEqual({
      command: "npx",
      args: ["-y", "tmux-bridge-mcp"],
    });
  });

  it("updates existing tmux-bridge entry without duplicating", () => {
    const existing = JSON.stringify({
      mcpServers: {
        "tmux-bridge": { command: "old-command" },
        other: { command: "keep-me" },
      },
    });
    const result = mergeConfigJson(existing);
    const parsed = JSON.parse(result);
    expect(parsed.mcpServers["tmux-bridge"]).toEqual({
      command: "npx",
      args: ["-y", "tmux-bridge-mcp"],
    });
    expect(parsed.mcpServers.other).toEqual({ command: "keep-me" });
    expect(Object.keys(parsed.mcpServers)).toHaveLength(2);
  });

  it("preserves non-mcpServers keys in config", () => {
    const existing = JSON.stringify({
      someOtherKey: "value",
      mcpServers: {},
    });
    const result = mergeConfigJson(existing);
    const parsed = JSON.parse(result);
    expect(parsed.someOtherKey).toBe("value");
    expect(parsed.mcpServers["tmux-bridge"]).toBeDefined();
  });

  it("creates mcpServers key when missing from existing config", () => {
    const existing = JSON.stringify({ theme: "dark" });
    const result = mergeConfigJson(existing);
    const parsed = JSON.parse(result);
    expect(parsed.theme).toBe("dark");
    expect(parsed.mcpServers["tmux-bridge"]).toBeDefined();
  });

  it("throws on invalid JSON", () => {
    expect(() => mergeConfigJson("{invalid json")).toThrow();
  });

  it("accepts custom entry object", () => {
    const custom = { command: "custom-cmd", args: ["--flag"] };
    const result = mergeConfigJson(undefined, custom);
    const parsed = JSON.parse(result);
    expect(parsed.mcpServers["tmux-bridge"]).toEqual(custom);
  });

  it("output ends with newline", () => {
    const result = mergeConfigJson(undefined);
    expect(result.endsWith("\n")).toBe(true);
  });
});

describe("whichBinary", () => {
  it("returns true for a known binary (node)", async () => {
    // "node" should always be available in test environment
    const result = await whichBinary("node");
    expect(result).toBe(true);
  });

  it("returns false for a nonexistent binary", async () => {
    const result = await whichBinary("definitely-not-a-real-binary-xyz123");
    expect(result).toBe(false);
  });
});
