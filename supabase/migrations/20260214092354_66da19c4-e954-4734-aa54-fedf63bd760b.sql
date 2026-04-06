
-- Create conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  barber_id uuid NOT NULL REFERENCES public.barber_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, barber_id)
);

-- Create messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS: customers and barbers can see their own conversations
CREATE POLICY "Customers can view their conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Barbers can view their conversations"
ON public.conversations FOR SELECT
USING (barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Customers can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
USING (
  auth.uid() = customer_id 
  OR barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid())
);

-- Messages RLS: participants can see messages in their conversations
CREATE POLICY "Participants can view messages"
ON public.chat_messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE customer_id = auth.uid() 
    OR barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Participants can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND conversation_id IN (
    SELECT id FROM conversations 
    WHERE customer_id = auth.uid() 
    OR barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Participants can update messages"
ON public.chat_messages FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE customer_id = auth.uid() 
    OR barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid())
  )
);

-- Indexes for performance
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_conversations_customer ON public.conversations(customer_id);
CREATE INDEX idx_conversations_barber ON public.conversations(barber_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Updated_at trigger for conversations
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
