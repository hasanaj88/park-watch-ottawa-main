type Role = "system" | "user" | "assistant";

type ChatMessage = {
  role: Role;
  content: string;
};

export const onRequestPost: PagesFunction<{ AI: any }> = async ({
  request,
  env,
}) => {
  const body = await request.json().catch(() => ({}));

  const messagesInput: ChatMessage[] | null = Array.isArray(body?.messages)
    ? body.messages
        .filter(
          (m: any) =>
            m &&
            (m.role === "system" || m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .map((m: any) => ({ role: m.role as Role, content: String(m.content) }))
    : null;

  const singleMessage =
    typeof body?.message === "string" ? String(body.message) : "";

  if (!messagesInput && !singleMessage.trim()) {
    return new Response(JSON.stringify({ reply: "Please send a message." }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  const systemDefault: ChatMessage = {
    role: "system",
    content:
      "You are Ottawa Live Parking Assistant. Help users with parking in Ottawa. Be concise, practical, and safety-aware. If unsure, say so.",
  };

  const chatMessages: ChatMessage[] = messagesInput
    ? messagesInput
    : [systemDefault, { role: "user", content: singleMessage.trim() }];

  const prompt =
    chatMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n") +
    "\nASSISTANT:";

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { prompt });

  const reply = String(result?.response ?? result?.result ?? "").trim();

  return new Response(
    JSON.stringify({
      reply: reply || "Sorry, I couldn't generate a response.",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
