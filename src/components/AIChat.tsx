import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MessageCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

const MAX_MESSAGES_BEFORE_SUMMARY = 12;
const SUMMARIZE_FIRST_N = 8;
const SEND_LAST_N = 6;

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your parking assistant. How can I help you find parking in Ottawa today?",
    },
  ]);

  const [summary, setSummary] = useState<string>("");

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const callAI = async (payloadMessages: Message[]) => {
  const AI_BASE = import.meta.env.VITE_AI_WORKER_URL;

  if (!AI_BASE) {
    throw new Error("AI service is not configured");
  }

  const resp = await fetch(`${AI_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: payloadMessages
        .filter((m) => m.role !== "system")
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n"),
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(txt || `Request failed (${resp.status})`);
  }

  const data = await resp.json();

  const reply =
  data?.result?.response ??
  data?.result?.output_text ??
  data?.result?.text ??
  data?.reply ??
  "";

return String(reply).trim() || "No response";


};

  
  const summarizeConversation = async (messagesToSummarize: Message[]) => {
    const summarizerPrompt: Message[] = [
      {
        role: "system",
        content:
          "Summarize the conversation briefly. Keep only important facts, preferences, and context needed for future replies. Do not include extra commentary.",
      },
      ...messagesToSummarize
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content })),
    ];

    return await callAI(summarizerPrompt);
  };

  const sendChat = async (userMessage: string) => {
    let updated = [
      ...messages,
      { role: "user" as const, content: userMessage },
    ];

    setMessages(updated);
    setIsLoading(true);

    try {
      if (updated.length > MAX_MESSAGES_BEFORE_SUMMARY) {
        const toSummarize = updated.slice(0, SUMMARIZE_FIRST_N);
        const remaining = updated.slice(SUMMARIZE_FIRST_N);

        const newSummary = await summarizeConversation(toSummarize);
        setSummary(newSummary);

        updated = remaining;
        setMessages(remaining);
      }

      const contextMessages: Message[] = [
        {
          role: "system",
          content:
            "You are Ottawa Live Parking Assistant. Help users with parking in Ottawa. Be concise, practical, and safety-aware. If unsure, say so.",
        },
      ];

      if (summary) {
        contextMessages.push({
          role: "system",
          content: `Conversation summary: ${summary}`,
        });
      }

      const payload = [...contextMessages, ...updated.slice(-SEND_LAST_N)];

      const reply = await callAI(payload);

      setMessages([
        ...updated,
        {
          role: "assistant",
          content: reply || "Sorry, I couldn't generate a response.",
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput("");
    await sendChat(msg);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet modal={false} open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          aria-label="Open AI chat"
          className="
            fixed right-6 bottom-24 sm:bottom-28
            h-14 w-14 rounded-full shadow-lg
            bg-primary text-primary-foreground
            hover:scale-110 transition-transform
            z-[9999]
          "
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[400px] max-w-[90vw] p-0 flex flex-col z-[10000]"
      >
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Parking Assistant</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages
              .filter((m) => m.role !== "system")
              .map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about parking..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
