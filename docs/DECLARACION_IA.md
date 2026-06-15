# Declaración de uso de Inteligencia Artificial generativa

*(Requerida por las bases de la Hackatón TransformaGob 2026.)*

## 1. ¿Se usó IA generativa en el desarrollo?

**Sí.** Se usaron asistentes de IA generativa como **apoyo al desarrollo, la documentación y la
estructuración de datos** del prototipo: redacción de código (HTML/CSS/JS y Functions), organización
del catálogo de cadenas en JSON, redacción de textos en lenguaje ciudadano y de esta documentación.

El equipo **revisó y validó** todos los contenidos y resultados, y asume la responsabilidad por ellos.

## 2. ¿La solución usa IA generativa en tiempo de ejecución?

**Sí, como capa OPCIONAL y no crítica.** El asistente incluye un clasificador de lenguaje natural
(`functions/api/clasificar.js`) que usa **Workers AI** (modelo `@cf/meta/llama-3.1-8b-instruct`)
únicamente para **mapear el texto libre del ciudadano a una categoría** del catálogo.

Salvaguardas:
- La IA **no decide la cadena de certificación** ni inventa pasos, firmas, tiempos o costos. Toda esa
  información proviene de archivos verificados (`cadenas.json`). *El dato manda sobre el modelo.*
- **Degradación elegante:** si la IA no está disponible, el campo se apoya en un clasificador local por
  palabras clave; y el wizard de botones funciona igual, sin IA.
- La IA **no recibe datos personales**: solo la descripción textual del tipo de documento.

## 3. Datos ingresados a la IA

- **No** se ingresaron datos personales reales, información confidencial, credenciales ni código de
  sistemas productivos no autorizados.
- Al clasificador solo se le envía el texto que el ciudadano escribe para describir su documento
  (p. ej. *"mi partida de nacimiento para Italia"*) y la lista de categorías del catálogo.

## 4. Responsabilidad

El equipo declara que la solución tiene **carácter prototípico, experimental y demostrativo**, que los
contenidos fueron revisados por personas, y que el uso de IA se ajusta a las bases de la hackatón y al
marco de gobierno digital peruano.
