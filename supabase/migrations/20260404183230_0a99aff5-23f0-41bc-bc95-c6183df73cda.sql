-- Re-add chat_messages to Realtime - RLS ensures only conversation participants see messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;