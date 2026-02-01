# Installation Guide

## Prerequisites

- Node.js 18+ and npm
- VS Code 1.80.0 or higher
- TaskOS Pro or Enterprise account with API key

## Setup Steps

### 1. Install Dependencies

```bash
cd vscode-extension
npm install
```

### 2. Compile TypeScript

```bash
npm run compile
```

### 3. Get Your API Key

1. Log in to TaskOS
2. Go to **Account Settings** → **Security** → **API Keys**
3. Click **Create Key**
4. Give it a name (e.g., "VS Code Extension")
5. **Copy the key immediately** - you won't be able to see it again!

### 4. Configure the Extension

#### Option A: Using VS Code Settings

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "TaskOS"
3. Enter your API key in `TaskOS: Api Key`
4. (Optional) Set your default workspace ID

#### Option B: Using Command Palette

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "TaskOS: Configure API Key"
3. Enter your API key

### 5. Test the Extension

1. Press `F5` to open a new Extension Development Host window
2. In the new window, open the Command Palette (`Ctrl+Shift+P`)
3. Try "TaskOS: Open Task Panel"
4. Or check the TaskOS sidebar (click the TaskOS icon in the activity bar)

## Development

### Watch Mode

```bash
npm run watch
```

This will automatically recompile when you make changes.

### Package Extension

```bash
npm run package
```

This creates a `.vsix` file that can be installed manually or published to the marketplace.

### Debugging

1. Open the `vscode-extension` folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. Set breakpoints in your TypeScript files
4. The debugger will attach automatically

## Troubleshooting

### Extension Not Activating

- Check that your API key is correctly configured
- Verify the API key starts with `taskos_`
- Check the VS Code Output panel for error messages

### API Errors

- Verify your API key is valid and not expired
- Check that you have a Pro or Enterprise plan
- Ensure your API URL is correct (default: `https://taskos.com/api/v1`)

### Tasks Not Loading

- Verify your default workspace ID is set
- Check that you have tasks in that workspace
- Look for error messages in the Output panel

## Next Steps

- Read the [README.md](./README.md) for usage instructions
- Check the [API Documentation](../../docs/API.md) for API details
- Report issues on GitHub
