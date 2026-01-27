import { config } from 'dotenv';
import { spawn } from 'child_process';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Run the migration with interactive input, auto-answer "No" to all prompts
const child = spawn('npx', ['drizzle-kit', 'push'], { 
  stdio: ['pipe', 'inherit', 'inherit'],
  env: { ...process.env },
  shell: true
});

// Send 'N' (for No) multiple times to answer all truncation prompts
const responses = '\n\n\n\n\n\n\n\n\n\n';
child.stdin.write(responses);

// Also try after a short delay
setTimeout(() => {
  child.stdin.write(responses);
}, 2000);

setTimeout(() => {
  child.stdin.write(responses);
  child.stdin.end();
}, 5000);

child.on('close', (code) => {
  process.exit(code);
});
