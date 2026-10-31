"use client";
import dynamic from "next/dynamic";
import {useCallback,useEffect,useRef,useState,startTransition} from "react";
import {usePathname,useRouter} from "next/navigation";
import {X,ArrowUp,Mic,RotateCcw,ArrowRight} from "lucide-react";
import {Button} from "@/components/ui";
import type {CoachMessage} from "@/lib/types";
import type {AssistantAction,AssistantResponse} from "@/lib/assistant/types";
import {pageSuggestions,actionHref} from "@/lib/assistant/intents";
import type {AvatarState} from "./kosh-avatar";
const KoshAvatar=dynamic(()=>import("./kosh-avatar"),{ssr:false,loading:()=> <span className="inline-block size-14 rounded-full bg-fill" aria-hidden/>});
type Chat={message:CoachMessage;actions?:AssistantAction[]};
const key="kosh-assistant-v1";
function actionLabel(a:AssistantAction):string{switch(a.type){case"navigate":return a.label;case"simulate":return"Open in planner";case"fix_plan":return"Fix my plan";case"filter_transactions":return"Open transactions";case"import_sample":return"Try sample";case"theme":return"Use "+a.value+" mode";case"open_palette":return"Open palette";}}
export function Assistant(){
 const page=usePathname(),router=useRouter(),dialog=useRef<HTMLDialogElement>(null),launcher=useRef<HTMLButtonElement>(null),input=useRef<HTMLInputElement>(null),bottom=useRef<HTMLDivElement>(null),request=useRef<AbortController|null>(null);
 const [open,setOpen]=useState(false),[chat,setChat]=useState<Chat[]>([]),[text,setText]=useState(""),[busy,setBusy]=useState(false),[typed,setTyped]=useState<string|null>(null),[mood,setMood]=useState<AvatarState>("idle"),[error,setError]=useState("");
 const close=useCallback(()=>{setOpen(false);dialog.current?.close();launcher.current?.focus();},[]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{try{const saved=JSON.parse(sessionStorage.getItem(key)??"[]");if(Array.isArray(saved))setChat(saved.filter(x=>x&&x.message&&typeof x.message.content==="string"&&["user","assistant"].includes(x.message.role)).slice(-30));}catch{}});return()=>cancelAnimationFrame(frame);},[]);
 useEffect(()=>{if(open){dialog.current?.showModal();input.current?.focus();}else dialog.current?.close();},[open]);
 useEffect(()=>{const hide=()=>close();const keyboard=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){close();}};window.addEventListener("kosh:palette",hide);window.addEventListener("keydown",keyboard);return()=>{window.removeEventListener("kosh:palette",hide);window.removeEventListener("keydown",keyboard);};},[close]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:"nearest"});},[chat,typed]);
 useEffect(()=>()=>request.current?.abort(),[]);
 const persist=(next:Chat[])=>{setChat(next);try{sessionStorage.setItem(key,JSON.stringify(next.slice(-30)));}catch{}};
 const send=async(value:string)=>{
 if(busy||typed!==null||!value.trim())return;
 const next=[...chat,{message:{role:"user" as const,content:value.trim()}}].slice(-30);persist(next);setText("");setBusy(true);setError("");setMood("thinking");
 request.current=new AbortController();
 try{
 const response=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next.map(c=>({role:c.message.role,content:c.message.content})),page}),signal:request.current.signal});
 if(!response.ok){const body=await response.json();throw new Error(body.error??"Could not reach Kosh. Try again.");}
 const data:AssistantResponse=await response.json();
 setBusy(false);
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if(!reduced){setMood("talking");setTyped("");const full=data.reply.content;await new Promise<void>(resolve=>{let n=0;const timer=setInterval(()=>{n=Math.min(n+4,full.length);setTyped(full.slice(0,n));if(n===full.length){clearInterval(timer);resolve();}},48);});}
 persist([...next,{message:data.reply,actions:data.actions}]);setTyped(null);setMood(data.mood==="neutral"?"idle":data.mood);
 }catch(e){setBusy(false);setTyped(null);setMood("concerned");if(!(e instanceof DOMException&&e.name==="AbortError"))setError(e instanceof Error?e.message:"Could not connect. Try again.");}
 };
 const act=(action:AssistantAction)=>{
 if(action.type==="theme"){document.documentElement.setAttribute("data-theme",action.value);try{localStorage.setItem("kosh-theme",action.value);}catch{};return;}
 close();if(action.type==="open_palette"){window.dispatchEvent(new Event("kosh:palette"));return;}
 const href=actionHref(action);if(href&&href.startsWith("/")&&!href.startsWith("//"))startTransition(()=>router.push(href,{transitionTypes:["nav-forward"]}));
 };
 if(page==="/login")return null;
 return <>
 <button ref={launcher} onClick={()=>setOpen(true)} className="fixed right-4 bottom-5 z-30 flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-5 pl-1 text-base font-medium text-ink focus-visible:outline-2 focus-visible:outline-accent sm:right-6" aria-label="Ask Kosh" aria-haspopup="dialog"><KoshAvatar state="idle" size={56}/><span>Ask Kosh</span></button>
 <dialog ref={dialog} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} aria-labelledby="assistant-title" onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();e.stopPropagation();close();window.dispatchEvent(new Event("kosh:palette"));}}} className="fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-none overflow-hidden border border-line bg-bg p-0 text-ink backdrop:bg-ink/20 sm:top-auto sm:right-6 sm:bottom-5 sm:left-auto sm:h-[min(760px,90dvh)] sm:w-[420px] sm:rounded-2xl">
 <div className="flex h-full flex-col">
 <header className="flex shrink-0 items-start gap-3 border-b border-line px-5 py-4"><KoshAvatar state={busy?"thinking":typed!==null?"talking":text?"listening":mood} size={100}/><div className="flex-1 pt-3"><h2 id="assistant-title" className="font-display text-3xl">Ask Kosh</h2><p className="mt-1 text-base text-muted">Your money, made clearer.</p></div><Button variant="ghost" size="sm" onClick={close} aria-label="Close assistant"><X size={20}/></Button></header>
 <div className="flex items-center justify-between px-5 py-2"><Button variant="ghost" size="sm" disabled={busy||typed!==null} onClick={()=>{request.current?.abort();persist([]);setError("");setMood("idle");try{sessionStorage.removeItem(key);}catch{}}}><RotateCcw size={16}/>New chat</Button><a href="https://github.com/dhruvsharma06-web/finance-coach" target="_blank" rel="noreferrer" className="text-base text-muted underline underline-offset-4">Source · AGPL</a></div>
 <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4" aria-label="Conversation">
 {!chat.length&&<p className="py-5 text-base leading-relaxed text-muted">Ask about a payment, explore a what-if, or let me take you to the right page. I only suggest actions; you stay in control.</p>}
 {chat.map((item,i)=><div key={i} className={item.message.role==="user"?"my-3 ml-8 rounded-2xl bg-ink px-4 py-3 text-bg":"my-3 rounded-2xl bg-surface px-4 py-3 text-ink"}><p className="whitespace-pre-wrap text-base leading-relaxed">{item.message.content}</p>{item.actions?.map((action,j)=><Button key={j} className="mt-3 w-full justify-between !text-base" onClick={()=>act(action)}>{actionLabel(action)}<ArrowRight size={16}/></Button>)}</div>)}
 <div aria-live="polite" aria-atomic="true">{busy&&<p className="py-3 text-base text-muted">Looking at your money model…</p>}{typed!==null&&<p className="rounded-2xl bg-surface p-4 text-base leading-relaxed">{typed}</p>}{error&&<p role="alert" className="py-3 text-base text-danger">{error}</p>}</div><div ref={bottom}/>
 </div>
 <div className="shrink-0 border-t border-line bg-surface p-4"><div className="mb-3 flex gap-2 overflow-x-auto pb-1">{pageSuggestions(page).map(chip=><button key={chip} disabled={busy||typed!==null} onClick={()=>void send(chip)} className="shrink-0 rounded-full border border-line px-3 py-2 text-base hover:bg-surface-2 disabled:opacity-50">{chip}</button>)}</div>
 <form className="flex gap-2" onSubmit={e=>{e.preventDefault();void send(text);}}><input ref={input} value={text} onChange={e=>setText(e.target.value)} aria-label="Ask Kosh a question" maxLength={4000} placeholder="Ask about your money…" className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-3 text-base outline-none focus:ring-2 focus:ring-accent"/><Button type="submit" variant="primary" aria-label="Send question" disabled={busy||typed!==null||!text.trim()}><ArrowUp size={20}/></Button></form>
 <p className="mt-3 flex items-center gap-2 text-base text-muted"><Mic size={16}/>Hold your Wispr Flow key and talk</p></div>
 </div></dialog></>;
}


