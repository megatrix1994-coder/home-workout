import 'dotenv/config';
import path from 'node:path';
import { createApp } from './app.js';

const production = process.env.NODE_ENV === 'production';

if (production && !process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required in production.');
  process.exit(1);
}

const port = Number(process.env.PORT ?? 4000);
const clientDir = process.env.CLIENT_DIR ?? path.resolve(__dirname, '../../client/dist');
const app = createApp(production ? { clientDir } : {});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
