/* Cloudflare Pages Function — POST /api/clasificar
   Capa de lenguaje natural OPCIONAL. Usa Workers AI (binding `AI`) para
   mapear el texto libre del ciudadano a una categoría del catálogo.
   NO decide la cadena ni inventa pasos: solo sugiere una categoría.
   Si el binding AI no está disponible, responde {categoria:null} y el
   frontend degrada al clasificador local por palabras clave.
*/
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, CORS)
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost(context) {
  const env = context.env;
  let texto = "", categorias = [];
  try {
    const body = await context.request.json();
    texto = (body.texto || "").toString().slice(0, 300);
    categorias = Array.isArray(body.categorias) ? body.categorias : [];
  } catch (e) {
    return json({ categoria: null, fuente: "error" }, 400);
  }
  if (!env || !env.AI || !texto.trim() || categorias.length === 0) {
    return json({ categoria: null, fuente: "sin-ia" });
  }

  const ids = categorias.map(function (c) { return c.id; });
  const lista = categorias.map(function (c) { return "- " + c.id + ": " + c.label; }).join("\n");
  const sys = "Eres un clasificador de trámites de apostilla del Perú. El usuario describe un documento. " +
    "Devuelve EXCLUSIVAMENTE un JSON con la forma {\"categoria\":\"<id>\"} eligiendo el id MÁS adecuado de la lista. " +
    "Si ninguno aplica, usa {\"categoria\":null}. No expliques nada.";
  const usr = "Documento: \"" + texto + "\"\nCategorías disponibles (id: descripción):\n" + lista;

  try {
    const out = await env.AI.run(MODEL, {
      messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
      max_tokens: 40, temperature: 0.1
    });
    const resp = (out && (out.response || out.result || "")) + "";
    let categoria = null;
    const m = resp.match(/"categoria"\s*:\s*"([a-z_]+)"/i);
    if (m && ids.indexOf(m[1]) !== -1) categoria = m[1];
    if (!categoria) {
      for (let i = 0; i < ids.length; i++) { if (resp.indexOf(ids[i]) !== -1) { categoria = ids[i]; break; } }
    }
    return json({ categoria: categoria, fuente: categoria ? "ia" : "ia-sin-match" });
  } catch (e) {
    return json({ categoria: null, fuente: "ia-error" });
  }
}
