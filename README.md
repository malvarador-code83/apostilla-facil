# Apostilla sin adivinar 📑

> **Sabe exactamente qué necesita tu documento antes de ir al Ministerio.**
> Prototipo para la **Hackatón TransformaGob 2026 · Desafío del Ministerio de Relaciones Exteriores (MRE)**:
> *"Orientación digital para apostillar sin adivinar"*.

Un asistente guiado (estilo *TurboTax*) que, en ~2 minutos y **sin pedirte datos**, te arma el
**plan exacto** para apostillar o legalizar tu documento: qué firmas necesita, en qué orden, de qué
entidades, cuánto demora y cuánto cuesta — y **verifica** si el documento que ya tienes está listo.

> **📌 Estado / traspaso entre sesiones:** el MVP está construido y probado. Para retomar, lee
> **[BITACORA.md](BITACORA.md)** (qué se hizo, cómo y por qué) y **[PENDIENTE.md](PENDIENTE.md)**
> (despliegue, PPT, validación y envío).

## El problema

**1 de cada 3 ciudadanos (30%)** que va al MRE por primera vez es **rechazado en ventanilla** porque
desconoce la *cadena de certificación* previa. Se certifican **~62 000 documentos/mes** solo en Lima.
Hoy esa información solo la dominan quienes ya hicieron el trámite, tienen un "conocido informado" o
pagan un intermediario. Este prototipo democratiza ese conocimiento.

## Qué hace

- **Modo "empezar desde cero":** wizard de pocas preguntas → **plan paso a paso** con entidades,
  direcciones, teléfonos, tiempos, costos, advertencias y atajos legítimos si tienes prisa.
- **Modo "verificar mi documento":** convierte los **3 errores más frecuentes** en preguntas que el
  ojo no entrenado sí puede responder → veredicto ✅ listo / ⚠️ te falta esto.
- **Verificador de firma vigente:** ¿la firma de tu documento sigue habilitada? *(Dato real del
  dataset: de 167 firmas registradas, al 12-jun-2026 solo 4 seguían vigentes.)*
- **Compartir el plan** por enlace (para quien delega el trámite en un tercero) — sin guardar datos.
- **Asistente de lenguaje natural opcional:** describe tu documento en tus palabras y te lleva a la
  categoría correcta (Workers AI, con degradación elegante si no hay IA).

## Diferenciador

Codifica **dos capas de conocimiento**: el catálogo oficial de **25 cadenas** del MRE **y** el
**conocimiento tácito de campo** que hoy solo tienen los tramitadores (Junta de Decanos vs Colegio de
Notarios, truco del Centro MAC, actas RENIEC por internet que no valen, excepciones de Milán y España,
vía digital, etc.). Eso es justo lo que el desafío pide democratizar.

## Cómo correrlo

### Opción A — abrir el archivo (sin instalar nada)
Abre `index.html` con doble clic. Funciona porque los datos están empaquetados en
`assets/js/data-bundle.js` (generado desde los `.json` de `data/`).

### Opción B — servidor local (recomendado para desarrollo)
```bash
py -3.14 -m http.server 8123
# luego abre http://localhost:8123
```

### Opción C — con Functions (verificador + IA) en local
```bash
npx wrangler pages dev .
```

## Regenerar los datos

Los archivos JSON de `data/` son la **fuente de verdad**. Si cambian, regenera el bundle:
```bash
set PYTHONIOENCODING=utf-8
py -3.14 scripts/gen_bundle.py
```
Para regenerar el dataset de firmas desde el CSV (privado, ver más abajo):
```bash
py -3.14 scripts/csv_to_json.py
```

## Desplegar en Cloudflare Pages

```bash
npx wrangler pages deploy .
```
- **Workers AI** (clasificador): se activa con el binding `AI` (ver `wrangler.toml`).
- **Verificador con dataset completo:** crea un KV y súbele el dataset privado:
  ```bash
  npx wrangler kv namespace create AUTORIDADES
  npx wrangler kv key put --binding=AUTORIDADES registros --path=data/autoridades.json
  ```
  Sin KV, el verificador usa `data/firmas_demo.json` (datos de demostración).

## Estructura

```
index.html                 Cáscara accesible (WCAG 2.1)
assets/css/styles.css       Estilos (responsive, contraste AA, print)
assets/js/
  app.js                    Núcleo: carga de datos, navegación, accesibilidad
  wizard.js                 Pantallas del asistente (modo, tipo, país, urgencia…)
  resultado.js              El plan paso a paso (la pantalla que gana)
  diagnostico.js            Flujo B: 3 errores frecuentes → veredicto
  verificador.js            ¿La firma está vigente?
  clasificador.js           Lenguaje natural opcional (con degradación)
  data-bundle.js            GENERADO (permite abrir en local)
data/
  cadenas.json              Los 25 casos (fuente de verdad del dominio)
  flujo.json                Esqueleto del wizard + diagnóstico
  paises.json               Reglas por país (orientativas)
  tips.json                 Atajos de campo
  glosario.json             Jerga → lenguaje ciudadano
  firmas_demo.json          Demo del verificador (público)
  autoridades.json          Dataset COMPLETO (gitignored, privado)
functions/api/
  verificar-firma.js        Pages Function: consulta firmas (KV o demo)
  clasificar.js             Pages Function: Workers AI
scripts/
  csv_to_json.py            CSV de autoridades → JSON
  gen_bundle.py             JSON → data-bundle.js
docs/                       Arquitectura, fuentes de datos, declaración de IA
```

## Privacidad y accesibilidad

- **Sin datos personales:** no pide nombre, DNI ni sube tu documento a ningún servidor. El estado del
  wizard es un objeto plano sin información personal. Compartir usa el estado codificado en la URL.
- **WCAG 2.1:** `fieldset`/`legend`, foco visible, navegación por teclado, contraste AA, objetivos de
  toque ≥44 px, `aria-live` al cambiar de paso, barra de progreso con `aria-valuenow`.
- **No reemplaza la ventanilla:** te prepara para no ser rechazado; siempre deriva a confirmar en el MRE.

## Datos y licencia

- **Código:** licencia **MIT** (compatible con el DL 1412 art. 29, software público reutilizable).
- **Dataset de autoridades:** de **uso exclusivo para el prototipado** (condición del Lab MRE). **No se
  publica ni redistribuye**; está fuera del repositorio (`.gitignore`). Ver
  [docs/DATOS_Y_FUENTES.md](docs/DATOS_Y_FUENTES.md).
- **Uso de IA generativa:** declarado en [docs/DECLARACION_IA.md](docs/DECLARACION_IA.md).

## Alcance (prototipo)

Prototipo demostrativo, **sin integración** con sistemas del MRE. Las reglas por país son orientativas
(conocimiento de campo) y deben validarse con el MRE y la entidad destinataria antes de cualquier
implementación, junto con la OIA y la Oficina de Arquitectura y Seguridad Digital.
