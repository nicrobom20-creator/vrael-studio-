export type MascotId = "bunny" | "bear" | "parrot" | "fox" | "cat";
export type Pose = "idle" | "wave" | "point" | "run" | "jump" | "celebrate" | "think";

export interface PublicMascot {
  id: MascotId;
  name: string;
  trait: string;
  blurb: string;
  map_line: string;
}

export interface PublicLanguage {
  code: string;
  name: string;
  native: string;
  city: string;
  country: string;
  tts: string;
  available?: boolean;
}

export interface PublicConfig {
  bot_username: string;
  prices: { month: string; year: string };
  limits: { lessons: number; chat: number };
  demo: boolean;
  mascots: PublicMascot[];
  languages: PublicLanguage[];
}

export interface Usage {
  day: string;
  lessons: number;
  lessons_limit: number | null;
  chat: number;
  chat_limit: number | null;
  studied_minutes: number;
}

export interface Achievement {
  code: string;
  title: string;
  text: string;
  unlocked: boolean;
  unlocked_at: string;
}

export interface StaffAccess {
  role: "owner" | "admin";
  can_invite: boolean;
}

export interface User {
  id: number;
  name: string;
  username: string;
  language: string;
  language_name: string;
  city: string;
  mascot: MascotId | "";
  mascot_name: string;
  xp: number;
  level: number;
  level_xp: number;
  level_goal: number;
  streak: number;
  premium: boolean;
  premium_until: string | null;
  timezone: string;
  reminder_time: string;
  daily_goal: number;
  onboarded: boolean;
  referral_code: string;
  public_id: string;
  email: string;
  has_telegram: boolean;
  english_level: string;
  study_goal: string;
  languages: string[];
  placement_level: string;
  trial_used: boolean;
  coins: number;
  outfit: string;
  pet: { code: string; title: string };
  kids_mode: boolean;
  access: StaffAccess | null;
  usage: Usage;
  achievements: Achievement[];
}

export interface PathNode {
  id: string;
  kind: "story" | "lesson";
  title: string;
  skill: string;
  xp: number;
  status: "done" | "current" | "locked";
}

export interface Chapter {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  quest_title: string;
  quest_text: string;
  reward_xp: number;
  unlocked: boolean;
  complete: boolean;
  lessons_done: number;
  lessons_total: number;
  nodes: PathNode[];
}

export interface PathData {
  language: PublicLanguage & { place?: string };
  mascot_line: string;
  chapters: Chapter[];
}

export interface Step {
  type: "vocab" | "choice" | "match" | "build" | "listen" | "speak" | "gap" | "speed";
  seconds?: number;
  word?: string;
  reading?: string;
  translation?: string;
  example?: string;
  example_ru?: string;
  tts?: string;
  prompt?: string;
  sub?: string;
  options?: string[];
  answer?: number | string[];
  explain?: string;
  pairs?: { left: string; right: string }[];
  ru?: string;
  extra?: string[];
  phrase?: string;
  hint?: string;
}

export interface Lesson {
  id: string;
  title: string;
  skill: string;
  xp: number;
  tts: string;
  language: string;
  steps: Step[];
}

export interface StoryLine {
  speaker: "mascot" | "npc";
  text: string;
  emotion: string;
  name: string;
}

export interface Story {
  id: string;
  title: string;
  xp: number;
  lines: StoryLine[];
}

export interface Scene {
  id: string;
  title: string;
  blurb: string;
  npc: string;
  opening: string;
  group: string;
}

export interface ChatResult {
  reply: string;
  correction: { was: string; fixed: string; note_ru: string } | null;
  hint_ru: string;
  npc: string;
  source?: string;
  usage?: Usage;
}

export interface BoardEntry {
  id: number;
  name: string;
  mascot: MascotId;
  mascot_name: string;
  xp: number;
  weekly_xp: number;
  streak: number;
  you: boolean;
  rank: number;
}

export interface ReferralInfo {
  code: string;
  link: string;
  app_link: string;
  join_xp: number;
  premium_days: number;
  invited: number;
  paid: number;
  xp_earned: number;
  days_earned: number;
  friends: { name: string; onboarded: boolean; paid: boolean }[];
}

export interface QuestDaily {
  id: string;
  title: string;
  text: string;
  reward: number;
  progress: number;
  target: number;
  done: boolean;
}

export interface QuestStory {
  id: string;
  title: string;
  text: string;
  chapter: string;
  reward: number;
  progress: number;
  target: number;
  done: boolean;
  unlocked: boolean;
}
