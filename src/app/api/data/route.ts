import {handle,ok} from "@/lib/api";
import {updateDb,nowIso} from "@/lib/db";
export const DELETE=handle(async()=>{
 await updateDb(db=>{
 db.transactions=[];db.rules=[];db.recurring=[];db.nudges=[];db.reports=[];
 db.profile={name:"",currency:"INR",monthlyIncome:0,fixedCosts:[],emergencyFund:{current:0,targetMonths:6},categoryBudgets:{},goals:[],lifeEvents:[],updatedAt:nowIso()};
 });
 return ok({ok:true});
});

