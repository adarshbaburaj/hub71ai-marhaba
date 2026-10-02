"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, House, Pause, Play, RotateCcw, Sparkles, Square, UserRound, X } from "lucide-react";
import type { MoveProfile, Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./nori-at-work.module.css";

interface NoriAtWorkProps { open: boolean; onClose: () => void; profile: MoveProfile; plan?: Plan }
type Message = { speaker: string; text: string; kind: "nori" | "human"; voice?: "nori" | "human" };
const waveform = [9, 16, 24, 13, 20, 27, 18, 10, 22, 28, 15, 21, 12, 26, 19, 11, 24, 16, 28, 20, 13, 23, 17, 9];
const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

export function NoriAtWork({ open, onClose }: NoriAtWorkProps) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [run, setRun] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [playingVoice, setPlayingVoice] = useState<"nori" | "human" | null>(null);
  const [durations, setDurations] = useState({ nori: 1.75, human: 5.56 });
  const [position, setPosition] = useState<{ speaker: "nori" | "human" | null; time: number }>({ speaker: null, time: 0 });
  const log = useRef<HTMLDivElement>(null);
  const voice = useRef<HTMLAudioElement | null>(null);
  if (wasOpen !== open) { setWasOpen(open); setStep(0); setPaused(false); setVoiceNotice(""); setPlayingVoice(null); setPosition({ speaker: null, time: 0 }); }

  const messages: Message[] = [
    { speaker: "Nori", kind: "nori", voice: "nori", text: "Hi Amaya, could you help me find a 2BHK apartment in Abu Dhabi?" },
    { speaker: "Nori", kind: "nori", text: "Please share the rent, deposit and payment dates for a two-bedroom option." },
    { speaker: "Amaya", kind: "human", text: "Hi Nori, happy to help. I can check a few two-bedroom options." },
    { speaker: "Amaya", kind: "human", text: "Would you like to see furnished options as well?" },
    { speaker: "Nori", kind: "nori", text: "Yes, please show the furnishing options, contract length and viewing details." },
    { speaker: "Amaya", kind: "human", text: "Of course. I’ll include those with the payment terms." },
    { speaker: "Nori", kind: "nori", text: "Could you walk me through the 2BHK apartment in a voice message?" },
    { speaker: "Amaya", kind: "human", voice: "human", text: "2BHK apartment details" },
    { speaker: "Amaya", kind: "human", text: "We’ll need to confirm current availability and final terms before you proceed." },
    { speaker: "Nori", kind: "nori", text: "Thanks, Amaya. I’ll review the details and follow up on the rent, deposit and dates." },
  ];

  const cancelVoice = useCallback(() => {
    const clip = voice.current;
    if (clip) { clip.onended = null; clip.onerror = null; clip.onloadedmetadata = null; clip.ontimeupdate = null; clip.pause(); clip.currentTime = 0; clip.removeAttribute("src"); clip.load(); voice.current = null; }
  }, []);
  useEffect(() => {
    if (!open || paused) return;
    const timer = window.setTimeout(() => { if (step === messages.length - 1) { cancelVoice(); setPosition({ speaker: null, time: 0 }); } setStep((step + 1) % messages.length); }, 2200);
    return () => window.clearTimeout(timer);
  }, [open, paused, step, run, messages.length, cancelVoice]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [open, step]);
  useEffect(() => { if (!open) cancelVoice(); return cancelVoice; }, [open, cancelVoice]);

  function replay() { cancelVoice(); setPlayingVoice(null); setPosition({ speaker: null, time: 0 }); setVoiceNotice(""); setStep(0); setPaused(false); setRun(current => current + 1); }
  async function playVoice(speaker: "nori" | "human") {
    if (playingVoice === speaker && voice.current) { cancelVoice(); setPlayingVoice(null); setPosition({ speaker, time: 0 }); setVoiceNotice("Voice message stopped. Resume when you’re ready."); return; }
    cancelVoice();
    setPlayingVoice(null);
    setPosition({ speaker, time: 0 });
    setPaused(true);
    let clip: HTMLAudioElement | null = null;
    try {
      clip = new Audio(speaker === "nori" ? "/audio/nori-enquiry.wav" : "/audio/estate-agent-2bhk.mp3");
      voice.current = clip;
      clip.onloadedmetadata = () => { if (!clip || voice.current !== clip || !Number.isFinite(clip.duration) || clip.duration <= 0) return; const duration = clip.duration; setDurations(current => ({ ...current, [speaker]: duration })); };
      clip.ontimeupdate = () => { if (clip && voice.current === clip) setPosition({ speaker, time: clip.currentTime }); };
      clip.onended = () => { if (!clip || voice.current !== clip) return; setPosition({ speaker, time: Number.isFinite(clip.duration) ? clip.duration : durations[speaker] }); cancelVoice(); setPlayingVoice(null); setVoiceNotice("Voice message finished. Resume when you’re ready."); };
      clip.onerror = () => { if (voice.current !== clip) return; cancelVoice(); setPlayingVoice(null); setVoiceNotice("The voice message could not play. Try again or resume the conversation."); };
      setPlayingVoice(speaker);
      setVoiceNotice(`Playing ${speaker === "nori" ? "Nori’s" : "Amaya’s"} voice message. Click again to stop.`);
      await clip.play();
    } catch {
      if (clip && voice.current !== clip) return;
      cancelVoice(); setPlayingVoice(null); setVoiceNotice("The voice message is unavailable. Try again or resume the conversation.");
    }
  }

  const agents = [
    { name: "Nori", Icon: Sparkles, status: step === 9 ? "Reviewing" : "Enquiry", done: step === 9 },
    { name: "Housing", Icon: House, status: step < 8 ? "Preparing" : "To confirm", done: false },
    { name: "Amaya", Icon: UserRound, status: step < 2 ? "Waiting" : step < 7 ? "Replying" : "Voice reply", done: step >= 7 },
  ];
  return <Dialog.Root open={open} onOpenChange={next => { if (!next) { cancelVoice(); onClose(); } }}>
    <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className={styles.dialog} onCloseAutoFocus={event => {
      const trigger = document.querySelector<HTMLButtonElement>("[data-nori-demo-trigger]");
      if (trigger?.isConnected) { event.preventDefault(); trigger.focus(); }
    }}>
      <Dialog.Title className={styles.accessible}>Nori at work</Dialog.Title>
      <div className={styles.header}><span className={styles.avatar} aria-hidden="true">A</span><div className={styles.contact}><strong>Amaya · Estate agent</strong><span className={styles.badge}>Demo conversation</span></div><Dialog.Close className="icon-button" aria-label="Close Nori simulation"><X size={18} /></Dialog.Close></div>
      <Dialog.Description className={styles.intro}>2BHK enquiry · a two-bedroom example separate from your chosen plan.</Dialog.Description>
      <div ref={log} className={styles.log} role="log" aria-label="Simulated conversations" aria-live="polite" aria-relevant="additions">
        {messages.slice(0, step + 1).map((message, index) => {
          const speaker = message.voice;
          const progress = speaker && position.speaker === speaker ? Math.min(1, position.time / durations[speaker]) : 0;
          return <article key={index} className={styles.messageRow} data-simulation-message={index} data-message-direction={message.kind === "nori" ? "outgoing" : "incoming"}>
            <div className={cn(styles.message, styles[message.kind])} data-chat-bubble="text"><span className={styles.accessible}>{message.speaker}: </span><p>{message.text}</p></div>{speaker && <button type="button" className={cn(styles.message, styles[message.kind], styles.voice)} data-chat-bubble="voice" aria-label={`Voice message · ${speaker === "nori" ? "Nori" : "estate agent"}`} aria-pressed={playingVoice === speaker} data-audio-progress={progress} onClick={() => { void playVoice(speaker); }}>
              <span className={styles.playIcon} aria-hidden="true">{playingVoice === speaker ? <Square size={12} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</span><span className={styles.waveform} aria-hidden="true">{waveform.map((height, bar) => <i key={bar} style={{ height, opacity: progress > bar / waveform.length ? 1 : .35 }} />)}</span><span className={styles.duration} aria-hidden="true">{timeLabel(playingVoice === speaker ? position.time : Math.ceil(durations[speaker]))}</span>
            </button>}
          </article>;
        })}
        {!paused && <div className={styles.typing} aria-label="Next sample message is being prepared"><span /><span /><span /></div>}
      </div>
      <div className={styles.agents} aria-label="Simulated agent status">{agents.map(({ name, Icon, status, done }) => <div key={name}><Icon size={12} aria-hidden="true" /><strong>{name}</strong><small>{status}</small>{done && <Check size={10} aria-hidden="true" />}</div>)}</div>
      <div className={styles.controls}><button type="button" disabled={!!playingVoice} onClick={() => setPaused(current => !current)}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "Resume" : "Pause"}</button><button type="button" onClick={replay}><RotateCcw size={14} /> Replay</button><span>22-second loop · pauses for audio</span></div>
      <p className={styles.voiceNotice} role="status">{voiceNotice || "Simulation · no messages sent"}</p>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
