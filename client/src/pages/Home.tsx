import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { MessageCircle, Send, Plus, Trash2, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = trpc.chat.listConversations.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch current conversation
  const { data: conversationData, isLoading: conversationLoading } = trpc.chat.getConversation.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId }
  );

  // Create conversation mutation
  const createConversation = trpc.chat.createConversation.useMutation({
    onSuccess: (data) => {
      utils.chat.listConversations.invalidate();
      setSelectedConversationId(data.conversationId);
      toast.success("New conversation started");
    },
    onError: () => {
      toast.error("Failed to create conversation");
    },
  });

  // Send message mutation
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      utils.chat.getConversation.invalidate({ conversationId: selectedConversationId! });
      utils.chat.listConversations.invalidate();
      setMessageInput("");
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  // Delete conversation mutation
  const deleteConversation = trpc.chat.deleteConversation.useMutation({
    onSuccess: () => {
      utils.chat.listConversations.invalidate();
      if (selectedConversationId) {
        setSelectedConversationId(null);
      }
      toast.success("Conversation deleted");
    },
    onError: () => {
      toast.error("Failed to delete conversation");
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationData?.messages]);

  const handleNewConversation = () => {
    createConversation.mutate({
      title: `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    });
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversationId) return;
    sendMessage.mutate({
      conversationId: selectedConversationId,
      message: messageInput.trim(),
    });
  };

  const handleDeleteConversation = (id: number) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteConversation.mutate({ conversationId: id });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md w-full bg-card text-card-foreground">
          <div className="text-center space-y-4">
            <MessageCircle className="h-16 w-16 mx-auto text-primary" />
            <h1 className="text-3xl font-bold">{APP_TITLE}</h1>
            <p className="text-muted-foreground">
              Your AI-powered music production assistant for Cubase and Ableton Live
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In to Start</a>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar - Conversations List */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold mb-4 text-card-foreground">{APP_TITLE}</h1>
          <Button onClick={handleNewConversation} className="w-full" disabled={createConversation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversationsLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-muted-foreground p-4 text-sm">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversationId === conv.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-card-foreground"
                  }`}
                  onClick={() => setSelectedConversationId(conv.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedConversationId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <MessageCircle className="h-20 w-20 mx-auto text-muted-foreground" />
              <h2 className="text-2xl font-bold">Welcome to Producer Copilot</h2>
              <p className="text-muted-foreground">
                Start a new session to get help with your music production workflow, mixing techniques, music
                theory, and more.
              </p>
              <Button onClick={handleNewConversation} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Start New Session
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              {conversationLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {conversationData?.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-card-foreground border border-border"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <Streamdown>{msg.content}</Streamdown>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {sendMessage.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-card text-card-foreground border border-border rounded-lg p-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border p-4 bg-card">
              <div className="max-w-4xl mx-auto flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask about production techniques, mixing, music theory..."
                  className="flex-1 bg-input text-foreground"
                  disabled={sendMessage.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessage.isPending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
