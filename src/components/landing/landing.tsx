"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, MessageSquare, MoveUpRight, ShieldCheck } from "lucide-react";
import "./landing.css";
import { MoneyUniverse } from "./money-universe";

// The project's Tailwind Turbopack loader emits global CSS; namespace this surface.
const styles = {
  landing: "koshLanding_landing",
  skip: "koshLanding_skip",
  nav: "koshLanding_nav",
  brand: "koshLanding_brand",
  navAction: "koshLanding_navAction",
  hero: "koshLanding_hero",
  heroIntro: "koshLanding_heroIntro",
  heroTitle: "koshLanding_heroTitle",
  button: "koshLanding_button",
  story: "koshLanding_story",
  stage: "koshLanding_stage",
  storyCopy: "koshLanding_storyCopy",
  chapter: "koshLanding_chapter",
  current: "koshLanding_current",
  connection: "koshLanding_connection",
  decisions: "koshLanding_decisions",
  steps: "koshLanding_steps",
  activeStep: "koshLanding_activeStep",
  perspective: "koshLanding_perspective",
  model: "koshLanding_model",
  sheet: "koshLanding_sheet",
  statement: "koshLanding_statement",
  pattern: "koshLanding_pattern",
  plan: "koshLanding_plan",
  sheetHead: "koshLanding_sheetHead",
  sample: "koshLanding_sample",
  transaction: "koshLanding_transaction",
  paperFoot: "koshLanding_paperFoot",
  category: "koshLanding_category",
  bar: "koshLanding_bar",
  goalAmount: "koshLanding_goalAmount",
  planFoot: "koshLanding_planFoot",
  goalMark: "koshLanding_goalMark",
  scrollCue: "koshLanding_scrollCue",
  small: "koshLanding_small",
  diagram: "koshLanding_diagram",
  textLink: "koshLanding_textLink",
  calculator: "koshLanding_calculator",
  calcHeader: "koshLanding_calcHeader",
  rangeEnds: "koshLanding_rangeEnds",
  months: "koshLanding_months",
  calcNote: "koshLanding_calcNote",
  close: "koshLanding_close",
  closeTop: "koshLanding_closeTop",
  closeNote: "koshLanding_closeNote",
  footer: "koshLanding_footer",
  footerBrand: "koshLanding_footerBrand",
};

const chapters = [
  { title: "A little scattered.", body: "Bank statements. UPI payments. That SMS you forgot about. Your financial life happens everywhere.", label: "Bring it together" },
  { title: "Now it makes sense.", body: "Kosh organises your transactions, spots recurring payments and learns when you correct a category.", label: "Find your rhythm" },
  { title: "A plan that moves.", body: "Connect everyday spending to real goals. Try a decision before you make it, and see what changes.", label: "See what comes next" },
];

export function Landing() {
  const scene = useRef<HTMLElement>(null);
  const progressBar = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);
  const [saving, setSaving] = useState(3000);
  useEffect(() => {

    let frame = 0;
    const update = () => {
      frame = 0;
      if (!scene.current) return;
      const rect = scene.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - window.innerHeight)));
      setChapter(Math.min(2, Math.floor(progress * 3)));
      if(progressBar.current) progressBar.current.style.transform = `scaleX(${progress})`;

    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);

  return <div className={styles.landing}>
    <a className={styles.skip} href="#main">Skip to content</a>
    <header className={styles.nav}>
      <Link className={styles.brand} href="/" aria-label="Kosh home">Kosh<span /></Link>
      <nav aria-label="Landing page"><a href="#story">The idea</a><a href="#decisions">Try a what-if</a></nav>
      <Link className={styles.navAction} href="/login">Open Kosh <MoveUpRight size={17} /></Link>
    </header>
    <main id="main">
      <section className={styles.hero}>
        <div className={styles.heroTitle}><p className="kosh3d-eyebrow"><span /> Your personal money universe</p><h1>Money, in a<br /><em>new dimension.</em></h1><p>Every payment has a place. Every decision has a ripple. Meet Kosh, the AI coach that connects your money to your life.</p><Link className={styles.button} href="/login">Step inside Kosh <ArrowRight size={19} /></Link><a className="kosh3d-explore" href="#story">Scroll to explore <ArrowDown size={16} /></a></div>
        <div className="kosh3d-hero-art"><MoneyUniverse /><span className="kosh3d-art-label">Your money. One connected world.</span><span className="kosh3d-sample">Illustrative money model · Move your cursor</span></div>
      </section>

      <section id="story" ref={scene} className={styles.story} aria-label="From scattered statements to a living money model">
        <div className={styles.stage}>
          <div className={styles.storyCopy}>
            {chapters.map((item, i) => <article key={item.title} className={`${styles.chapter} ${chapter === i ? styles.current : ""}`}><h2>{item.title}</h2><p>{item.body}</p></article>)}
            <div className={styles.steps} aria-label="Money model stages">{chapters.map((item, i) => <button type="button" key={item.label} aria-pressed={chapter === i} className={chapter === i ? styles.activeStep : ""} onClick={()=>{const element=scene.current;if(element){const position=element.getBoundingClientRect().top+window.scrollY;window.scrollTo({top:position+([.16,.5,.95][i])*(element.offsetHeight-window.innerHeight),behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});}}}><span>{String(i+1).padStart(2,"0")}</span>{item.label}<ArrowRight size={14}/></button>)}</div>
          </div>
          <div className="kosh3d-network"><MoneyUniverse network /><div className={`kosh3d-goal-labels ${chapter===2?"is-visible":""}`} aria-hidden={chapter!==2}><span>A place of your own</span><span>A safety net</span><span>A new horizon</span></div><div className="kosh3d-model-caption"><span className="kosh3d-pulse" /> {chapter===0?"Your everyday transactions":chapter===1?"One connected money model":"Real goals. Room to grow."}<span>Illustrative model</span></div></div>
          <div className="kosh3d-story-progress" aria-hidden="true"><div ref={progressBar}/></div>
          <span className={styles.scrollCue}>Scroll to bring it together <ArrowDown size={16} /></span>
        </div>
      </section>

      <section className={styles.connection}>
        <h2>A money model.<br />With a memory.</h2>
        <div><p>A spending tracker tells you where your money went. Kosh connects that history to the life you’re planning.</p><div className={`${styles.diagram} kosh3d-flow`} role="img" aria-label="Statements feed your money model, which connects goals, what-if decisions and coaching"><span>Statements & SMS</span><ArrowDown /><strong>Your living money model</strong><div><span>Goals</span><span>What-ifs</span><span>Coaching</span></div></div><p className={styles.small}>Correct a category once. Review recurring costs. Ask a question in everyday language. Keep the model in step with you.</p></div>
      </section>

      <section id="decisions" className={styles.decisions}>
        <div><h2>Before you decide,<br />see the difference.</h2><p>What if you put a little more aside each month? Move the slider and see a simple example.</p><Link className={styles.textLink} href="/login?next=/planner">Explore your own what-ifs <ArrowRight size={18} /></Link></div>
        <div className={styles.calculator} data-ui><div className="kosh3d-growth" aria-hidden="true">{[0,1,2,3,4,5,6].map(i => <div key={i} className="kosh3d-column" style={{height: `${35+i*(saving/15000)*21}px`}}><i /><b /><span /></div>)}</div><div className={styles.calcHeader}><span>Emergency fund example</span><span>₹1,80,000 goal</span></div><p className={styles.months}>{Math.ceil(180000 / saving)} <span>months</span></p><p>Starting from ₹0, with no interest assumed.</p><label htmlFor="monthly-saving">Monthly contribution <strong>₹{saving.toLocaleString("en-IN")}</strong></label><input id="monthly-saving" type="range" min="3000" max="15000" step="500" value={saving} onChange={event => setSaving(Number(event.target.value))} /><div className={styles.rangeEnds}><span>₹3,000</span><span>₹15,000</span></div><p className={styles.calcNote}>Simple, deterministic maths. Your actual plan uses your income, costs and priorities.</p></div>
      </section>

      <section className={styles.close}><div className="kosh3d-close-orbit" aria-hidden="true"><i /><i /><i /><span>₹</span></div><div className={styles.closeTop}><ShieldCheck size={25} /><p>No product pitches. No promised returns.<br />Just a clearer view of your own money.</p></div><h2>Make space<br />for what matters.</h2><Link href="/login" className={styles.button}>Open your money model <ArrowRight size={19} /></Link><p className={styles.closeNote}><MessageSquare size={16} /> Your questions. Your goals. Your next move.</p></section>
    </main>
    <footer className={styles.footer}><Link href="/" className={styles.footerBrand}>Kosh.</Link><div><p>A living money model for India.</p><p>Educational guidance. Not investment advice.</p></div><Link href="/login">Get started <MoveUpRight size={17} /></Link></footer>
  </div>;
}
