import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** CSP du build : scripts locaux seulement, réseau limité à OSRM, à la BAN et aux tuiles OSM. */
const csp = (osrm: string) =>
  [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Leaflet et les icônes de carte posent des styles en ligne
    "img-src 'self' data: https://tile.openstreetmap.org",
    `connect-src 'self' https://api-adresse.data.gouv.fr ${osrm}`,
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');

export default defineConfig(({ mode }) => {
  const osrm = new URL(loadEnv(mode, '.', 'VITE_').VITE_OSRM_URL || 'https://router.project-osrm.org').origin;
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // Le serveur de dev injecte des scripts en ligne (rechargement à chaud) : la CSP ne vaut que pour le build.
        name: 'csp',
        apply: 'build',
        transformIndexHtml: (html) => html.replace('<head>', `<head>
    <meta http-equiv="Content-Security-Policy" content="${csp(osrm)}" />`),
      },
    ],
    test: { include: ['src/**/*.test.ts'] },
  };
});
