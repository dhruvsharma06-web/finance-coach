import {z} from "zod";
import {handle,ok,fail} from "@/lib/api";
import {assistantReply} from "@/lib/assistant";
const schema=z.object({messages:z.array(z.object({role:z.enum(["user","assistant"]),content:z.string().trim().min(1).max(4000)})).min(1).max(40),page:z.string().max(200)});
export const maxDuration=60;
export const POST=handle(async(req:Request)=>{
 const body=schema.safeParse(await req.json().catch(()=>null));
 if(!body.success||body.data.messages.at(-1)?.role!=="user")return fail("Send messages ending with a user question and the current page.");
 return ok(await assistantReply(body.data.messages,body.data.page));
});

