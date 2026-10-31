import type {CoachMessage} from "../types";
export type AssistantAction=
|{type:"navigate";href:string;label:string}
|{type:"simulate";prompt:string}
|{type:"fix_plan"}
|{type:"filter_transactions";category?:string;q?:string}
|{type:"import_sample";file:string}
|{type:"theme";value:"light"|"dark"}
|{type:"open_palette"};
export interface AssistantResponse{reply:CoachMessage;actions:AssistantAction[];mood:"happy"|"concerned"|"neutral";suggestions:string[];}
export type AssistantIntent={kind:"navigate"|"filter"|"simulate"|"fix"|"import"|"help"|"theme"|"privacy"|"palette"|"coach";actions:AssistantAction[];category?:string;q?:string;};

