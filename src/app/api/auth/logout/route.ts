import {NextResponse} from "next/server";
import {handle} from "@/lib/api";
import {SESSION_COOKIE,sessionCookieOptions} from "@/lib/auth";
export const POST=handle(async()=>{
 const response=NextResponse.json({authenticated:false},{headers:{"Cache-Control":"no-store"}});
 response.cookies.set(SESSION_COOKIE,"",{...sessionCookieOptions(),maxAge:0});
 return response;
});

