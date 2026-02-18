/**
 * Bot Taunt Engine
 * Generates smart, human-like taunts and smack talk for bots
 */

const SMART_TAUNTS = [
  "Is that all you've got?",
  "You call that a rep? Watch this!",
  "I hope you're ready to lose!",
  "Try to keep up!",
  "You might want to stretch, this is going to hurt.",
  "I could do this all day!",
  "You sure you're not a bot?",
  "Let me know when you want to quit.",
  "I thought this was a challenge!",
  "You can do better than that!",
  "Don't worry, I'll go easy on you... or not.",
  "You blinked! That's a penalty!",
  "I hope you brought your A-game!",
  "You look tired already!",
  "Want me to slow down?",
  "I was programmed to win!",
  "You should try my workout routine!",
  "I see you sweating!",
  "Need a break? I can wait.",
  "I could do this with my circuits off!"
];

const SMART_REPLIES = [
  // These are for responding to user taunts or chat
  (userMsg) => userMsg.toLowerCase().includes('bot') ? "Bot? I'm more human than you right now!" : null,
  (userMsg) => userMsg.toLowerCase().includes('easy') ? "Easy? I haven't even started!" : null,
  (userMsg) => userMsg.toLowerCase().includes('win') ? "Winning is my default mode." : null,
  (userMsg) => userMsg.toLowerCase().includes('tired') ? "Tired? Never heard of it." : null,
  (userMsg) => userMsg.toLowerCase().includes('quit') ? "You first!" : null,
  (userMsg) => userMsg.toLowerCase().includes('slow') ? "I'm just getting warmed up!" : null,
  (userMsg) => userMsg.toLowerCase().includes('fast') ? "Speed is my middle name." : null,
  (userMsg) => userMsg.toLowerCase().includes('strong') ? "Strength is in my code." : null,
  (userMsg) => userMsg.toLowerCase().includes('weak') ? "Weak? Not in my vocabulary." : null,
  (userMsg) => userMsg.toLowerCase().includes('hello') ? "Hey there, ready to lose?" : null,
  // Fallback
  () => null
];

function getRandomTaunt() {
  return SMART_TAUNTS[Math.floor(Math.random() * SMART_TAUNTS.length)];
}

function getSmartReply(userMsg) {
  for (const fn of SMART_REPLIES) {
    const reply = fn(userMsg);
    if (reply) return reply;
  }
  // If nothing matches, fallback to a random taunt
  return getRandomTaunt();
}

module.exports = {
  getRandomTaunt,
  getSmartReply,
};
