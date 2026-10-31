"use client";
import {useState} from "react";
import {Button} from "@/components/ui";
export default function LoginPage(){
 const [passcode,setPasscode]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 return <main className="fixed inset-0 z-50 grid min-h-dvh place-items-center overflow-y-auto bg-bg px-6 py-12 text-ink"><section className="w-full max-w-md" aria-labelledby="login-title">
 <div className="mb-12 font-display text-3xl">Kosh<span className="text-accent">.</span></div>
 <h1 id="login-title" className="font-display text-[42px] leading-[1.1] tracking-[-0.025em] sm:text-5xl">Enter your passcode</h1>
 <p className="mt-4 text-base leading-relaxed text-muted">Open your living money model.</p>
 <form className="mt-8 space-y-5" onSubmit={async e=>{
 e.preventDefault();setBusy(true);setError("");
 try{const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode})});const body=await response.json();
 if(!response.ok){setError(response.status===429?"Too many attempts. Wait 10 minutes and try again.":body.error??"Could not sign in. Try again.");return;}
 const next=new URLSearchParams(window.location.search).get("next")??"/",target=new URL(next,window.location.origin);
 window.location.assign(target.origin===window.location.origin&&!target.pathname.startsWith("/login")?target.pathname+target.search:"/");
 }catch{setError("Could not connect. Check your connection and try again.");}finally{setBusy(false);}
 }}>
 <div><label htmlFor="passcode" className="mb-2 block text-base font-medium">Passcode</label><input id="passcode" name="passcode" type="password" autoComplete="current-password" autoFocus required value={passcode} onChange={e=>setPasscode(e.target.value)} aria-invalid={!!error} aria-describedby={error?"login-error":undefined} className="h-14 w-full rounded-xl border border-line bg-surface px-4 text-[18px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"/></div>
 {error&&<p id="login-error" role="alert" className="text-base text-danger">{error}</p>}
 <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} disabled={!passcode.trim()}>Open Kosh</Button>
 </form></section></main>;
}
