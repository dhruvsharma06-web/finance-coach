"use client";
import {createAvatar} from "@bible-strong/avatar-react";
import "@bible-strong/avatar-react/styles.css";
import {useSyncExternalStore} from "react";
import definition from "../../../public/avatar/kosh.avatar.json";
export type AvatarState="idle"|"listening"|"thinking"|"talking"|"happy"|"concerned";
const Face=createAvatar(definition);
const animations={idle:"idle",listening:"listening",thinking:"thinking",talking:"working",happy:"happy",concerned:"confused"} as const;
const expressions={idle:"neutral",listening:"small-attentive",thinking:"curious-left",talking:"neutral",happy:"joyful-wide",concerned:"skeptical-right"} as const;
function subscribe(fn:()=>void){const media=window.matchMedia("(prefers-reduced-motion: reduce)");media.addEventListener("change",fn);return()=>media.removeEventListener("change",fn);}
export default function KoshAvatar({state="idle",size=56}:{state?:AvatarState;size?:number}){
 const reduced=useSyncExternalStore(subscribe,()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,()=>true);
 return <span className="relative inline-block shrink-0" style={{width:size,height:size}} aria-hidden="true">
 <Face size={size} {...(reduced?{expression:expressions[state]}:{animation:animations[state]})} ariaLabel="Kosh avatar"/>
 <svg className="pointer-events-none absolute inset-0" viewBox="0 0 120 120"><path d={state==="happy"?"M49 76 Q60 87 71 76":state==="concerned"?"M50 80 Q60 73 70 80":"M52 79 Q60 83 68 79"} fill="none" stroke="var(--fill-ink)" strokeWidth="2.5" strokeLinecap="round"/></svg>
 </span>;
}

