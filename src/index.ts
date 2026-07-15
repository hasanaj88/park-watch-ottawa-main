export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    const jsonResponse = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json",
          ...cors,
        },
      });

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors,
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return jsonResponse({ ok: true });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body: any = await request.json().catch(() => ({}));
        const prompt = String(body?.prompt ?? "").trim();

        if (!prompt) {
          return jsonResponse({ error: "prompt is required" }, 400);
        }

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct",
          {
            messages: [
              {
                role: "system",
                content:
                  "You are Ottawa Live Parking Assistant. Help users find parking in Ottawa. Be concise and practical.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }
        );

        return jsonResponse({ result });
      } catch (error) {
        console.error("Workers AI error:", error);

        return jsonResponse(
          {
            error: "AI request failed",
            message:
              error instanceof Error
                ? error.message
                : String(error),
          },
          500
        );
      }
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};