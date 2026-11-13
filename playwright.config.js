// Configuración de Playwright para el taller de pruebas de accesibilidad.
// La variable VERSION decide qué versión del sitio se prueba: "antes" (con errores) o "despues" (corregida).
const { defineConfig } = require('@playwright/test');

const VERSION = process.env.VERSION || 'antes';
const PUERTO = VERSION === 'antes' ? 4001 : 4002;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: `reporte-${VERSION}`, open: 'never' }],
  ],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    browserName: 'chromium',
    // Opcional: usar un Chrome ya instalado en la computadora (ver README).
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  // Levanta un servidor local con la versión del sitio antes de correr las pruebas.
  webServer: {
    command: `npx http-server ./sitio/${VERSION} -p ${PUERTO} -s -c-1`,
    url: `http://localhost:${PUERTO}/index.html`,
    reuseExistingServer: false,
  },
});
