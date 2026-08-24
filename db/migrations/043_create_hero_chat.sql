CREATE TABLE hero_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (user_id IS NOT NULL AND anonymous_id IS NULL)
    OR (user_id IS NULL AND anonymous_id IS NOT NULL)
  )
);

CREATE INDEX hero_chat_conversations_user_id_idx ON hero_chat_conversations(user_id);
CREATE INDEX hero_chat_conversations_anonymous_id_idx ON hero_chat_conversations(anonymous_id);

CREATE TABLE hero_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES hero_chat_conversations(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('user', 'assistant')),
  body text NOT NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hero_chat_messages_conversation_created_at_idx
  ON hero_chat_messages(conversation_id, created_at DESC);

ALTER TABLE hero_chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hero chat conversations owner"
  ON hero_chat_conversations
  FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

ALTER TABLE hero_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hero chat messages owner"
  ON hero_chat_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM hero_chat_conversations c
      WHERE c.id = hero_chat_messages.conversation_id
        AND auth.uid() IS NOT NULL
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM hero_chat_conversations c
      WHERE c.id = hero_chat_messages.conversation_id
        AND auth.uid() IS NOT NULL
        AND c.user_id = auth.uid()
    )
  );