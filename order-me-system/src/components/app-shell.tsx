"use client";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CookingPot,
  FolderTree,
  House,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  MicOff,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ShoppingCart,
  Volume2,
  Trash2,
  X,
} from "lucide-react";
import LogoutButton from "@/app/logout-button";
import SwitchLocationButton from "@/app/switch-location-button";
type SpeechRecognitionEventLike = Event & {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};
type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type VoiceWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
type AssistantStep = "idle" | "awaiting-name" | "listening-name" | "name-confirmed";
const ORDER_SESSION_NAME_KEY = "order-me:normal-order:ordered-by";
const ORDER_SESSION_HANDOFF_KEY = "order-me:normal-order:ai-handoff";
type ActiveLocation = {
  code: "FOR" | "FUS";
  name: "Forza" | "Fusion";
};
type AppShellProps = {
  children: ReactNode;
  activeLocation: ActiveLocation;
};
type NavigationItem = {
  label: string;
  href?: string;
  icon: ReactNode;
  children?: {
    label: string;
    href: string;
    icon: ReactNode;
  }[];
};
const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <House size={18} />,
  },
  {
    label: "Products",
    icon: <Boxes size={18} />,
    children: [
      {
        label: "Product List",
        href: "/products",
        icon: <Boxes size={16} />,
      },
      {
        label: "Add Product",
        href: "/products/new",
        icon: <PackagePlus size={16} />,
      },
      {
        label: "Production Batch Recipes",
        href: "/recipes",
        icon: <CookingPot size={16} />,
      },
      {
        label: "Categories",
        href: "/categories",
        icon: <FolderTree size={16} />,
      },
    ],
  },
  {
    label: "Orders",
    icon: <ClipboardList size={18} />,
    children: [
      {
        label: "Normal Orders",
        href: "/orders/normal",
        icon: <ShoppingCart size={16} />,
      },
      {
        label: "Batch Production Orders",
        href: "/orders/production",
        icon: <CookingPot size={16} />,
      },
    ],
  },
  {
    label: "Waste Data",
    href: "/waste",
    icon: <Trash2 size={18} />,
  },
];
export default function AppShell({
  children,
  activeLocation,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantMessage, setAssistantMessage] = useState("");
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [assistantSpeechEnabled, setAssistantSpeechEnabled] = useState(true);
  const [assistantStep, setAssistantStep] = useState<AssistantStep>("idle");
  const [assistantListening, setAssistantListening] = useState(false);
  const [capturedName, setCapturedName] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const hasGreetedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const navigationTimeoutRef = useRef<number | null>(null);
  const preferredAssistantVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  function selectPreferredAssistantVoice(voices: SpeechSynthesisVoice[]) {
    if (voices.length === 0) return null;

    const preferredNamePatterns = [
      /microsoft aria/i,
      /microsoft jenny/i,
      /microsoft zira/i,
      /google.*female/i,
      /samantha/i,
      /victoria/i,
      /karen/i,
      /moira/i,
      /tessa/i,
      /serena/i,
      /sonia/i,
      /hazel/i,
      /ava/i,
      /susan/i,
      /female/i,
    ];

    for (const pattern of preferredNamePatterns) {
      const preferred = voices.find(
        (voice) =>
          /^en(?:-|$)/i.test(voice.lang) &&
          pattern.test(voice.name),
      );

      if (preferred) return preferred;
    }

    return (
      voices.find(
        (voice) =>
          /^en-US$/i.test(voice.lang) &&
          voice.default,
      ) ??
      voices.find((voice) => /^en-US$/i.test(voice.lang)) ??
      voices.find(
        (voice) =>
          /^en(?:-|$)/i.test(voice.lang) &&
          voice.default,
      ) ??
      voices.find((voice) => /^en(?:-|$)/i.test(voice.lang)) ??
      voices.find((voice) => voice.default) ??
      voices[0] ??
      null
    );
  }

  function speakAssistant(message: string) {
    setAssistantMessage(message);
    if (
      !assistantSpeechEnabled ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }
    window.speechSynthesis.cancel();

    const availableVoices = window.speechSynthesis.getVoices();
    const preferredVoice =
      preferredAssistantVoiceRef.current ??
      selectPreferredAssistantVoice(availableVoices);

    if (preferredVoice) {
      preferredAssistantVoiceRef.current = preferredVoice;
    }

    const utterance = new SpeechSynthesisUtterance(message);

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = "en-US";
    }

    utterance.rate = 0.9;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    utterance.onstart = () => setAssistantSpeaking(true);
    utterance.onend = () => setAssistantSpeaking(false);
    utterance.onerror = () => setAssistantSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    const loadPreferredVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      preferredAssistantVoiceRef.current =
        selectPreferredAssistantVoice(voices);
    };

    loadPreferredVoice();
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      loadPreferredVoice,
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        loadPreferredVoice,
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let isNormalOrderHandoff = false;
    try {
      isNormalOrderHandoff =
        pathname === "/orders/normal/new" &&
        window.sessionStorage.getItem(ORDER_SESSION_HANDOFF_KEY) === "active";
      if (isNormalOrderHandoff) {
        window.sessionStorage.removeItem(ORDER_SESSION_HANDOFF_KEY);
      }
    } catch {
      // Session storage can be unavailable in restricted browser modes.
    }
    if (isNormalOrderHandoff) {
      setAssistantOpen(false);
      setAssistantMessage(
        "Normal Order is ready. Continue with the order voice assistant on this page."
      );
      window.speechSynthesis?.cancel();
      setAssistantSpeaking(false);
      return;
    }
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    const message = `${greeting}. How can I help you?`;
    setAssistantMessage(message);
    const timeout = window.setTimeout(() => {
      speakAssistant(message);
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [greeting, pathname]);
  function normalizeCapturedName(value: string) {
    return value
      .replace(/[^\p{L}\p{M}'’.-]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }
  function finishNameCapture(rawName: string) {
    const name = normalizeCapturedName(rawName);
    if (!name) {
      setAssistantStep("awaiting-name");
      speakAssistant("I did not catch your name. Please tap the microphone and say your name again.");
      return;
    }
    setCapturedName(name);
    setAssistantStep("name-confirmed");
    setAssistantListening(false);
    try {
      window.sessionStorage.setItem(ORDER_SESSION_NAME_KEY, name);
      window.sessionStorage.setItem(ORDER_SESSION_HANDOFF_KEY, "active");
    } catch {
      // Session storage can be unavailable in restricted browser modes.
    }
    speakAssistant(`Thank you, ${name}. I will open the normal order page now.`);
    if (navigationTimeoutRef.current !== null) {
      window.clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = window.setTimeout(() => {
      setAssistantOpen(false);
      router.push("/orders/normal/new");
    }, 1200);
  }
  function startNameListening() {
    if (typeof window === "undefined") return;
    const voiceWindow = window as VoiceWindow;
    const Recognition =
      voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceSupported(false);
      setAssistantListening(false);
      speakAssistant(
        "Voice recognition is not available in this browser. Please use a supported browser to continue by voice."
      );
      return;
    }
    window.speechSynthesis?.cancel();
    setAssistantSpeaking(false);
    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setAssistantStep("listening-name");
      setAssistantListening(true);
      setAssistantMessage("Listening... Please say your name.");
    };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += `${event.results[index][0]?.transcript ?? ""} `;
      }
      finishNameCapture(transcript);
    };
    recognition.onerror = (event) => {
      setAssistantListening(false);
      setAssistantStep("awaiting-name");
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setAssistantMessage(
          "Microphone permission is blocked. Allow microphone access in your browser, then tap the microphone again."
        );
        return;
      }
      if (event.error === "no-speech") {
        setAssistantMessage("I did not hear anything. Tap the microphone and say your name again.");
        return;
      }
      setAssistantMessage("I could not capture your name. Tap the microphone and try again.");
    };
    recognition.onend = () => {
      setAssistantListening(false);
      recognitionRef.current = null;
      setAssistantStep((current) =>
        current === "listening-name" ? "awaiting-name" : current
      );
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setAssistantListening(false);
      setAssistantStep("awaiting-name");
      setAssistantMessage("The microphone could not start. Please tap the microphone and try again.");
    }
  }
  function stopNameListening() {
    recognitionRef.current?.stop();
  }
  function startCreateOrderConversation() {
    setAssistantOpen(true);
    setCapturedName("");
    setAssistantStep("awaiting-name");
    speakAssistant("Of course. What is your name? Tap the microphone and tell me your name.");
  }
  useEffect(() => {
    if (typeof window === "undefined") return;
    const voiceWindow = window as VoiceWindow;
    setVoiceSupported(
      Boolean(voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition)
    );
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if (navigationTimeoutRef.current !== null) {
        window.clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);
  const [mobileOpen, setMobileOpen] =
    useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);
  const [productsOpen, setProductsOpen] =
    useState(true);
  const [ordersOpen, setOrdersOpen] =
    useState(true);
  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }
  function closeMobileNavigation() {
    setMobileOpen(false);
  }
  function renderNavigation(
    mobile = false
  ) {
    return (
      <nav className="space-y-2">
        {navigation.map((item) => {
          if (
            item.label === "Products" &&
            item.children
          ) {
            const expanded =
              mobile || productsOpen;
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    setProductsOpen(
                      (current) => !current
                    );
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {!sidebarCollapsed ||
                    mobile
                      ? item.label
                      : null}
                  </span>
                  {!sidebarCollapsed ||
                  mobile ? (
                    expanded ? (
                      <ChevronDown
                        size={16}
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                      />
                    )
                  ) : null}
                </button>
                {expanded &&
                (!sidebarCollapsed ||
                  mobile) ? (
                  <div className="mt-1 space-y-1 pl-3">
                    {item.children.map(
                      (child) => (
                        <Link
                          key={
                            child.href
                          }
                          href={
                            child.href
                          }
                          onClick={
                            closeMobileNavigation
                          }
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                            isActive(
                              child.href
                            )
                              ? "bg-zinc-950 font-semibold text-white"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                          }`}
                        >
                          {
                            child.icon
                          }
                          {
                            child.label
                          }
                        </Link>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            );
          }
          if (
            item.label === "Orders" &&
            item.children
          ) {
            const expanded =
              mobile || ordersOpen;
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    setOrdersOpen(
                      (current) => !current
                    );
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {!sidebarCollapsed ||
                    mobile
                      ? item.label
                      : null}
                  </span>
                  {!sidebarCollapsed ||
                  mobile ? (
                    expanded ? (
                      <ChevronDown
                        size={16}
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                      />
                    )
                  ) : null}
                </button>
                {expanded &&
                (!sidebarCollapsed ||
                  mobile) ? (
                  <div className="mt-1 space-y-1 pl-3">
                    {item.children.map(
                      (child) => (
                        <Link
                          key={
                            child.href
                          }
                          href={
                            child.href
                          }
                          onClick={
                            closeMobileNavigation
                          }
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                            isActive(
                              child.href
                            )
                              ? "bg-zinc-950 font-semibold text-white"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                          }`}
                        >
                          {
                            child.icon
                          }
                          {
                            child.label
                          }
                        </Link>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            );
          }
          if (!item.href) {
            return null;
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={
                closeMobileNavigation
              }
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive(item.href)
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
            >
              {item.icon}
              {!sidebarCollapsed ||
              mobile
                ? item.label
                : null}
            </Link>
          );
        })}
      </nav>
    );
  }
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              setMobileOpen(true)
            }
            className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-950">
              Order Me System by Forza
            </p>
            <p className="truncate text-xs text-zinc-500">
              Human and Technology
              System
            </p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700">
              <MapPin size={14} />
              Current Location:
              <span className="text-zinc-950">
                {activeLocation.name}
              </span>
            </div>
            <SwitchLocationButton />
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600">
              <ShieldCheck size={14} />
              Secure Session
            </div>
            <LogoutButton />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-4 py-2 md:hidden">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700">
            <MapPin size={14} />
            {activeLocation.name}
          </div>
          <SwitchLocationButton />
          <LogoutButton />
        </div>
      </header>
      <div className="flex">
        <aside
          className={`sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 border-r border-zinc-200 bg-white transition-[width] duration-200 lg:flex lg:flex-col ${
            sidebarCollapsed
              ? "w-20"
              : "w-72"
          }`}
        >
          <div className="flex items-center justify-end border-b border-zinc-100 p-3">
            <button
              type="button"
              onClick={() =>
                setSidebarCollapsed(
                  (current) =>
                    !current
                )
              }
              className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
              aria-label={
                sidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen
                  size={18}
                />
              ) : (
                <PanelLeftClose
                  size={18}
                />
              )}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {renderNavigation()}
          </div>
          {!sidebarCollapsed ? (
            <div className="border-t border-zinc-100 p-4">
              <p className="text-xs font-semibold text-zinc-500">
                {activeLocation.name}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                {activeLocation.code}
              </p>
            </div>
          ) : null}
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      {/* ===================================================
          GLOBAL AI ASSISTANT
      =================================================== */}
      <div className="fixed bottom-5 right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        {assistantOpen ? (
          <div className="w-[min(92vw,390px)] overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl shadow-zinc-950/15">
            <div className="flex items-center gap-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-white px-4 py-4">
              <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-amber-300 shadow-lg">
                <span
                  aria-hidden="true"
                  className={`text-[26px] leading-none ${assistantSpeaking ? "animate-pulse" : ""}`}
                >
                  👩‍🍳
                </span>
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-950">Order Me AI</p>
                <p className="mt-0.5 text-xs text-zinc-500">Voice Operations Assistant</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextEnabled = !assistantSpeechEnabled;
                  setAssistantSpeechEnabled(nextEnabled);
                  if (!nextEnabled && typeof window !== "undefined") {
                    window.speechSynthesis?.cancel();
                    setAssistantSpeaking(false);
                  }
                }}
                className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-950"
                aria-label={assistantSpeechEnabled ? "Mute assistant" : "Enable assistant speech"}
              >
                {assistantSpeechEnabled ? <Volume2 size={17} /> : <MicOff size={17} />}
              </button>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-950"
                aria-label="Close AI assistant"
              >
                <X size={17} />
              </button>
            </div>
            <div className="p-4">
              <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                    <MessageCircle size={16} />
                  </div>
                  <p className="text-sm leading-6 text-zinc-700">
                    {assistantMessage || `${greeting}. How can I help you?`}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={startCreateOrderConversation}
                  className="flex min-h-12 items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-zinc-800"
                >
                  <span className="flex items-center gap-3">
                    <ShoppingCart size={18} className="text-amber-300" />
                    Create Order
                  </span>
                  <ChevronRight size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => speakAssistant(`${greeting}. How can I help you?`)}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <Volume2 size={15} />
                  Repeat Greeting
                </button>
              </div>
              {assistantStep === "awaiting-name" ||
              assistantStep === "listening-name" ||
              assistantStep === "name-confirmed" ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={assistantListening ? stopNameListening : startNameListening}
                      disabled={assistantStep === "name-confirmed" || !voiceSupported}
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition ${
                        assistantListening
                          ? "animate-pulse bg-red-600 text-white shadow-lg"
                          : assistantStep === "name-confirmed"
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-950 text-amber-300 hover:bg-zinc-800"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                      aria-label={assistantListening ? "Stop listening" : "Speak your name"}
                    >
                      {assistantListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-900">
                        {assistantStep === "name-confirmed"
                          ? `Name captured: ${capturedName}`
                          : assistantListening
                            ? "Listening for your name..."
                            : voiceSupported
                              ? "Tap the microphone and say your name"
                              : "Voice recognition is unavailable in this browser"}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-zinc-600">
                        {assistantStep === "name-confirmed"
                          ? "Opening Create Normal Order..."
                          : assistantListening
                            ? "Speak clearly. Listening stops automatically after your answer."
                            : "Your name is kept only in this browser session for the current order handoff."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-zinc-200 px-3 py-3 text-xs text-zinc-500">
                  <Mic size={16} className="shrink-0 text-amber-700" />
                  Start Create Order to begin the guided voice workflow.
                </div>
              )}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setAssistantOpen((current) => !current)}
          className="relative grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-zinc-950 text-amber-300 shadow-2xl shadow-zinc-950/25 transition hover:scale-105 active:scale-95"
          aria-label="Open Order Me AI"
        >
          <span
            aria-hidden="true"
            className={`text-[31px] leading-none ${assistantSpeaking ? "animate-pulse" : ""}`}
          >
            👩‍🍳
          </span>
          <span className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
        </button>
      </div>
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-semibold text-zinc-700">
              Order Me System by Forza
            </p>
            <p className="mt-1">
              Human and Technology System
            </p>
          </div>
          <p>
            Developed by Chef Alex
          </p>
        </div>
      </footer>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/25"
            aria-label="Close navigation"
            onClick={() =>
              setMobileOpen(false)
            }
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,330px)] flex-col bg-white shadow-2xl">
            <div className="flex min-h-16 items-center justify-between border-b border-zinc-200 px-4">
              <div>
                <p className="text-sm font-bold text-zinc-950">
                  Order Me System
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {activeLocation.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setMobileOpen(
                    false
                  )
                }
                className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 text-zinc-600"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderNavigation(true)}
            </div>
            <div className="space-y-3 border-t border-zinc-200 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                <MapPin size={14} />
                Current Location:
                {activeLocation.name}
              </div>
              <div className="flex flex-wrap gap-2">
                <SwitchLocationButton />
                <LogoutButton />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
