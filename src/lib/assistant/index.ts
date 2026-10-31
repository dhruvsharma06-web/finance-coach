import type {CoachMessage} from "../types";
import type {AssistantResponse} from "./types";
import {routeIntent,pageSuggestions} from "./intents";
import {checkGuardrails,guardrailReply} from "../coach/guardrails";
import {coachReply} from "../coach";
import {readDb} from "../db";
import {formatINR,monthLabel} from "../format";
import {latestDataMonth} from "../simulate/baseline";
import {parseScenario} from "../simulate/parse";
import {simulateWithSummary} from "../simulate/summary";
import {fixPlan} from "../simulate/solve";
const HELP:Record<string,string>={"/":"Overview shows income, spending, recurring commitments and the alerts that need your attention. Ask where your money went, or let me find a plan that brings your goals back on track.","/transactions":"This is your ledger. Search or filter spending, review uncertain categories, and teach Kosh by correcting one transaction. You can apply the learned rule to similar payments and undo a correction.","/planner":"Model a change before you make it. Describe a spending cut, rent increase or purchase to compare savings and goal dates. Fix my plan proposes capped, realistic cuts without changing your profile.","/subscriptions":"Review recurring payments, price changes and subscriptions you may no longer use. Confirm usage or mark a cancellation; Kosh cannot cancel a bank payment for you.","/import":"Upload a bank CSV or PDF, paste bank SMS, or try the sample statement. Preview categories and duplicate counts before importing. OTPs and promotions are ignored.","/report":"Your monthly review groups spending, highlights merchants and recurring costs, and explains wins and watch-outs from recorded transactions.","/goals":"Your money model contains income, fixed costs, emergency savings and dated goals. Record a life event to update it. Your data controls let you export, delete or restore the demo."};
export async function assistantReply(messages:CoachMessage[],page:string):Promise<AssistantResponse>{
 const text=messages.at(-1)?.content??"",guard=checkGuardrails(text),suggestions=pageSuggestions(page);
 const result=(content:string,actions:AssistantResponse["actions"]=[],mood:AssistantResponse["mood"]="neutral",extra:Partial<CoachMessage>={}):AssistantResponse=>({reply:{role:"assistant",content,...extra},actions,mood,suggestions});
 if(guard.triggered)return result(guardrailReply(guard.reason??""),[],"concerned",{guardrail:guard});
 const intent=routeIntent(text);
 if(intent.kind==="help")return result(HELP[page.split(/[?#]/)[0]]??"I can explain your money model, find transactions, model a what-if, propose a plan, and take you to the right page.",intent.actions);
 if(intent.kind==="privacy")return result("Accounts and references are masked. When configured, Kosh encrypts its stored database and can protect access with a passcode. This public prototype uses shared, ephemeral serverless storage and per-instance limits; please use sample data rather than sensitive statements. Export and delete are available in Your data. I never delete data from chat.",intent.actions);
 if(intent.kind==="navigate")return result("Open "+(intent.actions[0].type==="navigate"?intent.actions[0].label:"that page")+".",intent.actions);
 if(intent.kind==="import")return result("Open Import to preview a statement or paste SMS before saving. The sample statement is ready to try.",intent.actions);
 if(intent.kind==="theme")return result("Use the "+(intent.actions[0].type==="theme"?intent.actions[0].value:"selected")+" theme.",intent.actions);
 if(intent.kind==="palette")return result("Open the command palette to jump to a page or ask a question.",intent.actions);
 const db=await readDb();
 if(intent.kind==="filter"){
 const month=latestDataMonth(db.transactions),rows=db.transactions.filter(t=>t.direction==="debit"&&t.date.startsWith(month)&&(!intent.category||t.category===intent.category)&&(!intent.q||(t.merchant+" "+t.description).toLowerCase().includes(intent.q)));
 const total=rows.reduce((n,t)=>n+t.amount,0),budget=intent.category?db.profile.categoryBudgets[intent.category as keyof typeof db.profile.categoryBudgets]:undefined;
 return result(rows.length+" payments, totaling "+formatINR(total)+", in "+monthLabel(month)+". Open the ledger to see the matching transactions.",intent.actions,budget&&total>budget?"concerned":"neutral");
 }
 if(intent.kind==="fix"){const plan=await fixPlan(db.profile,db.transactions,db.recurring);return result(plan.explanation,intent.actions,plan.feasible?"happy":"concerned",{simulation:plan.result});}
 if(intent.kind==="simulate"){
 const scenario=await parseScenario(text.replace(/^agar (main|mai)\s+/i,"what if I "));
 if(!scenario.changes.length)return result("I need a change and an amount. Try “what if I cut dining by 30%?”",[{type:"navigate",href:"/planner",label:"Open planner"}]);
 const simulation=await simulateWithSummary(db.profile,db.transactions,scenario);
 return result(simulation.summary,intent.actions,simulation.goals.every(g=>g.onTrackScenario)?"happy":"concerned",{simulation});
 }
 const reply=await coachReply(messages);
 return {reply,actions:[],mood:reply.guardrail?.triggered?"concerned":/on track|under control/i.test(reply.content)?"happy":"neutral",suggestions};
}

