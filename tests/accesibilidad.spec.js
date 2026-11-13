// Pruebas automatizadas de accesibilidad — Clínica Vida Sana
// Herramientas: Playwright (navegador automatizado) + axe-core (motor de reglas WCAG).
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs');
const path = require('path');

const VERSION = process.env.VERSION || 'antes';
const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PAGINAS = [
  { nombre: 'Formulario de citas', ruta: '/index.html' },
  { nombre: 'Página de ayuda', ruta: '/ayuda.html' },
];

// Guarda el resultado completo de axe en /resultados para el informe.
function guardarResultado(nombre, resultados) {
  const carpeta = path.join(__dirname, '..', 'resultados');
  fs.mkdirSync(carpeta, { recursive: true });
  const archivo = path.join(carpeta, `${VERSION}-${nombre.replace(/\s+/g, '-').toLowerCase()}.json`);
  fs.writeFileSync(archivo, JSON.stringify(resultados.violations, null, 2));
}

// Convierte las violaciones en un texto fácil de leer en la consola.
function resumen(violaciones) {
  return violaciones
    .map(v => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} elemento/s)`)
    .join('\n');
}

test.describe(`Accesibilidad WCAG 2.2 AA — versión "${VERSION}"`, () => {
  // CP-01 y CP-02: escaneo automático completo de cada página.
  for (const pagina of PAGINAS) {
    test(`CP-${pagina.ruta === '/index.html' ? '01' : '02'} ${pagina.nombre} no tiene violaciones WCAG 2.2 AA`, async ({ page }, testInfo) => {
      await page.goto(pagina.ruta);
      const resultados = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();

      guardarResultado(pagina.nombre, resultados);
      await testInfo.attach('violaciones-axe.json', {
        body: JSON.stringify(resultados.violations, null, 2),
        contentType: 'application/json',
      });

      expect(resultados.violations.length, `Violaciones encontradas:\n${resumen(resultados.violations)}`).toBe(0);
    });
  }

  // CP-03: criterio de aceptación mínimo para el pipeline (solo impacto crítico o grave).
  test('CP-03 No hay violaciones de impacto crítico o grave', async ({ page }) => {
    await page.goto('/index.html');
    const resultados = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
    const graves = resultados.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    expect(graves.length, `Violaciones críticas/graves:\n${resumen(graves)}`).toBe(0);
  });

  // CP-04: la página declara idioma y título (WCAG 3.1.1 y 2.4.2).
  test('CP-04 La página declara idioma español y tiene título', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('html')).toHaveAttribute('lang', /^es/);
    await expect(page).toHaveTitle(/.+/);
  });

  // CP-05: cada campo del formulario tiene una etiqueta visible asociada (WCAG 1.3.1 y 3.3.2).
  test('CP-05 Todos los campos del formulario tienen etiqueta', async ({ page }) => {
    await page.goto('/index.html');
    for (const etiqueta of ['Nombre completo', 'Cédula', 'Correo electrónico', 'Especialidad', 'Fecha de la cita']) {
      await expect(page.getByLabel(etiqueta), `Falta la etiqueta "${etiqueta}"`).toHaveCount(1, { timeout: 2000 });
    }
  });

  // CP-06: el botón Reservar se alcanza con Tab y funciona con Enter (WCAG 2.1.1 Teclado).
  test('CP-06 El formulario se puede enviar solo con el teclado', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('#nombre').fill('Ana Mora Solís');
    let llegoAlBoton = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const idActivo = await page.evaluate(() => document.activeElement && document.activeElement.id);
      if (idActivo === 'enviar') { llegoAlBoton = true; break; }
    }
    expect(llegoAlBoton, 'El botón "Reservar" no recibe el foco con la tecla Tab').toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.locator('#mensaje')).toContainText(/reservada/i);
  });

  // CP-07: el mensaje de resultado se anuncia a lectores de pantalla (WCAG 4.1.3 Mensajes de estado).
  test('CP-07 El mensaje de resultado se anuncia a lectores de pantalla', async ({ page }) => {
    await page.goto('/index.html');
    const mensaje = page.locator('#mensaje');
    const role = await mensaje.getAttribute('role');
    const live = await mensaje.getAttribute('aria-live');
    expect(role === 'status' || role === 'alert' || live === 'polite' || live === 'assertive',
      'El contenedor #mensaje no tiene role="status" ni aria-live').toBe(true);
  });

  // CP-08: el foco del teclado es visible (WCAG 2.4.7 Foco visible).
  test('CP-08 El foco del teclado es visible en los campos', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('#nombre').focus();
    const contorno = await page.locator('#nombre').evaluate(el => {
      const s = getComputedStyle(el);
      return { estilo: s.outlineStyle, ancho: parseFloat(s.outlineWidth) };
    });
    expect(contorno.estilo !== 'none' && contorno.ancho > 0, 'El campo no muestra indicador de foco').toBe(true);
  });
});
