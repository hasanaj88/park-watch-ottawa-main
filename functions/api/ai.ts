export const onRequestPost: PagesFunction<{ AI: any }> = async ({ request, env }) => {
  const body = await request.json().catch(() => ({}));

  //  { message } or { messages: [...] }
  const messagesInput = Array.isArray(body?.messages) ? body.messages : null;
  const singleMessage = typeof body?.message === "string" ? body.message : "";

  const system = {
    role: "system",
    content:
      "You are Ottawa Live Parking Assistant. Help users with parking in Ottawa. Be concise, practical, and safety-aware. If unsure, say so.",
  };

  const chatHistory = messagesInput
    ? messagesInput
        .filter(
          (m: any) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .map((m: any) => ({ role: m.role, content: m.content }))
    : singleMessage
      ? [{ role: "user", content: singleMessage }]
      : [];

  if (chatHistory.length === 0) {
    return new Response(JSON.stringify({ reply: "Please send a message." }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  // prompt (llama instruct)
  const prompt =
    [system, ...chatHistory]
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n") + "\nASSISTANT:";

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { prompt });

  const reply = (result?.response ?? result?.result ?? "").toString().trim();

  return new Response(
    JSON.stringify({ reply: reply || "Sorry, I couldn't generate a response." }),
    { headers: { "Content-Type": "application/json" } }
  );
};
