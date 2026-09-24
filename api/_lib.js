import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import part1 from "../data/cdr-part-01.json" with { type: "json" };
import part2 from "../data/cdr-part-02.json" with { type: "json" };
import part3 from "../data/cdr-part-03.json" with { type: "json" };
import part4 from "../data/cdr-part-04.json" with { type: "json" };
import part5 from "../data/cdr-part-05.json" with { type: "json" };
import part6 from "../data/cdr-part-06.json" with { type: "json" };
import part7 from "../data/cdr-part-07.json" with { type: "json" };
import part8 from "../data/cdr-part-08.json" with { type: "json" };
import part9 from "../data/cdr-part-09.json" with { type: "json" };
import part10 from "../data/cdr-part-10.json" with { type: "json" };
import part11 from "../data/cdr-part-11.json" with { type: "json" };
import part12 from "../data/cdr-part-12.json" with { type: "json" };
import part13 from "../data/cdr-part-13.json" with { type: "json" };
import part14 from "../data/cdr-part-14.json" with { type: "json" };
import part15 from "../data/cdr-part-15.json" with { type: "json" };
import part16 from "../data/cdr-part-16.json" with { type: "json" };
import part17 from "../data/cdr-part-17.json" with { type: "json" };
import part18 from "../data/cdr-part-18.json" with { type: "json" };
import part19 from "../data/cdr-part-19.json" with { type: "json" };
import part20 from "../data/cdr-part-20.json" with { type: "json" };

const SECRET = process.env.JWT_SECRET || "week3-call-analytics-demo-secret";
export const cdrData = [
  part1,part2,part3,part4,part5,part6,part7,part8,part9,part10,
  part11,part12,part13,part14,part15,part16,part17,part18,part19,part20
].flat();

export const users = globalThis.__cdrUsers || (globalThis.__cdrUsers = [
  {id:1,username:"admin",role:"Admin",passwordHash:bcrypt.hashSync("Admin123!",10)},
  {id:2,username:"analyst",role:"Analyst",passwordHash:bcrypt.hashSync("Analyst123!",10)}
]);

export function json(status,data,headers={}) {
  return new Response(JSON.stringify(data),{
    status,
    headers:{"Content-Type":"application/json",...headers}
  });
}

export function makeToken(user) {
  return jwt.sign({id:user.id,username:user.username,role:user.role},SECRET,{expiresIn:"2h"});
}

export function makeCookie(value,maxAge=7200) {
  return `token=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function tokenFrom(req) {
  const auth=req.headers.get("authorization");
  if(auth?.startsWith("Bearer ")) return auth.slice(7);
  const raw=req.headers.get("cookie")||"";
  const match=raw.match(/(?:^|;)\\s*token=([^;]+)/);
  return match?decodeURIComponent(match[1]):null;
}

export function currentUser(req) {
  try {
    const value=tokenFrom(req);
    if(!value) return null;
    return jwt.verify(value,SECRET);
  } catch {
    return null;
  }
}

export function requireRole(req,allowed) {
  const user=currentUser(req);
  if(!user) return {response:json(401,{error:{status:401,message:"Authentication required"}})};
  if(!allowed.includes(user.role)) return {response:json(403,{error:{status:403,message:"Insufficient permissions"}})};
  return {user};
}

export async function readBody(req) {
  try{return await req.json()}catch{return {}}
}

export function filtered(req) {
  const q=new URL(req.url).searchParams;
  const city=(q.get("city")||"").trim().toLowerCase();
  const caller=(q.get("caller")||"").trim().toLowerCase();
  const receiver=(q.get("receiver")||"").trim().toLowerCase();
  const from=q.get("from")||"";
  const to=q.get("to")||"";
  return cdrData.filter(r=>{
    const recordDate=String(r.callStartTime||"").slice(0,10);
    return (!city||String(r.city||"").toLowerCase().includes(city))
      &&(!caller||String(r.callerNumber||"").toLowerCase().includes(caller))
      &&(!receiver||String(r.receiverNumber||"").toLowerCase().includes(receiver))
      &&(!from||recordDate>=from)
      &&(!to||recordDate<=to);
  });
}

export { bcrypt };
