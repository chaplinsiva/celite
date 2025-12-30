# MCP Server Configuration

This directory contains the MCP server configuration for Cursor.

## How to Add MCP Configuration to Cursor

The MCP server configuration needs to be added to Cursor's settings file. Here's how:

### On Windows:

1. Open Cursor
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the command palette
3. Type "Preferences: Open User Settings (JSON)" and select it
4. Add the following configuration to your `settings.json`:

```json
{
  "mcpServers": {
    "shadcn-ui": {
      "command": "npx",
      "args": [
        "@jpisnice/shadcn-ui-mcp-server",
        "--github-api-key",
        "ghp_your_token_here"
      ]
    }
  }
}
```

### Alternative Method:

You can also manually edit the settings file at:
- **Windows**: `%APPDATA%\Cursor\User\settings.json`
- **Mac**: `~/Library/Application Support/Cursor/User/settings.json`
- **Linux**: `~/.config/Cursor/User/settings.json`

### After Adding:

1. Save the settings file
2. Restart Cursor for the changes to take effect
3. The shadcn-ui MCP server should now be available

## Configuration Details

- **Server Name**: `shadcn-ui`
- **Command**: `npx`
- **Package**: `@jpisnice/shadcn-ui-mcp-server`
- **GitHub API Key**: Configured (stored in settings)

