# tmux-bridge

MCP server + CLI adapters for [smux](https://github.com/ShawnPana/smux) cross-pane agent communication.

- **For MCP agents** — Gemini CLI, Claude Code, or any MCP client gets structured tool calls with built-in read guards
- **For non-MCP agents** — `kimi-tmux` wraps Kimi CLI with auto tool-call parsing and multi-turn support
- **For all agents** — system instruction teaches the read-act-read workflow out of the box

```bash
# MCP agents (Gemini, Claude Code)
npx @anthropic-fans/tmux-bridge

# Kimi CLI
kimi-tmux "ask the codex pane to review src/auth.ts"
```

## Prerequisites

Install [smux](https://github.com/ShawnPana/smux) first:

```bash
curl -fsSL https://shawnpana.com/smux/install.sh | bash
```

## Install

```bash
npm install -g @anthropic-fans/tmux-bridge
```

## MCP Server

Works with any MCP-compatible agent over stdio.

### Gemini CLI

Add to `~/.gemini/settings.json`:

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

### Claude Code

Add to your MCP config:

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

### Tools

| Tool | Description |
|------|-------------|
| `tmux_list` | List all panes with target, process, label, cwd |
| `tmux_read` | Read last N lines from a pane (satisfies read guard) |
| `tmux_type` | Type text into a pane without pressing Enter |
| `tmux_message` | Send message with auto-prepended sender info |
| `tmux_keys` | Send special keys (Enter, Escape, C-c, etc.) |
| `tmux_name` | Label a pane for easy targeting |
| `tmux_resolve` | Look up pane ID by label |
| `tmux_id` | Print current pane's tmux ID |
| `tmux_doctor` | Diagnose tmux connectivity issues |

## Kimi CLI Adapter

Kimi CLI doesn't support MCP natively. `kimi-tmux` bridges the gap:

```bash
kimi-tmux "list all tmux panes"
kimi-tmux "ask the agent in codex pane to review src/auth.ts"
kimi-tmux "read what claude is working on"
kimi-tmux --rounds 3 "send a message to gemini and wait for the result"
```

How it works:

1. Injects `system-instruction/smux-skill.md` as system prompt
2. Runs Kimi in `--print` non-interactive mode
3. Parses ` ```tool``` ` blocks from output (JSON or function-call style)
4. Executes them via `tmux-bridge` CLI
5. Feeds results back with full transcript (up to 5 rounds)

## Agent Collaboration

### Claude Code ↔ Codex (via smux skill)

Both use `tmux-bridge` directly as bash commands:

```bash
tmux-bridge read codex 20
tmux-bridge message codex "Review src/auth.ts for security issues"
tmux-bridge read codex 20
tmux-bridge keys codex Enter
```

### Gemini ↔ Claude Code (via MCP server)

Gemini uses MCP tool calls:

```
tmux_read(target="claude", lines=20)
tmux_message(target="claude", text="What's the test coverage for src/auth.ts?")
tmux_read(target="claude", lines=5)
tmux_keys(target="claude", keys=["Enter"])
```

### Kimi ↔ Any Agent (via kimi-tmux)

```bash
kimi-tmux "tell the claude pane to run the test suite"
```

### Multi-Agent Setup

```
┌───────────────────────────────────────────────────────────┐
│ tmux session                                              │
│                                                           │
│ ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐ │
│ │ Claude Code │ │   Codex    │ │ Gemini   │ │   Kimi    │ │
│ │  (skill)   │ │  (skill)   │ │  (MCP)   │ │ (kimi-tmux)│ │
│ │            │ │            │ │          │ │           │ │
│ │ label:     │ │ label:     │ │ label:   │ │ label:    │ │
│ │ claude     │ │ codex      │ │ gemini   │ │ kimi      │ │
│ └─────┬──────┘ └─────┬──────┘ └────┬─────┘ └─────┬─────┘ │
│       └──────────────┴─────────────┴─────────────┘       │
│                tmux-bridge (cross-pane IPC)                │
└───────────────────────────────────────────────────────────┘
```

## How It Works

```
MCP path (Gemini, Claude Code, any MCP client):
┌─────────────┐  MCP/stdio  ┌──────────────┐   bash   ┌─────────────┐
│  MCP Agent   │◄───────────►│  tmux-bridge  │◄────────►│    smux      │
└─────────────┘             │  MCP server   │          │  tmux panes  │
                            └──────────────┘          └─────────────┘

CLI path (Kimi):
┌─────────────┐  --print    ┌──────────────┐   bash   ┌─────────────┐
│  Kimi CLI    │◄───────────►│  kimi-tmux    │◄────────►│  tmux-bridge │
└─────────────┘  tool parse │  adapter      │          │  CLI         │
                            └──────────────┘          └─────────────┘
```

## System Instruction

For agents that support custom system prompts, copy `system-instruction/smux-skill.md` into your agent's config. This teaches the read-act-read workflow:

1. **Read before act** — always read a pane before typing or sending keys
2. **Read-Act-Read cycle** — type, verify, then press Enter
3. **Never poll** — other agents reply directly into your pane via tmux-bridge
4. **Label early** — use `tmux_name` for human-readable pane addressing

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TMUX_BRIDGE_PATH` | Path to `tmux-bridge` binary | `tmux-bridge` (in PATH) |
| `KIMI_PATH` | Path to `kimi` binary (kimi-tmux only) | `kimi` (in PATH) |

## Roadmap

### v0.1 (current)
- MCP server with 9 tools wrapping all `tmux-bridge` commands
- `kimi-tmux` CLI adapter with multi-turn tool loop and full transcript
- System instruction for any agent

### v0.2
- Auto-label panes by detecting running agent process
- Health check / heartbeat between agents
- Agent capability advertisement

## Credits

Built on top of [smux](https://github.com/ShawnPana/smux) by [@ShawnPana](https://github.com/ShawnPana).

## License

MIT
