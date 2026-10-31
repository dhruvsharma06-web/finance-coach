import assert from "node:assert/strict";
import {serverTest} from "../scripts/server-test";
serverTest("tests/assistant.test.ts",async()=>{
 const {routeIntent,actionHref}=await import("../src/lib/assistant/intents");
 const {assistantReply}=await import("../src/lib/assistant");
 const {checkGuardrails}=await import("../src/lib/coach/guardrails");
 const cases:[string,string,string?][]=[
 ["take me to recurring","navigate","/subscriptions"],["open my subscriptions","navigate","/subscriptions"],["show the monthly review","navigate","/report"],["go to what if","navigate","/planner"],["where are my goals","navigate","/goals"],["home","navigate","/dashboard"],["settings / my data","navigate","/goals#your-data"],["how does this work","navigate","/how-it-works"],
 ["show my dining transactions","filter"],["swiggy wale transactions dikhao","filter"],["what did I spend on uber","filter"],["Show dining","filter"],["show shopping transactions","filter"],["zomato transactions dikhao","filter"],
 ["what if I cut dining by 30%","simulate"],["can I afford a 50k phone","simulate"],["agar main khana bahar 30% kam karu","simulate"],
 ["fix my plan","fix"],["how do I get back on track","fix"],["goals kaise poore honge","fix"],["plan theek karo","fix"],
 ["import a statement","import"],["add my bank sms","import"],["try the sample","import"],["Try the sample statement","import"],
 ["what is this page","help"],["help","help"],["what can you do","help"],["dark mode","theme"],["light mode","theme"],["is my data safe","privacy"],["delete my data","privacy"],["export my data","privacy"],["open command menu","palette"],["subscriptions kholo","navigate","/subscriptions"],["report dikhao","navigate","/report"],
 ["explain diversification","coach"],["Where did my money go?","coach"],["Am I on track?","coach"],["What is an emergency fund?","coach"]
 ];
 const table:{utterance:string;status:string}[]=[];
 for(const [text,kind,href]of cases){const r=routeIntent(text);assert.equal(r.kind,kind,text);if(href)assert.equal(actionHref(r.actions[0]),href,text);table.push({utterance:text,status:"PASS"});}
 for(const text of ["which stock should I buy?","suggest a term plan","Should I invest in bitcoin?","guaranteed returns of 20%"]){
 assert(checkGuardrails(text).triggered,text);
 const response=await assistantReply([{role:"user",content:text}],"/");
 assert.equal(response.actions.length,0);assert.equal(response.mood,"concerned");assert(response.reply.guardrail?.triggered);table.push({utterance:text,status:"PASS"});
 }
 const filter=await assistantReply([{role:"user",content:"show my dining transactions"}],"/transactions");assert(filter.reply.content.includes("payments"));assert.equal(filter.actions[0].type,"filter_transactions");
 const privacy=await assistantReply([{role:"user",content:"delete my data"}],"/");assert(privacy.reply.content.includes("never delete"));assert.equal(actionHref(privacy.actions[0]),"/goals#your-data");
 const help=await assistantReply([{role:"user",content:"help"}],"/planner");assert.equal(help.suggestions.length,3);
 const unknown=await assistantReply([{role:"user",content:"What is diversification?"}],"/");assert.equal(unknown.reply.role,"assistant");assert(unknown.reply.content.length>30);
 console.table(table);console.log("Assistant tests passed: "+table.length+" utterances plus grounded answers/privacy/help.");
});

