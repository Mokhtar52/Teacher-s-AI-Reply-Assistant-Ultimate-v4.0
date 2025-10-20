export enum MessageType {
  NEW_STUDENT = "New student inquiry",
  CURRENT_STUDENT = "Current student",
  ABSENT_STUDENT = "Absent student",
  RESCHEDULE = "Reschedule request",
  PAYMENT = "Payment inquiry",
  GENERAL = "General question",
}

export enum ReplyTone {
    FORMAL = "Professional",
    FRIENDLY = "Friendly",
    WARM_MOTIVATIONAL = "Warm & Motivational",
    BRIEF_DIRECT = "Brief & Direct",
    ISLAMIC = "Islamic (Spiritual)",
    FOR_KIDS = "For Kids",
}

export enum IntegrationPlatform {
    WHATSAPP = "WhatsApp",
    EMAIL = "Email",
    GENERIC = "Generic Chat",
}

export enum Sentiment {
    POSITIVE = "Positive",
    NEUTRAL = "Neutral",
    NEGATIVE = "Negative",
    APOLOGETIC = "Apologetic",
    ENTHUSIASTIC = "Enthusiastic",
    INQUIRY = "Inquiry",
}

export interface Student {
    id: string;
    name: string;
    lastContactedAt: string;
    preferredTone: ReplyTone;
    totalMessages: number;
}

export interface AppSettings {
    teacherName: string;
    signature: string;
    platform: IntegrationPlatform;
    theme: 'light' | 'dark';
}

export interface Reminder {
    id: string;
    studentId: string;
    studentName: string;
    remindAt: string;
    message: string;
    done: boolean;
}

export interface SavedReply {
    id: string;
    studentId?: string;
    arabicReply: string;
    englishReply: string;
    messageType: MessageType;
    tone: ReplyTone;
    date: string;
    studentMessage: string;
}

export interface GenerationProgress {
    reading?: boolean;
    detecting?: boolean;
    drafting?: boolean;
    translating?: boolean;
    done?: boolean;
    error?: string;
}
