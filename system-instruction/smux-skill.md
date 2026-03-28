# tmux-bridge — Cross-Pane Agent Communication

You have access to tmux-bridge tools for communicating with other AI agents and processes running in tmux panes.

## Core Rules

1. **Read before act**: Always call `tmux_read` before `tmux_type` or `tmux_keys`. This is enforced — commands will fail without it.
2. **Read-Act-Read cycle**: After typing, read again to verify your text landed, then send Enter.
3. **Never poll for replies**: Other agents reply directly into YOUR input via tmux-bridge. Do not loop or sleep waiting for responses.
4. **Label panes early**: Use `tmux_name` to give panes human-readable names.

## Workflow: Send a message to another agent

```
1. tmux_list()                          → discover panes
2. tmux_read(target, 20)                → satisfy read guard, see current state
3. tmux_message(target, "your message") → type message with sender info
4. tmux_read(target, 5)                 → verify text landed
5. tmux_keys(target, ["Enter"])         → submit
   STOP — do not read target for reply. Reply comes to YOUR pane.
```

## Workflow: Interact with a non-agent pane (shell, running process)

```
1. tmux_read(target, 20)               → see current output
2. tmux_type(target, "command")         → type command
3. tmux_read(target, 5)                 → verify
4. tmux_keys(target, ["Enter"])         → submit
5. tmux_read(target, 30)               → read output
```

## Available Tools

| Tool | Purpose |
|------|---------|
| `tmux_list` | List all panes with process, label, cwd |
| `tmux_read` | Read last N lines from a pane (satisfies read guard) |
| `tmux_type` | Type text without Enter (requires prior read) |
| `tmux_message` | Type message with auto sender info (requires prior read) |
| `tmux_keys` | Send special keys: Enter, Escape, C-c, etc. (requires prior read) |
| `tmux_name` | Label a pane for easy targeting |
| `tmux_resolve` | Look up pane ID by label |
| `tmux_doctor` | Diagnose tmux connection issues |

## Target Resolution

Targets can be:
- **Pane ID**: `%0`, `%3` (from tmux_list)
- **Session:window.pane**: `main:0.1`
- **Label**: `claude`, `gemini` (set via tmux_name)
