/* Cloudflare Pages Function — POST /api/verificar-firma
   Consulta el dataset de autoridades y devuelve UN SOLO resultado
   (vigente / caducada / no_encontrada). NO expone la lista completa.

   Fuente de datos, en orden de preferencia:
     1) KV namespace `AUTORIDADES`, clave "registros" (dataset COMPLETO y privado).
     2) Fallback: /data/firmas_demo.json del mismo despliegue (datos de demo).
*/
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, CORS)
  });
}

function norm(s) {
  s = (s || "").toString().toLowerCase();
  try { s = s.normalize("NFKD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
  return s.replace(/\s+/g, " ").trim();
}

async function loadRegistros(env, request) {
  if (env && env.AUTORIDADES) {
    const raw = await env.AUTORIDADES.get("registros");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : (parsed.registros || []);
      } catch (e) {}
    }
  }
  const url = new URL("/data/firmas_demo.json", request.url);
  const r = await fetch(url.toString());
  if (!r.ok) return [];
  const data = await r.json();
  return data.registros || [];
}

function query(registros, entidad, texto, fecha) {
  const e = norm(entidad), q = norm(texto), fc = (fecha || "").replace(/-/g, "");
  const matches = registros.filter(function (r) {
    const okE = !e || norm(r.entidad).indexOf(e) !== -1 || e.indexOf(norm(r.entidad)) !== -1;
    const okQ = !q || norm(r.nombre).indexOf(q) !== -1 || norm(r.cargo).indexOf(q) !== -1;
    return okE && okQ;
  });
  if (matches.length === 0) return { estado: "no_encontrada" };
  const vig = matches.filter(function (r) { return fc ? (r.inicio <= fc && fc <= r.fin) : !!r.vigente_ref; });
  if (vig.length) {
    const v = vig[0];
    return { estado: "vigente", entidad: v.entidad, cargo: v.cargo, periodo: v.inicio + "–" + v.fin, sintetico: !!v.sintetico };
  }
  const m = matches[0];
  return { estado: "caducada", entidad: m.entidad, cargo: m.cargo, periodo: m.inicio + "–" + m.fin, sintetico: !!m.sintetico };
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const registros = await loadRegistros(context.env, context.request);
    return json(query(registros, body.entidad, body.texto, body.fecha));
  } catch (e) {
    return json({ estado: "error", mensaje: "Solicitud inválida" }, 400);
  }
}
