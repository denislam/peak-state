// Change this to your own Claude chat if you want a different coach context.
export const CLAUDE_CHAT_URL =
  'https://claude.ai/chat/5822f67c-02ca-40d5-a88c-4b201f867910';

export const WORKOUT_PROMPT = "Start today's workout";

// Weekly plan. Edit if you change splits.
// Values must match keys in DAY_TYPES (see src/schedule.js).
export const DEFAULT_SCHEDULE = {
  0: 'rest',
  1: 'upper',
  2: 'lower',
  3: 'rest',
  4: 'push',
  5: 'pull',
  6: 'legs',
};
