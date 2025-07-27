import { APP_BASE_HREF } from '@angular/common';
import express, { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bootstrap from './main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = join(dirname(serverDistFolder), 'browser');

  // Serve static files from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  server.get('*', (req: Request, res: Response) => {
    bootstrap()
      .then(appRef => {
        res.render('index', { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
      })
      .catch(err => {
        console.error('Error occurred:', err);
        res.status(500).send(err);
      });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// If this file is the entry point, run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export default bootstrap;
