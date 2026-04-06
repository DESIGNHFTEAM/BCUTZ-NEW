import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ChatDialogProps {
  barberId: string;
  barberName: string;
  barberImage?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatDialog({ barberId, barberName, barberImage, isOpen, onClose }: ChatDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize or fetch conversation
  useEffect(() => {
    if (isOpen && user) {
      initConversation();
    }
  }, [isOpen, user, barberId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read if from other party
          if (newMsg.sender_id !== user?.id) {
            supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    if (!user) return;
    setIsLoading(true);

    // Check for existing conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', user.id)
      .eq('barber_id', barberId)
      .maybeSingle();

    if (existing) {
      setConversationId(existing.id);
      await fetchMessages(existing.id);
    } else {
      setConversationId(null);
      setMessages([]);
    }
    setIsLoading(false);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      // Mark unread messages as read
      const unread = data.filter(m => !m.is_read && m.sender_id !== user?.id);
      if (unread.length > 0) {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .in('id', unread.map(m => m.id));
      }
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || isSending) return;
    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    let convId = conversationId;

    // Create conversation if doesn't exist
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ customer_id: user.id, barber_id: barberId })
        .select('id')
        .single();

      if (convError || !newConv) {
        toast({
          title: t('toasts.error'),
          description: 'Could not start conversation.',
          variant: 'destructive',
        });
        setIsSending(false);
        return;
      }
      convId = newConv.id;
      setConversationId(convId);
    }

    // Send message
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: convId,
        sender_id: user.id,
        content,
      });

    if (error) {
      toast({
        title: t('toasts.error'),
        description: 'Could not send message.',
        variant: 'destructive',
      });
    } else {
      // Send push notification to barber (fire-and-forget)
      supabase.functions.invoke('send-chat-notification', {
        body: { conversationId: convId, message: content },
      }).catch(() => {});
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId);

    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Chat Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-lg h-[85vh] sm:h-[70vh] bg-background border border-border sm:rounded-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-border">
                {barberImage ? (
                  <img src={barberImage} alt={barberName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-display">{barberName.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold tracking-wide">{barberName}</h3>
                <p className="text-xs text-muted-foreground">{t('chat.askAboutServices', 'Ask about services & bookings')}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-sm">
                    {t('chat.emptyState', 'Start a conversation! Ask about services, availability, or anything you\'d like to know.')}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
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
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - add safe area padding to clear bottom nav */}
            <div className="p-3 border-t border-border bg-card" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
              <div className="flex items-end gap-2 mb-[env(safe-area-inset-bottom,0px)]">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
