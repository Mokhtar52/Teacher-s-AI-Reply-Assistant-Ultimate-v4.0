import { MessageType, ReplyTone, IntegrationPlatform } from './types';

export const MESSAGE_TYPE_OPTIONS = [
  { value: MessageType.NEW_STUDENT, label: "🟢 New student inquiry" },
  { value: MessageType.CURRENT_STUDENT, label: "🟠 Current student message" },
  { value: MessageType.ABSENT_STUDENT, label: "🔵 Absent student notification" },
  { value: MessageType.RESCHEDULE, label: "🟣 Reschedule request" },
  { value: MessageType.PAYMENT, label: "💰 Payment inquiry" },
  { value: MessageType.GENERAL, label: "❓ General question" },
];

export const TONE_OPTIONS = [
    { value: ReplyTone.FRIENDLY, label: "😊 Friendly" },
    { value: ReplyTone.WARM_MOTIVATIONAL, label: "☀️ Warm & Motivational" },
    { value: ReplyTone.FORMAL, label: "👔 Professional" },
    { value: ReplyTone.BRIEF_DIRECT, label: "⚡ Brief & Direct" },
    { value: ReplyTone.ISLAMIC, label: "🕌 Islamic (Spiritual)" },
    { value: ReplyTone.FOR_KIDS, label: "🧸 For Kids" },
];

export const PLATFORM_OPTIONS = [
    { value: IntegrationPlatform.WHATSAPP, label: "WhatsApp" },
    { value: IntegrationPlatform.EMAIL, label: "Email" },
    { value: IntegrationPlatform.GENERIC, label: "Generic Chat" },
];

export const QUICK_REPLY_TEMPLATES = [
    { label: "Glad you're enjoying the lessons!", message: "My student said they are enjoying the lessons, what is a good reply?" },
    { label: "We can reschedule.", message: "My student can't make it to class and wants to reschedule." },
    { label: "Thanks for reaching out!", message: "Thank you for reaching out!" },
    { label: "Confirm next lesson?", message: "Please ask my student to confirm their next lesson time." },
    { label: "Payment received.", message: "My student sent a message about their payment." },
];

export const SMART_TIPS = [
    "Keep replies short and kind — students appreciate simplicity.",
    "Use the student’s name when possible for a personal touch.",
    "Encourage consistency instead of perfection.",
    "A positive emoji can make your message feel more welcoming. 😊",
    "Always double-check the time zone when scheduling with international students.",
    "For apologetic students, a warm and reassuring tone works best.",
    "Remember to follow up a few days after a rescheduled class to check in.",
];