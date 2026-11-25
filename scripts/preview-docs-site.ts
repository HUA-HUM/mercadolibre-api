// Levanta solo el sitio de documentacion, sin Redis ni el resto del servicio.
// Uso: npm run docs:preview   ->   http://localhost:4310/docs
import express from 'express';
import { createDocsSiteRouter } from '../src/app/infra/docs/docs-site.router';

const port = Number(process.env.DOCS_PREVIEW_PORT ?? 4310);
const basePath = '/docs';
const username = process.env.DOCS_SITE_USER;
const password = process.env.DOCS_SITE_PASSWORD;

const app = express();
app.use(
  basePath,
  createDocsSiteRouter({
    basePath,
    rootDirectory: process.cwd(),
    credentials:
      username !== undefined && password !== undefined
        ? { username, password }
        : undefined,
  }),
);
app.get('/', (_request, response) => response.redirect(basePath));

app.listen(port, (error?: Error) => {
  // Express 5 pasa el error de listen (p. ej. puerto ocupado) a este callback.
  if (error) {
    console.error(
      `No se pudo abrir el puerto ${port}: ${error.message}. Probar con DOCS_PREVIEW_PORT=<otro>.`,
    );
    process.exit(1);
  }
  console.log(`Documentacion en http://localhost:${port}${basePath}`);
});
