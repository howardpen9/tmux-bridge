# tmux-bridge

MCP server that bridges [smux](https://github.com/ShawnPana/smux)'s `tmux-bridge` CLI to any MCP-compatible AI agent — starting with Google Gemini CLI.

Instead of teaching each agent how to run bash commands for cross-pane communication, this MCP server exposes tmux-bridge as structured tool calls with built-in read guards and proper error handling.

## Why

[smux](https://github.com/ShawnPana/smux) enables agent-to-agent communication through tmux panes. It works great with agents that have native skill systems (like Claude Code), but agents like **Gemini CLI** need an MCP server to participate cleanly.

This project provides:

- **MCP Server** — `tmux-bridge` commands as MCP tools (`tmux_list`, `tmux_read`, `tmux_type`, `tmux_keys`, etc.)
- **System Instruction** — ready-to-use prompt that teaches any agent the read-act-read workflow
- **Zero config** — if `tmux-bridge` is in PATH (installed via smux), it just works

## Prerequisites

Install [smux](https://github.com/ShawnPana/smux) first:

```bash
curl -fsSL https://shawnpana.com/smux/install.sh | bash
```

## Install

```bash
npm install @anthropic-fans/tmux-bridge
```

## Usage with Gemini CLI

Add to your Gemini CLI MCP config (`~/.gemini/settings.json`):

```json
{
  "mcpServers": {
    "tmux-bridge": {
      "command": "npx",
      "args": ["@anthropic-fans/tmux-bridge"]
    }
  }
}
```

## Usage with Claude Code

Add to your Claude Code MCP config:

```json
{
  "mcpServers": {
    "tmux-bridge": {
      "command": "npx",
      "args": ["@anthropic-fans/tmux-bridge"]
    }
  }
}
```

## Usage with Any MCP Client

The server runs over stdio. Any MCP-compatible client can connect:

```bash
npx @anthropic-fans/tmux-bridge
```

## Available Tools

| Tool | Description |
|------|-------------|
| `tmux_list` | List all panes with target, process, label, cwd |
| `tmux_read` | Read last N lines from a pane (satisfies read guard) |
| `tmux_type` | Type text into a pane without pressing Enter |
| `tmux_message` | Send message with auto-prepended sender info |
| `tmux_keys` | Send special keys (Enter, Escape, C-c, etc.) |
| `tmux_name` | Label a pane for easy targeting |
| `tmux_resolve` | Look up pane ID by label |
| `tmux_doctor` | Diagnose tmux connectivity issues |

## Usage with Kimi CLI

Kimi CLI doesn't support MCP natively. We provide `kimi-tmux` — a wrapper that injects the smux system instruction and handles tool call parsing automatically:

```bash
# Install globally
npm install -g @anthropic-fans/tmux-bridge

# Use directly
kimi-tmux "list all tmux panes"
kimi-tmux "ask the agent in codex pane to review src/auth.ts"
kimi-tmux "read what claude is working on"
```

How it works:
1. Injects `system-instruction/smux-skill.md` as system prompt
2. Runs Kimi in `--print` non-interactive mode
3. Parses ` ```tool ``` ` blocks from Kimi's output
4. Executes them via `tmux-bridge` CLI
5. Feeds results back for multi-turn tool use (up to 5 rounds)

## Agent Collaboration Examples

### Claude Code ↔ Codex (via smux skill)

Both Claude Code and Codex can use `tmux-bridge` directly as bash commands:

```bash
# Claude Code pane — ask Codex to review
tmux-bridge read codex 20
tmux-bridge message codex "Review src/auth.ts for security issues"
tmux-bridge read codex 20
tmux-bridge keys codex Enter
# Codex replies back into Claude's pane via tmux-bridge
```

### Gemini CLI ↔ Claude Code (via this MCP server)

Gemini uses MCP tool calls instead of raw bash:

```
# Gemini calls MCP tools:
tmux_read(target="claude", lines=20)
tmux_message(target="claude", text="What's the test coverage for src/auth.ts?")
tmux_read(target="claude", lines=5)
tmux_keys(target="claude", keys=["Enter"])
```

### Three-Agent Setup: Claude + Codex + Gemini

```
┌──────────────────────────────────────────────────────┐
│ tmux session                                         │
│ ┌────────────┐ ┌────────────┐ ┌────────────────────┐ │
│ │ Claude Code │ │   Codex    │ │    Gemini CLI      │ │
│ │ (skill)    │ │  (skill)   │ │ (MCP server)       │ │
│ │            │ │            │ │                    │ │
│ │ label:     │ │ label:     │ │ label:             │ │
│ │ claude     │ │ codex      │ │ gemini             │ │
│ └────────────┘ └────────────┘ └────────────────────┘ │
│         ▲            ▲               ▲               │
│         └────────────┴───────────────┘               │
│              tmux-bridge (cross-pane IPC)             │
└──────────────────────────────────────────────────────┘
```

## System Instruction

For agents that support custom system prompts, copy `system-instruction/smux-skill.md` into your agent's config. This teaches the agent the read-act-read workflow and when to use each tool.

## How It Works

```
                        MCP/stdio                        bash
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Gemini CLI  │◄──►│  tmux-bridge  │◄──►│    smux      │
│  Claude Code │    │  MCP server   │    │  tmux panes  │
│  Any MCP     │    └──────────────┘    └─────────────┘
└─────────────┘

                      wrapper/shim                       bash
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Kimi CLI    │◄──►│  kimi-tmux    │◄──►│  tmux-bridge │
│  (v0.2)      │    │  adapter      │    │  CLI         │
└─────────────┘    └──────────────┘    └─────────────┘
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TMUX_BRIDGE_PATH` | Path to `tmux-bridge` binary | `tmux-bridge` (from PATH) |

## Roadmap

### v0.1 (current)
- MCP server wrapping all `tmux-bridge` commands
- `kimi-tmux` CLI adapter for Kimi CLI (text-based tool call parsing)
- System instruction for Gemini CLI and Kimi CLI
- Works with any MCP-compatible agent + Kimi via wrapper

### v0.2 — Enhanced agent discovery
- Auto-label panes by detecting running agent process
- Health check / heartbeat between agents
- Agent capability advertisement (what can each agent do?)

## License

MIT
