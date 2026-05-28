"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type SetStateAction,
} from "react";

import { Button } from "@/components/ui/button";
import type { ChatMessage as PersistedChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChatInterfaceProps = {
  companyName: string;
  country: {
    flag: string;
    name: string;
  };
  countryCode: string;
};

type LocalChatMessage = Pick<
  PersistedChatMessage,
  "content" | "created_at" | "id" | "role"
> & {
  isStreaming?: boolean;
};

type ChatHistoryPayload = {
  messages?: PersistedChatMessage[];
  error?: string;
};

export function ChatInterface({
  companyName,
  country,
  countryCode,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    async function loadHistory() {
      try {
        setIsLoadingHistory(true);
        setError(null);

        const response = await fetch(`/api/countries/${countryCode}/chat`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as
          | ChatHistoryPayload
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Could not load chat history.");
        }

        if (isActive) {
          setMessages(payload?.messages ?? []);
        }
      } catch (historyError) {
        if (!controller.signal.aborted && isActive) {
          setError(
            historyError instanceof Error
              ? historyError.message
              : "Could not load chat history.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadHistory();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [countryCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const content = messageText.trim();

    if (!content || isSending) {
      return;
    }

    const userMessage: LocalChatMessage = {
      content,
      created_at: new Date().toISOString(),
      id: createMessageId(),
      role: "user",
    };
    const assistantMessage: LocalChatMessage = {
      content: "",
      created_at: new Date().toISOString(),
      id: createMessageId(),
      isStreaming: true,
      role: "assistant",
    };
    const history = messages
      .map(({ content: messageContent, role }) => ({
        content: messageContent,
        role,
      }))
      .slice(-14);

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ]);
    setMessageText("");
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/countries/${countryCode}/chat`, {
        body: JSON.stringify({
          history,
          message: content,
        }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Could not generate a response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        assistantText = await revealChunk(
          assistantMessage.id,
          assistantText,
          chunk,
          setMessages,
        );
      }

      const finalChunk = decoder.decode();

      if (finalChunk) {
        assistantText = await revealChunk(
          assistantMessage.id,
          assistantText,
          finalChunk,
          setMessages,
        );
      }

      setMessages((currentMessages) =>
        currentMessages.map((chatMessage) =>
          chatMessage.id === assistantMessage.id
            ? {
                ...chatMessage,
                content: assistantText,
                created_at: new Date().toISOString(),
                isStreaming: false,
              }
            : chatMessage,
        ),
      );
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not generate a response.",
      );
      setMessages((currentMessages) =>
        currentMessages
          .map((chatMessage) =>
            chatMessage.id === assistantMessage.id
              ? { ...chatMessage, isStreaming: false }
              : chatMessage,
          )
          .filter(
            (chatMessage) =>
              chatMessage.id !== assistantMessage.id ||
              chatMessage.content.trim().length > 0,
          ),
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0a0e1a] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-40 pt-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6">
          <Button
            asChild
            className="w-fit border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white"
            variant="outline"
          >
            <Link href={`/dashboard/${countryCode.toLowerCase()}`}>
              <ArrowLeft aria-hidden="true" />
              {country.name}
            </Link>
          </Button>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-normal text-white md:text-4xl">
              <span aria-hidden="true">{country.flag}</span> Chat with {country.name} Agent
            </h1>
            <p className="text-sm leading-6 text-slate-400">
              Briefed on your {companyName} exposure
            </p>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <section className="flex min-h-[34rem] flex-col gap-5">
          {isLoadingHistory ? <ChatSkeleton /> : null}

          {!isLoadingHistory && messages.length === 0 ? (
            <EmptyChatState countryName={country.name} />
          ) : null}

          {!isLoadingHistory && messages.length > 0 ? (
            <div className="flex flex-col gap-5">
              {messages.map((message) => (
                <MessageRow key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : null}
        </section>
      </div>

      <form
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0a0e1a]/95 px-4 py-4 shadow-2xl shadow-black/50 backdrop-blur sm:px-6 lg:px-8"
        onSubmit={sendMessage}
      >
        <div className="mx-auto flex max-w-5xl items-end gap-3">
          <textarea
            aria-label={`Message the ${country.name} analyst agent`}
            className="min-h-14 max-h-40 flex-1 resize-none rounded-md border border-white/10 bg-[#111827] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
            disabled={isSending}
            onChange={(event) => setMessageText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${country.name} risk to your portfolio`}
            rows={2}
            value={messageText}
          />
          <Button
            aria-label="Send message"
            className="size-12 shrink-0 border-cyan-300/30 bg-cyan-300 p-0 text-[#0a0e1a] hover:bg-cyan-200"
            disabled={isSending || messageText.trim().length === 0}
            type="submit"
          >
            {isSending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Send aria-hidden="true" />
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}

function MessageRow({ message }: { message: LocalChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <article
        className={cn(
          "max-w-[86%] whitespace-pre-wrap text-sm leading-6 md:max-w-[78%]",
          isUser
            ? "rounded-lg bg-blue-700/80 px-4 py-3 text-white shadow-sm shadow-black/20"
            : "rounded-md border border-white/10 bg-[#111827]/85 p-5 text-slate-200 shadow-sm shadow-black/20",
        )}
      >
        {message.content}
        {message.isStreaming ? (
          <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-cyan-200 align-middle" />
        ) : null}
      </article>
    </div>
  );
}

function EmptyChatState({ countryName }: { countryName: string }) {
  return (
    <div className="flex min-h-[28rem] items-center justify-center rounded-lg border border-white/10 bg-[#111827]/60 p-8 text-center">
      <p className="max-w-xl text-base leading-7 text-slate-300">
        Ask me anything about {countryName}&apos;s political, economic, or
        regulatory environment as it relates to your portfolio.
      </p>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className={cn(
            "flex",
            index % 2 === 0 ? "justify-start" : "justify-end",
          )}
          key={index}
        >
          <div
            className={cn(
              "h-24 animate-pulse rounded-md bg-white/10",
              index % 2 === 0 ? "w-4/5 max-w-3xl" : "w-3/5 max-w-xl",
            )}
          />
        </div>
      ))}
    </div>
  );
}

async function revealChunk(
  messageId: string,
  currentText: string,
  chunk: string,
  setMessages: Dispatch<SetStateAction<LocalChatMessage[]>>,
) {
  let nextText = currentText;

  for (const character of chunk) {
    nextText += character;
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content: nextText,
              isStreaming: true,
            }
          : message,
      ),
    );
    await wait(6);
  }

  return nextText;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
