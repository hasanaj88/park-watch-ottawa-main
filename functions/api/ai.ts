export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const message = String(body?.message ?? "").trim();
  if (!message) {
    return new Response(JSON.stringify({ reply: "Please enter a message." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Workers AI call
  const aiRes = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content:
          "You are an assistant for Ottawa Live Parking. Be concise and helpful.",
      },
      { role: "user", content: message },
    ],
    max_tokens: 200,
  });

  const reply =
    (aiRes as any)?.response ??
    (aiRes as any)?.result ??
    (aiRes as any)?.text ??
    "Sorry, I could not generate a response.";

  return new Response(JSON.stringify({ reply }), {
    headers: { "Content-Type": "application/json" },
  });
};
