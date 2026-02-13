import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';
import { setupTerminalWs } from './src/lib/terminal-ws';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url || '/', true));
  });

  setupTerminalWs(server);

  server.listen(port, '0.0.0.0', () => {
    console.log(`devpanel running on http://0.0.0.0:${port}`);
  });
});
