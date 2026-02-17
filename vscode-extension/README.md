# TaskOS VS Code Extension

Task management and AI code generation directly from VS Code.

## Features

- 📋 **Task Management**: View and manage your TaskOS tasks directly in VS Code
- 🤖 **AI Code Generation**: Generate code using AI based on task descriptions
- ⚡ **Quick Actions**: Create tasks from selected code or text
- 🔄 **Real-time Sync**: Keep your tasks in sync with TaskOS

## Installation

1. Install the extension from the VS Code marketplace (coming soon)
2. Or install from source:
   ```bash
   cd vscode-extension
   npm install
   npm run compile
   ```

## Configuration

1. Get your API key from [TaskOS Account Settings](https://www.task-os.app/en/app/account) → Security → API Keys
2. Open VS Code Settings (Ctrl+,)
3. Search for "TaskOS"
4. Enter your API key in `TaskOS: Api Key`
5. (Optional) Set your default workspace ID in `TaskOS: Default Workspace Id`

Or use the command palette:
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Type "TaskOS: Configure API Key"
- Enter your API key

## Usage

### View Tasks

1. Open the TaskOS sidebar (click the TaskOS icon in the activity bar)
2. Your tasks will be displayed in the tree view

### Create Task from Selection

1. Select some text in your editor
2. Right-click → "TaskOS: Create Task from Selection"
3. Enter task details and priority
4. The task will be created in your default workspace

### Generate Code with AI

1. Select some text in your editor (optional - can be used as context)
2. Right-click → "TaskOS: Generate Code with AI"
3. Describe what code you want to generate
4. Select programming language (optional)
5. The generated code will open in a new editor

### Open Task Panel

- Press `Ctrl+Shift+P` → "TaskOS: Open Task Panel"
- Or click the refresh icon in the TaskOS sidebar

## Commands

- `TaskOS: Open Task Panel` - Open the full task management panel
- `TaskOS: Create Task from Selection` - Create a task from selected text
- `TaskOS: Generate Code with AI` - Generate code using AI
- `TaskOS: Configure API Key` - Configure your API key

## Requirements

- VS Code 1.80.0 or higher
- TaskOS Pro or Enterprise plan (for API access)

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Package extension
npm run package
```

## License

MIT
