import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Plus, 
  Trash2, 
  MessageCircle, 
  Bot, 
  User, 
  Loader2,
  ChevronLeft,
  Plane
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  messages?: Message[];
}

export default function AgentChat() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/agent/conversations"],
  });

  const { data: currentConversation, isLoading: loadingConversation } = useQuery<Conversation>({
    queryKey: ["/api/agent/conversations", selectedConversation],
    enabled: !!selectedConversation,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agent/conversations", { title: "محادثة جديدة" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/conversations"] });
      setSelectedConversation(data.id);
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في إنشاء محادثة جديدة", variant: "destructive" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/agent/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/conversations"] });
      setSelectedConversation(null);
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في حذف المحادثة", variant: "destructive" });
    },
  });

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedConversation || isStreaming) return;

    const message = inputMessage.trim();
    setInputMessage("");
    setIsStreaming(true);
    setStreamingMessage("");

    queryClient.setQueryData<Conversation>(
      ["/api/agent/conversations", selectedConversation],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...(old.messages || []),
            { id: Date.now(), role: "user", content: message, createdAt: new Date().toISOString() },
          ],
        };
      }
    );

    try {
      const response = await fetch(`/api/agent/conversations/${selectedConversation}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let fullContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullContent += data.content;
                  setStreamingMessage(fullContent);
                }
                if (data.done) {
                  queryClient.setQueryData<Conversation>(
                    ["/api/agent/conversations", selectedConversation],
                    (old) => {
                      if (!old) return old;
                      return {
                        ...old,
                        messages: [
                          ...(old.messages || []),
                          { id: Date.now() + 1, role: "assistant", content: fullContent, createdAt: new Date().toISOString() },
                        ],
                      };
                    }
                  );
                  setStreamingMessage("");
                }
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في إرسال الرسالة", variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation?.messages, streamingMessage]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [selectedConversation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-black">وكيل سند الذكي</h1>
              <p className="text-sm text-muted-foreground">متخصص في مطالبات الطيران</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <span>العودة للرئيسية</span>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>

        <div className="flex gap-4 h-[calc(100vh-12rem)]">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-72 shrink-0 hidden md:block"
          >
            <Card className="h-full p-4 glass-card">
              <Button
                onClick={() => createConversationMutation.mutate()}
                disabled={createConversationMutation.isPending}
                className="w-full mb-4 gap-2 rounded-xl"
                data-testid="button-new-conversation"
              >
                <Plus className="w-4 h-4" />
                محادثة جديدة
              </Button>

              <ScrollArea className="h-[calc(100%-4rem)]">
                <div className="space-y-2">
                  <AnimatePresence>
                    {loadingConversations ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        لا توجد محادثات بعد
                      </p>
                    ) : (
                      conversations.map((conv) => (
                        <motion.div
                          key={conv.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className={cn(
                            "p-3 rounded-xl cursor-pointer transition-all group flex items-center justify-between",
                            selectedConversation === conv.id
                              ? "bg-primary/10 border border-primary/20"
                              : "hover-elevate"
                          )}
                          onClick={() => setSelectedConversation(conv.id)}
                          data-testid={`conversation-item-${conv.id}`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <MessageCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm truncate">{conv.title}</span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversationMutation.mutate(conv.id);
                            }}
                            data-testid={`button-delete-conversation-${conv.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </Card>
          </motion.div>

          {/* Chat Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col"
          >
            <Card className="flex-1 flex flex-col glass-card overflow-hidden">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {!selectedConversation ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                      <Plane className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">مرحباً بك في وكيل سند</h2>
                    <p className="text-muted-foreground max-w-md mb-6">
                      أنا وكيلك المتخصص في مطالبات تعويضات الطيران. 
                      سأقوم بتحليل حالتك وصياغة المطالبة نيابة عنك.
                    </p>
                    <Button 
                      onClick={() => createConversationMutation.mutate()}
                      disabled={createConversationMutation.isPending}
                      className="gap-2 rounded-xl"
                      data-testid="button-start-conversation"
                    >
                      {createConversationMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      ابدأ محادثة جديدة
                    </Button>
                  </div>
                ) : loadingConversation ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {/* Welcome Message */}
                    {(!currentConversation?.messages || currentConversation.messages.length === 0) && !streamingMessage && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="bg-muted/50 rounded-2xl rounded-tr-md p-4 max-w-[80%]">
                          <p className="text-sm leading-relaxed">
                            مرحباً! أنا وكيل سند المتخصص في مطالبات الطيران.
                            <br /><br />
                            أخبرني عن المشكلة التي واجهتها في رحلتك - هل تأخرت الرحلة؟ ألغيت؟ أو هل فقدت حقائبك؟
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    <AnimatePresence>
                      {currentConversation?.messages?.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex gap-3",
                            msg.role === "user" ? "flex-row-reverse" : ""
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                              msg.role === "user"
                                ? "bg-accent"
                                : "bg-gradient-to-br from-primary to-primary/60"
                            )}
                          >
                            {msg.role === "user" ? (
                              <User className="w-4 h-4" />
                            ) : (
                              <Bot className="w-4 h-4 text-primary-foreground" />
                            )}
                          </div>
                          <div
                            className={cn(
                              "rounded-2xl p-4 max-w-[80%]",
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-tl-md"
                                : "bg-muted/50 rounded-tr-md"
                            )}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Streaming Message */}
                    {streamingMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="bg-muted/50 rounded-2xl rounded-tr-md p-4 max-w-[80%]">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingMessage}</p>
                          <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse mr-1" />
                        </div>
                      </motion.div>
                    )}

                    {/* Loading indicator */}
                    {isStreaming && !streamingMessage && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="bg-muted/50 rounded-2xl rounded-tr-md p-4">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              {selectedConversation && (
                <div className="p-4 border-t bg-background/50">
                  <div className="flex gap-3 items-end">
                    <Textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="اكتب رسالتك هنا..."
                      className="resize-none min-h-[3rem] max-h-32 rounded-xl border-muted-foreground/20"
                      disabled={isStreaming}
                      data-testid="input-chat-message"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isStreaming}
                      size="icon"
                      className="h-12 w-12 rounded-xl shrink-0"
                      data-testid="button-send-message"
                    >
                      {isStreaming ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    وكيل سند متخصص في مطالبات الطيران فقط
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
