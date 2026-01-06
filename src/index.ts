export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({ ok: true, service: "park-watch-ai-worker" }),
        { headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    // Chat endpoint
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const prompt = String(body?.prompt ?? "").trim();

      if (!prompt) {
        return new Response(JSON.stringify({ error: "prompt is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...cors },
        });
      }

      // Cloudflare Workers AI
      // Llama instruct
      const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: "You are a helpful assistant for parking and city info." },
          { role: "user", content: prompt },
        ],
      });

      return new Response(JSON.stringify({ result }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...cors },
    });
  },
};
