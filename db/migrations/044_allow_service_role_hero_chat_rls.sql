-- Migration: relax hero chat RLS so that service-role operations succeed for anonymous flows
DROP POLICY IF EXISTS "Hero chat conversations owner" ON hero_chat_conversations;

CREATE POLICY "Hero chat conversations owner"
  ON hero_chat_conversations
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND auth.uid() = user_id
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND auth.uid() = user_id
    )
  );

DROP POLICY IF EXISTS "Hero chat messages owner" ON hero_chat_messages;

CREATE POLICY "Hero chat messages owner"
  ON hero_chat_messages
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR (
      EXISTS (
        SELECT 1
        FROM hero_chat_conversations c
        WHERE c.id = hero_chat_messages.conversation_id
          AND auth.uid() IS NOT NULL
          AND c.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      EXISTS (
        SELECT 1
        FROM hero_chat_conversations c
        WHERE c.id = hero_chat_messages.conversation_id
          AND auth.uid() IS NOT NULL
          AND c.user_id = auth.uid()
      )
    )
  );