import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chdir } from 'process';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  console.log('Running database migrations...');

  // Change directory to server
  chdir(join(__dirname, 'server'));

  // Run migrations
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });

  console.log('Migrations completed successfully!');
} catch (error) {
  console.error('Error running migrations:', error.message);
  process.exit(1);
}
