"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarClock, Plus, ReceiptText, Footprints, MapPin, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { matchmakerApi } from "@/lib/apiClient";
import { chatAppend, chatReset, chatSetCriteria, chatSetSearch, countGuestMessage } from "@/lib/mock/actions";
import { vndShort } from "@/lib/mock/format";
import { interpret, searchUnits } from "@/lib/mock/matchmaker";
import { unitStatus } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { CriteriaState } from "@/lib/mock/types";
import { UNITS } from "@/lib/mock/units";
import { useRole, useSession } from "@/lib/auth/client";
import { ButlerMascot, VINNY_GREETINGS, type MascotMood } from "@/components/mascot/ButlerMascot";
import { Composer } from "./Composer";
import { Messages } from "./Messages";
import { ResultsPanel } from "./ResultsPanel";
import styles from "./ChatExperience.module.css";

const TRUST = [
  { icon: BadgeCheck, text: "Ảnh thật, có mốc thời gian" },
  { icon: ReceiptText, text: "All-in Cost, không phí ẩn" },
  { icon: Footprints, text: "Host đón tại sảnh" },
  { icon: CalendarClock, text: "Giữ căn qua VietQR" },
];

const MASCOT_POSITIONS = [
  "pos_top_center",
  "pos_top_right",
  "pos_side_right",
  "pos_top_left",
  "pos_side_left",
] as const;

type MascotPosition = (typeof MASCOT_POSITIONS)[number];

const POSITION_SPEECHES: Record<MascotPosition, { speech: string; badge: string }> = {
  pos_top_center: {
    speech: "Đang quan sát toàn bộ rổ hàng Ocean Park 1 ✨",
    badge: "Đỉnh trung tâm",
  },
  pos_top_right: {
    speech: "Góc này ngắm biển hồ Crystal Lagoon đẹp lắm nè! 🌊",
    badge: "Góc trên phải",
  },
  pos_side_right: {
    speech: "Bạn thích căn ban công Đông Nam hay view thoáng mát? 🍃",
    badge: "Sườn phải",
  },
  pos_top_left: {
    speech: "Mình giữ sẵn thẻ thang máy cho bạn rồi nhé! 🔑",
    badge: "Góc trên trái",
  },
  pos_side_left: {
    speech: "Host nội khu sẵn sàng đón bạn trong 3 phút nha! 🏢",
    badge: "Sườn trái",
  },
};

/** Trang chủ khách thuê: ban đầu là hero + khung chat; khi bắt đầu tìm căn, chat thu về cột trái và mở màn kết quả. */
export function ChatExperience({ below }: { below: ReactNode }) {
  const state = useMock();
  const role = useRole();
  const { chat } = state;
  const [thinking, setThinking] = useState<{ steps: string[] } | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [tab, setTab] = useState<"chat" | "results">("chat");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [mascotPos, setMascotPos] = useState<MascotPosition>("pos_top_center");
  const [isCruising, setIsCruising] = useState(false);
  const [mascotCustomSpeech, setMascotCustomSpeech] = useState<string | null>(null);
  const busy = useRef(false);

  const statusOf = (u: (typeof UNITS)[number]) => unitStatus(state, u);
  const openCount = UNITS.filter((u) => unitStatus(state, u) === "available").length;
  const results = searchUnits(chat.criteria, statusOf);

  const mascotMood: MascotMood = thinking
    ? "thinking"
    : freshId
    ? "happy"
    : isTyping
    ? "listening"
    : "idle";

  // Thỉnh thoảng linh vật tự động di chuyển tuần tra quanh khung chat tổng
  useEffect(() => {
    if (isTyping || !!thinking) return;

    const timer = setInterval(() => {
      setMascotPos((prev) => {
        const nextIdx = (MASCOT_POSITIONS.indexOf(prev) + 1) % MASCOT_POSITIONS.length;
        const nextPos = MASCOT_POSITIONS[nextIdx];
        setIsCruising(true);
        setTimeout(() => setIsCruising(false), 1400);
        return nextPos;
      });
    }, 12000); // Tự động di chuyển mỗi 12 giây

    return () => clearInterval(timer);
  }, [isTyping, thinking]);

  // Khi đang gõ phím, đưa robot về phía trên để không che khuất nội dung
  useEffect(() => {
    if (isTyping && (mascotPos === "pos_side_left" || mascotPos === "pos_side_right")) {
      setIsCruising(true);
      setMascotPos("pos_top_center");
      setTimeout(() => setIsCruising(false), 1400);
    }
  }, [isTyping, mascotPos]);

  // Chuyển góc tuần tra khi người dùng chạm vào robot hoặc huy hiệu
  const cycleMascotPosition = () => {
    setMascotPos((prev) => {
      const nextIdx = (MASCOT_POSITIONS.indexOf(prev) + 1) % MASCOT_POSITIONS.length;
      const nextPos = MASCOT_POSITIONS[nextIdx];
      setIsCruising(true);
      setTimeout(() => setIsCruising(false), 1400);
      setMascotCustomSpeech(POSITION_SPEECHES[nextPos].speech);
      setTimeout(() => setMascotCustomSpeech(null), 4000);
      return nextPos;
    });
  };

  const isDemo = process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";
  const locked = false;
  const { user } = useSession();
  const first = role === "tenant" ? (user?.fullName?.split(" ").slice(-1)[0] ?? null) : null;
  const [greetingIdx, setGreetingIdx] = useState(0);

  useEffect(() => {
    // Chọn ngẫu nhiên 1 trong 3 câu chào ấn tượng của Vinny khi vào trang
    setGreetingIdx(Math.floor(Math.random() * VINNY_GREETINGS.length));
  }, []);

  const activeGreeting = VINNY_GREETINGS[greetingIdx];
  const greeting = first ? `Chào ${first}! ${activeGreeting}` : activeGreeting;

  const onSend = async (text: string) => {
    if (busy.current || locked) return;
    busy.current = true;
    try {
      chatAppend({ role: "user", text });
      if (role === null) countGuestMessage();

      // Attempt to contact Python AI Agent
      setThinking({
        steps: ["Đang kết nối với AI Agent", "Đang phân tích ý định", "Xếp hạng theo mức tiết kiệm"],
      });

      let sessionId = window.localStorage.getItem("vinstay_session_id");
      if (!sessionId) {
        sessionId = Math.random().toString(36).slice(2, 10);
        window.localStorage.setItem("vinstay_session_id", sessionId);
      }

      try {
        const res = await fetch("http://localhost:8000/api/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, session_id: sessionId, budget_ceiling: chat.criteria.budget, motorbikes: chat.criteria.household?.motorbikes, cars: chat.criteria.household?.cars, occupants: chat.criteria.household?.persons }),
        });
        
        if (res.ok) {
           const data = await res.json();
           const hasUnits = data.matched_units && data.matched_units.length > 0;
           
           if (hasUnits) {
              // Map AI matched units back to our UI logic if needed, but the AI returns IDs
              chatSetSearch({ ...chat.criteria, ...data.criteria });
              setFreshId(chatAppend({ role: "assistant", text: data.response, resultIds: data.matched_units.map((u: any) => u.unit_code || u.id).slice(0, 3) }));
              setTab("results");
           } else {
              setFreshId(chatAppend({ role: "assistant", text: data.response }));
           }
        } else {
           throw new Error("Backend error");
        }
      } catch (err) {
        console.error("AI API Error, falling back to mock:", err);
        // Fallback to local mock if Python is down
        const result = interpret(text, chat.criteria, chat.searched, statusOf);
        const isSearch = result.kind === "search";
        if (isSearch) {
          chatSetSearch(result.criteria);
          setFreshId(chatAppend({ role: "assistant", text: result.reply, resultIds: result.results.slice(0, 3).map((r) => r.unit.id), criteria: result.criteria }));
          setTab("results");
        } else {
          setFreshId(chatAppend({ role: "assistant", text: result.reply }));
        }
      }
    } catch (err) {
      console.error("Chat send error:", err);
    } finally {
      setThinking(null);
      busy.current = false;
    }
  };

  const onCriteria = (c: CriteriaState) => chatSetCriteria(c);
  const workspace = chat.searched;

  if (!workspace) {
    return (
      <>
        <section className={styles.hero}>
          <div className={`wrap ${styles.heroInner}`}>
            <div className={styles.heroTop}>
              <span className={styles.liveBadge}>
                <i className={styles.liveDot} /> <strong className="num">{openCount} căn</strong> đang mở tại Ocean Park 1
              </span>
              <h1 className={styles.h1}>Căn hộ thật ở Ocean Park, tìm ra trong 30 giây</h1>
              <p className={styles.lead}>Không tin ảo, không phí ẩn, không môi giới làm phiền — Host nội khu đón bạn tận sảnh.</p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "2px" }}>
                <button
                  type="button"
                  onClick={() => {
                    chatSetSearch(chat.criteria);
                    setTab("results");
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(255, 255, 255, 0.88)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255, 255, 255, 0.95)",
                    borderRadius: "999px",
                    padding: "10px 22px",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#0a3d4a",
                    boxShadow: "0 8px 24px -4px rgba(10, 61, 74, 0.16)",
                    cursor: "pointer",
                  }}
                >
                  <MapPin size={16} /> Mở Bản đồ Kính mờ & Rổ hàng ({openCount} căn)
                </button>
              </div>
            </div>

            <div className={styles.chatWrapper}>
              {/* Linh vật thỉnh thoảng di chuyển tuần tra quanh khung chat tổng */}
              <div className={`${styles.wanderingMascot} ${styles[mascotPos]} ${isCruising ? styles.cruising : ""}`}>
                <ButlerMascot
                  size="hero"
                  mood={mascotMood}
                  autoSpeak={!isTyping && !thinking}
                  customMessage={mascotCustomSpeech || (isCruising ? "Đang bay lượn tuần tra rổ hàng... 🚀" : undefined)}
                  onClick={cycleMascotPosition}
                />
              </div>

              <div className={styles.chatCard}>
                <div className={styles.chatHead}>
                  <ButlerMascot size="mini" mood={mascotMood} />
                  <div className={styles.chatHeadText}>
                    <strong>VinStay AI · Quản Gia Số</strong>
                    <span>
                      <i className={styles.liveDot} /> Đang trực tuyến · Sẵn sàng mở cửa & đón tận sảnh
                    </span>
                  </div>
                </div>
                <div className={styles.convo}>
                  <Messages greeting={greeting} messages={chat.messages} thinking={thinking} freshId={freshId} onFreshDone={() => setFreshId(null)} />
                </div>
                <div className={styles.chatFoot}>
                  <Composer
                    variant="hero"
                    criteria={chat.criteria}
                    onCriteria={onCriteria}
                    onSend={onSend}
                    onTyping={setIsTyping}
                    busy={!!thinking}
                    locked={locked}
                    guestNotice={false}
                    showPrompts={chat.messages.length === 0}
                  />
                </div>
              </div>
            </div>

            <ul className={styles.trust}>
              {TRUST.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <Icon size={18} /> {text}
                </li>
              ))}
            </ul>
          </div>
        </section>
        {below}
      </>
    );
  }

  return (
    <div className={`${styles.workspace} ${railCollapsed ? styles.workspaceCollapsed : ""} ${tab === "results" ? styles.showResults : styles.showChat}`}>
      <div className={styles.tabs} role="tablist" aria-label="Chuyển giữa trò chuyện và kết quả">
        <button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")}>
          Trò chuyện
        </button>
        <button type="button" role="tab" aria-selected={tab === "results"} onClick={() => setTab("results")}>
          Kết quả ({results.length})
        </button>
      </div>

      {railCollapsed && (
        <button
          type="button"
          className={styles.openAiPill}
          onClick={() => setRailCollapsed(false)}
          aria-label="Mở Trợ lý VinStay AI"
        >
          <span className={styles.openAiOrb}>
            <Sparkles size={16} />
          </span>
          <span className={styles.openAiLabel}>
            <strong>Trợ lý VinStay AI</strong>
            <span>Hỏi tiếp hoặc chỉnh yêu cầu ({results.length} căn khớp)</span>
          </span>
          <PanelLeftOpen size={16} />
        </button>
      )}

      {!railCollapsed && (
        <aside className={styles.rail} aria-label="Trò chuyện với VinStay AI">
          <div className={styles.railHead}>
            <div className={styles.railHeadBrand}>
              <ButlerMascot size="mini" mood={mascotMood} />
              <div>
                <div className={styles.aiStatusTitle}>
                  <strong>VinStay AI · Quản Gia</strong>
                  <span className={styles.aiLiveDot} title="Đang trực tuyến" />
                </div>
                <span className={styles.aiStatusSub}>Trợ lý All-in Cost · Ocean Park 1</span>
              </div>
            </div>

            <div className={styles.railHeadActions}>
              <button
                type="button"
                className={styles.railActionBtn}
                onClick={() => {
                  chatReset();
                  setGreetingIdx((prev) => (prev + 1) % VINNY_GREETINGS.length);
                }}
                title="Bắt đầu cuộc trò chuyện mới"
              >
                <Plus size={14} /> Mới
              </button>
              <button
                type="button"
                className={styles.railActionBtn}
                onClick={() => setRailCollapsed(true)}
                title="Thu gọn bảng trợ lý để mở rộng toàn màn hình"
                aria-label="Thu gọn trợ lý"
              >
                <PanelLeftClose size={15} />
              </button>
            </div>
          </div>
          <div className={styles.railMsgs}>
            <Messages
              greeting={greeting}
              messages={chat.messages}
              thinking={thinking}
              freshId={freshId}
              onFreshDone={() => setFreshId(null)}
              onShowResults={() => setTab("results")}
            />
          </div>
          <div className={styles.railFoot}>
            <Composer variant="rail" criteria={chat.criteria} onCriteria={onCriteria} onSend={onSend} onTyping={setIsTyping} busy={!!thinking} locked={locked} guestNotice={false} />
          </div>
        </aside>
      )}

      <section className={styles.results} aria-label="Kết quả tìm căn">
        <ResultsPanel results={results} criteria={chat.criteria} onCriteria={onCriteria} state={state} totalOpen={openCount} />
      </section>
    </div>
  );
}
