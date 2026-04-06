import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, ArrowLeft, Search } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { PullToRefresh } from '@/components/PullToRefresh';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  customer_id: string;
  barber_id: string;
  updated_at: string;
  customer_name: string | null;
  customer_avatar: string | null;
  last_message: string | null;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function DashboardMessages() {
  const { user, hasRole } = useAuth();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [barberProfileId, setBarberProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user && hasRole('barber')) {
      fetchBarberProfile();
    }
  }, [user, hasRole]);

  const fetchBarberProfile = async () => {
    const { data } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('user_id', user!.id)
      .single();
    
    if (data) {
      setBarberProfileId(data.id);
      fetchConversations(data.id);
    }
  };

  const fetchConversations = async (bpId: string) => {
    setIsLoading(true);
    
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .eq('barber_id', bpId)
      .order('updated_at', { ascending: false });

    if (!convs) {
      setIsLoading(false);
      return;
    }

    // Enrich with customer info and last message
    const enriched = await Promise.all(
      convs.map(async (conv) => {
        // Get customer profile from public view
        const { data: profile } = await supabase
          .from('profiles_public')
          .select('full_name, avatar_url')
          .eq('id', conv.customer_id)
          .maybeSingle();

        // Get last message
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', user!.id);

        return {
          ...conv,
          customer_name: profile?.full_name || 'Customer',
          customer_avatar: profile?.avatar_url || null,
          last_message: lastMsg?.content || null,
          unread_count: count || 0,
        } as Conversation;
      })
    );

    setConversations(enriched);
    setIsLoading(false);
  };

  // Realtime subscription for new messages
  useEffect(() => {
    if (!barberProfileId) return;

    const channel = supabase
      .channel('barber-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          
          // If it's for the currently selected conversation
          if (selectedConvId && newMsg.sender_id !== user?.id) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            // Mark as read
            supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then();
          }
          
          // Refresh conversation list
          if (barberProfileId) fetchConversations(barberProfileId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberProfileId, selectedConvId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (convId: string) => {
    setSelectedConvId(convId);
    
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      // Mark all as read
      const unread = data.filter(m => !m.is_read && m.sender_id !== user?.id);
      if (unread.length > 0) {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .in('id', unread.map(m => m.id));
        
        // Update local state
        setConversations(prev =>
          prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
        );
      }
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedConvId || isSending) return;
    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: selectedConvId,
        sender_id: user.id,
        content,
      });

    if (!error) {
      // Optimistic add
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender_id: user.id,
          content,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConvId);
    }

    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRefresh = useCallback(async () => {
    if (barberProfileId) await fetchConversations(barberProfileId);
  }, [barberProfileId]);

  const filteredConversations = conversations.filter(c =>
    !searchQuery || c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
<PullToRefresh onRefresh={handleRefresh}>
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            <Breadcrumbs />

            <h1 className="font-display text-3xl font-bold mb-6">
              {t('dashboard.messages', 'Messages')}
            </h1>

            <div className="border border-border rounded-xl overflow-hidden bg-card flex" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
              {/* Conversation List */}
              <div className={cn(
                "w-full md:w-80 border-r border-border flex flex-col shrink-0",
                selectedConvId ? "hidden md:flex" : "flex"
              )}>
                {/* Search */}
                <div className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t('chat.searchConversations', 'Search conversations...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-6 text-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {t('chat.noConversations', 'No messages yet')}
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => openConversation(conv.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left border-b border-border/50",
                          selectedConvId === conv.id && "bg-muted"
                        )}
                      >
                        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-border shrink-0">
                          {conv.customer_avatar ? (
                            <img src={conv.customer_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-display">{conv.customer_name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{conv.customer_name}</p>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {format(new Date(conv.updated_at), 'dd/MM')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.last_message || t('chat.noMessages', 'No messages')}
                            </p>
                            {conv.unread_count > 0 && (
                              <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center shrink-0">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Message View */}
              <div className={cn(
                "flex-1 flex flex-col",
                !selectedConvId ? "hidden md:flex" : "flex"
              )}>
                {!selectedConvId ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">{t('chat.selectConversation', 'Select a conversation')}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Chat Header */}
                    <div className="flex items-center gap-3 p-4 border-b border-border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setSelectedConvId(null)}
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-border">
                        {selectedConv?.customer_avatar ? (
                          <img src={selectedConv.customer_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-display">{selectedConv?.customer_name?.charAt(0)}</span>
                        )}
                      </div>
                      <p className="font-medium text-sm">{selectedConv?.customer_name}</p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                                isMe
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted text-foreground rounded-bl-md'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border">
                      <div className="flex items-end gap-2">
                        <textarea
                          ref={inputRef}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={t('chat.placeholder', 'Type a message...')}
                          rows={1}
                          className="flex-1 resize-none bg-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-24 overflow-y-auto"
                          style={{ minHeight: '40px' }}
                        />
                        <Button
                          size="icon"
                          onClick={handleSend}
                          disabled={!newMessage.trim() || isSending}
                          className="rounded-xl shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
}
