import { APP_BASE_HREF } from '@angular/common';
import express, { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { renderApplication } from '@angular/platform-server';
import { readFileSync } from 'fs';
import bootstrap from './main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = join(dirname(serverDistFolder), 'browser');
  const indexHtml = join(browserDistFolder, 'index.html');

  // Serve static files from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  server.get('*', (req: Request, res: Response) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    const url = `${protocol}://${headers.host}${originalUrl}`;

    // Read the index.html template
    const document = readFileSync(indexHtml, 'utf8');

    renderApplication(bootstrap, {
      document,
      url,
      platformProviders: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
      .then((html: string) => res.send(html))
      .catch((err: any) => {
        console.error('SSR error:', err);
        res.status(500).send('Internal Server Error');
      });
  });

  return server;
}

// Export the request handler for Firebase Functions or other serverless platforms
export const reqHandler = app();

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
