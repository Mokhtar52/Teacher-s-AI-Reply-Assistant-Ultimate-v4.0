import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MessageType, ReplyTone, SavedReply, Student, AppSettings, IntegrationPlatform, Sentiment, GenerationProgress, Reminder } from './types';
import { MESSAGE_TYPE_OPTIONS, TONE_OPTIONS, QUICK_REPLY_TEMPLATES, SMART_TIPS, PLATFORM_OPTIONS } from './constants';
import { analyzeContext, generateBilingualReply, BilingualReplySentence } from './services/geminiService';
import { CopyIcon, RegenerateIcon, SettingsIcon, SaveIcon, MicrophoneIcon, ExportIcon, HistoryIcon, BackIcon, CloseIcon, TrashIcon, SearchIcon, UserGroupIcon, SunIcon, MoonIcon, BellIcon, ThumbUpIcon, ThumbDownIcon, SparklesIcon } from './components/icons';

type View = 'main' | 'history' | 'students' | 'reminders';
type CopyStatus = 'idle' | 'copied';
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Custom Hook for LocalStorage
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

const App: React.FC = () => {
  // === STATE MANAGEMENT ===
  const [view, setView] = useState<View>('main');
  const [settings, setSettings] = useLocalStorage<AppSettings>('appSettings_v3', { teacherName: 'Teacher', signature: '', platform: IntegrationPlatform.WHATSAPP, theme: 'dark' });
  const [students, setStudents] = useLocalStorage<Student[]>('students_v3', []);
  const [savedReplies, setSavedReplies] = useLocalStorage<SavedReply[]>('savedReplies_v3', []);
  const [reminders, setReminders] = useLocalStorage<Reminder[]>('reminders_v3', []);

  // Form & Generation State
  const [studentMessage, setStudentMessage] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>(MessageType.NEW_STUDENT);
  const [replyTone, setReplyTone] = useState<ReplyTone>(ReplyTone.FRIENDLY);
  
  // AI & Reply State
  const [detectedContext, setDetectedContext] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({});
  const [error, setError] = useState<string | null>(null);
  const [replySentences, setReplySentences] = useState<BilingualReplySentence[]>([]);
  const [toneDescription, setToneDescription] = useState('');
  
  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [copyStatus, setCopyStatus] = useState<{ id: string, lang: 'ar' | 'en' } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // === EFFECTS ===

  // Theme management
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [settings.theme]);

  // Set initial tip
  useEffect(() => {
    setCurrentTip(SMART_TIPS[Math.floor(Math.random() * SMART_TIPS.length)]);
  }, []);

  // Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
  }, []);

  // === CORE LOGIC ===

  const handleGenerateReply = useCallback(async (message?: string) => {
    const finalMessage = message || studentMessage;
    if (!finalMessage.trim()) {
      setError("Please enter a student message.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setReplySentences([]);
    setToneDescription('');
    setProgress({ reading: true });

    try {
      setProgress(p => ({ ...p, reading: false, detecting: true }));
      const context = await analyzeContext(finalMessage);
      setDetectedContext(context);
      setMessageType(context.messageType); // Auto-update message type

      setProgress(p => ({ ...p, detecting: false, drafting: true }));
      const selectedStudent = students.find(s => s.id === selectedStudentId);
      const result = await generateBilingualReply(finalMessage, context, replyTone, settings.platform, settings.teacherName, selectedStudent);
      
      setProgress(p => ({ ...p, drafting: false, done: true }));
      setReplySentences(result.sentences);
      setToneDescription(result.toneDescription);
      setCurrentTip(SMART_TIPS[Math.floor(Math.random() * SMART_TIPS.length)]);

    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      setProgress({ error: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [studentMessage, students, selectedStudentId, replyTone, settings.platform, settings.teacherName]);

  const handleVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US'; // Or detect based on UI

    recognitionRef.current.onstart = () => setIsRecording(true);
    recognitionRef.current.onend = () => setIsRecording(false);
    recognitionRef.current.onerror = (event: any) => setError(`Speech recognition error: ${event.error}`);
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setStudentMessage(transcript);
    };
    
    recognitionRef.current.start();
  };
  
  const handleReadAloud = (text: string, langCode: 'en-US' | 'ar-SA') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      setError("Text-to-speech is not supported by your browser.");
    }
  };

  const handleCopyToClipboard = (text: string, id: string, lang: 'ar' | 'en') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus({ id, lang });
      setTimeout(() => setCopyStatus(null), 2000);
    });
  };

  const fullEnglishReply = useMemo(() => replySentences.map(s => s.englishSentence).join(' '), [replySentences]);
  const fullArabicReply = useMemo(() => replySentences.map(s => s.arabicSentence).join(' '), [replySentences]);


  // === UI COMPONENTS === (Defined inside App for simplicity)

  const IconButton = ({ children, onClick, label, disabled = false, active = false }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; label: string, disabled?: boolean, active?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${active ? 'bg-white/20 text-white' : ''}`}
    >
      {children}
    </button>
  );

  const Header = () => (
    <header className="flex items-center justify-between mb-6 text-white">
        <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Al Israa Academy</h1>
            <span className="hidden sm:block text-sm opacity-70">|</span>
            <p className="hidden sm:block text-lg opacity-80">AI Reply Assistant v3.0</p>
        </div>
        <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg">
            <IconButton onClick={() => setView('main')} label="Main View" active={view === 'main'}><SparklesIcon className="w-6 h-6" /></IconButton>
            <IconButton onClick={() => setView('history')} label="Reply History" active={view === 'history'}><HistoryIcon /></IconButton>
            <IconButton onClick={() => setView('students')} label="My Students" active={view === 'students'}><UserGroupIcon /></IconButton>
            <IconButton onClick={() => setView('reminders')} label="Reminders" active={view === 'reminders'}><BellIcon /></IconButton>
            <span className="w-px h-6 bg-white/20"></span>
            <IconButton onClick={() => setIsSettingsOpen(true)} label="Settings"><SettingsIcon /></IconButton>
            <IconButton onClick={() => setSettings(s => ({...s, theme: s.theme === 'dark' ? 'light' : 'dark'}))} label="Toggle Theme">
                {settings.theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </IconButton>
        </div>
    </header>
  );
  
  // Dummy components for other views to keep App.tsx from getting too large in this example
  const StudentsView = () => (<div className="text-white p-8 bg-black/20 rounded-lg">Student Management View - To be implemented</div>)
  const RemindersView = () => (<div className="text-white p-8 bg-black/20 rounded-lg">Reminders View - To be implemented</div>)
  const HistoryView = () => (<div className="text-white p-8 bg-black/20 rounded-lg">History View - To be implemented</div>)


  const MainView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Inputs */}
        <div className="flex flex-col gap-4">
            <div className="bg-secondary-dark/50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-300">Student</label>
                <select value={selectedStudentId || ''} onChange={e => setSelectedStudentId(e.target.value || null)} className="w-full mt-1 p-2 bg-primary-dark border border-gray-600 rounded-md text-white">
                    <option value="">Select a student (optional)</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            <div className="bg-secondary-dark/50 p-4 rounded-lg">
                 <label className="text-sm font-semibold text-gray-300 mb-2 block">Student's Message</label>
                 <div className="relative">
                    <textarea
                        value={studentMessage}
                        onChange={(e) => setStudentMessage(e.target.value)}
                        placeholder="Paste student's message here or use voice input..."
                        className="w-full h-36 p-3 bg-primary-dark border border-gray-600 rounded-md text-gray-200 resize-none"
                    />
                    <IconButton onClick={handleVoiceInput} label="Voice Input" disabled={isLoading}><MicrophoneIcon isRecording={isRecording} /></IconButton>
                 </div>
            </div>

             <div className="bg-secondary-dark/50 p-4 rounded-lg grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-semibold text-gray-300">Message Type</label>
                    <select value={messageType} onChange={e => setMessageType(e.target.value as MessageType)} className="w-full mt-1 p-2 bg-primary-dark border border-gray-600 rounded-md text-white">
                        {MESSAGE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-semibold text-gray-300">Reply Tone</label>
                    <select value={replyTone} onChange={e => setReplyTone(e.target.value as ReplyTone)} className="w-full mt-1 p-2 bg-primary-dark border border-gray-600 rounded-md text-white">
                        {TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {detectedContext && (
                 <div className="text-center text-sm text-cyan-200">
                    🔍 Detected: {detectedContext.messageType} — Sentiment: {detectedContext.sentiment}
                </div>
            )}
            
            <button onClick={() => handleGenerateReply()} disabled={isLoading} className="flex items-center justify-center w-full p-3 bg-accent-teal hover:bg-accent-teal-dark rounded-lg text-white font-bold text-lg transition-transform duration-200 hover:scale-105 disabled:bg-gray-500 disabled:scale-100">
                {isLoading ? 'Thinking...' : '✨ Generate Bilingual Reply'}
            </button>
        </div>

        {/* Right Column: Outputs */}
        <div className="flex flex-col gap-4">
            {(isLoading || replySentences.length > 0) ? (
            <div className="bg-secondary-dark/50 p-4 rounded-lg min-h-[500px]">
                {isLoading && !replySentences.length && <div>Loading...</div>}
                {replySentences.length > 0 && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">AI Generated Reply</h3>
                             <span className="text-sm font-semibold bg-green-900 text-green-200 px-3 py-1 rounded-full">{toneDescription}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-white mb-2">English 🇬🇧</h4>
                                <div className="p-2 bg-primary-dark rounded-md border border-gray-600 space-y-1">
                                    {replySentences.map((s, i) => <p key={i} className="text-gray-300">{s.englishSentence}</p>)}
                                </div>
                                <button onClick={() => handleCopyToClipboard(fullEnglishReply, 'full-en', 'en')} className="text-xs text-gray-400 mt-1">Copy All</button>
                            </div>
                            <div dir="rtl">
                                 <h4 className="font-semibold text-white mb-2">Arabic 🇸🇦</h4>
                                <div className="p-2 bg-primary-dark rounded-md border border-gray-600 space-y-1 font-arabic">
                                    {replySentences.map((s, i) => <p key={i} className="text-gray-300">{s.arabicSentence}</p>)}
                                </div>
                                <button onClick={() => handleCopyToClipboard(fullArabicReply, 'full-ar', 'ar')} className="text-xs text-gray-400 mt-1">Copy All</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
            ) : (
                 <div className="flex items-center justify-center bg-secondary-dark/50 p-4 rounded-lg min-h-[500px] text-gray-400">
                    Your generated reply will appear here.
                 </div>
            )}
        </div>
    </div>
  )

  const renderView = () => {
      switch(view) {
          case 'main': return <MainView />;
          case 'history': return <HistoryView />;
          case 'students': return <StudentsView />;
          case 'reminders': return <RemindersView />;
          default: return <MainView />;
      }
  }

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 lg:p-8 text-gray-200">
      <div className="max-w-7xl mx-auto">
        <Header />
        <main>
            {renderView()}
        </main>
        <footer className="text-center mt-8">
            <div className="bg-black/20 p-3 rounded-lg inline-block shadow-md border border-white/10">
                <p className="text-gray-400 text-sm">💡 <strong>Smart Tip:</strong> {currentTip}</p>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default App;