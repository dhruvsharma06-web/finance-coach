import type {AssistantIntent,AssistantAction} from "./types";
import {matchCategory} from "../simulate/nl";
const nav=(href:string,label:string):AssistantIntent=>({kind:"navigate",actions:[{type:"navigate",href,label}]});
export function routeIntent(text:string):AssistantIntent{
 const s=text.toLowerCase().trim();
 if(/dark mode|light mode|dark theme|light theme/.test(s))return {kind:"theme",actions:[{type:"theme",value:/dark/.test(s)?"dark":"light"}]};
 if(/data.*(safe|privacy)|privacy|delete.*data|export.*data|data.*(delete|export)|mera data.*safe/.test(s))return {kind:"privacy",actions:[{type:"navigate",href:"/goals#your-data",label:"Your data"}]};
 if(/fix my plan|back on track|goals kaise|plan.*(?:theek|sahi)/.test(s))return {kind:"fix",actions:[{type:"fix_plan"}]};
 if(/^(?:what if|can i afford|could i afford|agar (?:main|mai)|what happens if)/.test(s))return {kind:"simulate",actions:[{type:"simulate",prompt:text}]};
 if(/sample|import|bank sms|statement upload|statement.*(?:add|lao)/.test(s)){
 const actions:AssistantAction[]=[{type:"navigate",href:"/import",label:"Import a statement"}];
 if(/sample|demo statement/.test(s))actions.push({type:"import_sample",file:"kosh-demo-statement.csv"});
 return {kind:"import",actions};
 }
 if(/^(?:help|what can you do|what is this page|explain this page|madad)\??$/.test(s))return {kind:"help",actions:[]};
 if(/palette|command menu|search menu|ctrl\s*k/.test(s))return {kind:"palette",actions:[{type:"open_palette"}]};
 if(/needs review|review wale/.test(s))return nav("/transactions?needsReview=true","Review categories");
 const cat=matchCategory(s);
 const merchant=s.match(/\b(swiggy|zomato|uber|ola|myntra|amazon|netflix)\b/)?.[1];
 if((/transactions?|dikhao|what did i spend|show (?:my )?(?:dining|shopping|groceries|transport)|show dining/.test(s))&&(cat||merchant)){
 return {kind:"filter",category:merchant?undefined:cat??undefined,q:merchant,actions:[{type:"filter_transactions",...(merchant?{q:merchant}:{category:cat??undefined})}]};
 }
 if(/settings|my data|your data/.test(s))return nav("/goals#your-data","Your data");
 if(/^(?:home|overview|ghar)\??$/.test(s)||/go (?:to )?home/.test(s))return nav("/dashboard","Overview");
 if(/how (?:does )?this work|how kosh works|kaise kaam/.test(s))return nav("/how-it-works","How Kosh works");
 if(/take me|open|show|go to|where are|dikhao|kholo|le chalo/.test(s)){
 if(/recurring|subscriptions?|autopay/.test(s))return nav("/subscriptions","Recurring payments");
 if(/monthly review|report|review/.test(s))return nav("/report","Monthly review");
 if(/what.?if|planner/.test(s))return nav("/planner","What-if planner");
 if(/goals?|money model/.test(s))return nav("/goals","Money model & goals");
 if(/transactions?|ledger/.test(s))return nav("/transactions","Transactions");
 if(/coach/.test(s))return nav("/coach","Coach");
 }
 return {kind:"coach",actions:[]};
}
export const SUGGESTIONS:Record<string,string[]>={"/dashboard":["Where did my money go?","Fix my plan","Am I on track?"],"/transactions":["Show dining","What needs review?","Where did my money go?"],"/planner":["What if rent goes up 3k?","Fix my plan","Can I afford a ₹50k phone?"],"/subscriptions":["What can I cancel?","Open my subscriptions","Fix my plan"],"/report":["Summarise my month","Fix my plan","Show dining"],"/import":["Try the sample statement","Add my bank SMS","How does this work?"],"/goals":["Fix my plan","Is my data safe?","Export my data"]};
export function pageSuggestions(page:string):string[]{return SUGGESTIONS[page.split(/[?#]/)[0]]??SUGGESTIONS["/dashboard"];}
export function actionHref(action:AssistantAction):string|null{
 switch(action.type){
 case "navigate":return action.href;
 case "simulate":return "/planner?q="+encodeURIComponent(action.prompt);
 case "fix_plan":return "/planner?fix=1";
 case "filter_transactions":{const p=new URLSearchParams();if(action.category)p.set("category",action.category);if(action.q)p.set("q",action.q);return "/transactions?"+p;}
 case "import_sample":return "/import?sample="+encodeURIComponent(action.file);
 default:return null;
 }
}

