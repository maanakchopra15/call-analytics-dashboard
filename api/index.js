import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const DATA_URL="https://69b30b45e224ec066bdb55a0.mockapi.io/api/v1/cdr";
const SECRET=process.env.JWT_SECRET||"week3-call-analytics-demo-secret";
const users=globalThis.__cdrUsers||(globalThis.__cdrUsers=[
{id:1,username:"admin",role:"Admin",passwordHash:bcrypt.hashSync("Admin123!",10)},
{id:2,username:"analyst",role:"Analyst",passwordHash:bcrypt.hashSync("Analyst123!",10)}
]);
function send(res,status,data){res.status(status).json(data)}
function token(user){return jwt.sign({id:user.id,username:user.username,role:user.role},SECRET,{expiresIn:"2h"})}
function cookie(v,maxAge=7200){return `token=${encodeURIComponent(v)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`}
function getToken(req){const h=req.headers.authorization;if(h?.startsWith("Bearer "))return h.slice(7);const c=req.headers.cookie||"";const m=c.match(/(?:^|;)\s*token=([^;]+)/);return m?decodeURIComponent(m[1]):null}
function auth(req,res){try{const t=getToken(req);if(!t){send(res,401,{error:{status:401,message:"Authentication required"}});return null}return jwt.verify(t,SECRET)}catch{send(res,401,{error:{status:401,message:"Invalid or expired token"}});return null}}
function role(req,res,allowed){const u=auth(req,res);if(!u)return null;if(!allowed.includes(u.role)){send(res,403,{error:{status:403,message:"Insufficient permissions"}});return null}return u}
async function data(req){const r=await fetch(DATA_URL);if(!r.ok)throw new Error("Unable to load CDR data");let d=await r.json();const q=new URL(req.url,"https://example.com").searchParams;const city=(q.get("city")||"").toLowerCase(),caller=(q.get("caller")||"").toLowerCase(),receiver=(q.get("receiver")||"").toLowerCase();return d.filter(x=>(!city||String(x.city||"").toLowerCase().includes(city))&&(!caller||String(x.callerNumber||"").toLowerCase().includes(caller))&&(!receiver||String(x.receiverNumber||"").toLowerCase().includes(receiver)))}
export default async function handler(req,res){
try{
const path=new URL(req.url,"https://example.com").pathname.replace(/^\/api\/?/,"");
if(req.method==="GET"&&path==="health")return send(res,200,{status:"ok"});
if(req.method==="POST"&&path==="auth/login"){const {username="",password=""}=req.body||{};const u=users.find(x=>x.username.toLowerCase()===String(username).trim().toLowerCase());if(!u||!(await bcrypt.compare(String(password),u.passwordHash)))return send(res,401,{error:{status:401,message:"Invalid credentials"}});res.setHeader("Set-Cookie",cookie(token(u)));return send(res,200,{user:{username:u.username,role:u.role}})}
if(req.method==="POST"&&path==="auth/signup"){const {username="",password=""}=req.body||{};if(String(username).trim().length<3||String(password).length<8)return send(res,400,{error:{status:400,message:"Username must be 3+ characters and password 8+ characters"}});if(users.some(x=>x.username.toLowerCase()===String(username).trim().toLowerCase()))return send(res,409,{error:{status:409,message:"Username already exists"}});users.push({id:Date.now(),username:String(username).trim(),role:"Analyst",passwordHash:await bcrypt.hash(String(password),10)});return send(res,201,{message:"Analyst account created"})}
if(req.method==="POST"&&path==="auth/logout"){res.setHeader("Set-Cookie",cookie("",0));return send(res,200,{message:"Logged out"})}
if(req.method==="GET"&&path==="auth/me"){const u=auth(req,res);if(!u)return;return send(res,200,{user:{username:u.username,role:u.role}})}
if(req.method==="GET"&&path==="analytics"){if(!role(req,res,["Admin","Analyst"]))return;const d=await data(req);const incoming=d.filter(x=>x.callDirection===true).length;const callers={};const cities={};d.forEach(x=>{const c=x.callerNumber||x.callerName||"Unknown";callers[c]=(callers[c]||0)+1;const city=x.city||"Unknown";cities[city]=(cities[city]||0)+1});return send(res,200,{totalCalls:d.length,totalDuration:d.reduce((s,x)=>s+Number(x.callDuration||0),0),incoming,outgoing:d.length-incoming,topCallers:Object.entries(callers).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([caller,count])=>({caller,count})),cities})}
if(req.method==="GET"&&path==="cdr"){if(!role(req,res,["Admin"]))return;const q=new URL(req.url,"https://example.com").searchParams;const page=Math.max(1,Number(q.get("page")||1)),limit=Math.min(100,Math.max(1,Number(q.get("limit")||15)));const d=await data(req);const start=(page-1)*limit;return send(res,200,{data:d.slice(start,start+limit),pagination:{page,limit,total:d.length,totalPages:Math.max(1,Math.ceil(d.length/limit))}})}
return send(res,404,{error:{status:404,message:"Endpoint not found"}});
}catch(e){console.error(e);return send(res,500,{error:{status:500,message:"Internal server error"}})}
}