import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app=express();
const PORT=3000;
const JWT_SECRET=process.env.JWT_SECRET||"week3-call-analytics-secret-key";
const DATA_URL="https://69b30b45e224ec066bdb55a0.mockapi.io/api/v1/cdr";

app.use(cors({origin:true,credentials:true}));
app.use(express.json({limit:"100kb"}));

const users=[
  {id:1,username:"admin",role:"Admin",passwordHash:bcrypt.hashSync("Admin123!",10)},
  {id:2,username:"analyst",role:"Analyst",passwordHash:bcrypt.hashSync("Analyst123!",10)}
];
let records=[];

const error=(res,status,message,details=null)=>res.status(status).json({error:{status,message,details}});

async function loadData(){
  const response=await fetch(DATA_URL);
  if(!response.ok) throw new Error("Unable to load CDR data");
  records=await response.json();
}
function signToken(user){return jwt.sign({id:user.id,username:user.username,role:user.role},JWT_SECRET,{expiresIn:"2h"});}
function auth(req,res,next){
  const token=req.cookies?.token||req.headers.authorization?.replace(/^Bearer\s+/,"");
  if(!token) return error(res,401,"Authentication required");
  try{req.user=jwt.verify(token,JWT_SECRET);next();}catch{return error(res,401,"Invalid or expired token");}
}
function roles(...allowed){return (req,res,next)=>allowed.includes(req.user.role)?next():error(res,403,"Insufficient permissions");}
app.use((req,res,next)=>{const raw=req.headers.cookie||"";const m=raw.match(/(?:^|;)\s*token=([^;]+)/);req.cookies={token:m?decodeURIComponent(m[1]):null};next();});

app.get("/api/health",(req,res)=>res.json({status:"ok",service:"call-analytics-week3"}));

app.post("/api/auth/login",async(req,res)=>{
  const username=String(req.body?.username||"").trim();
  const password=String(req.body?.password||"");
  if(!username||!password)return error(res,400,"Username and password are required");
  const user=users.find(u=>u.username.toLowerCase()===username.toLowerCase());
  if(!user||!(await bcrypt.compare(password,user.passwordHash)))return error(res,401,"Invalid credentials");
  res.cookie?.("token",signToken(user),{httpOnly:true,sameSite:"lax",maxAge:7200000});
  res.json({user:{username:user.username,role:user.role}});
});

app.post("/api/auth/signup",async(req,res)=>{
  const username=String(req.body?.username||"").trim();
  const password=String(req.body?.password||"");
  if(username.length<3||password.length<8)return error(res,400,"Username must be 3+ characters and password 8+ characters");
  if(users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return error(res,409,"Username already exists");
  const user={id:Date.now(),username,role:"Analyst",passwordHash:await bcrypt.hash(password,10)};
  users.push(user);
  res.status(201).json({message:"Analyst account created"});
});

app.post("/api/auth/logout",(req,res)=>{res.setHeader("Set-Cookie","token=; HttpOnly; Max-Age=0; SameSite=Lax; Path=/");res.json({message:"Logged out"});});
app.get("/api/auth/me",auth,(req,res)=>res.json({user:{username:req.user.username,role:req.user.role}}));

function filtered(req){
  const city=String(req.query.city||"").trim().toLowerCase();
  const caller=String(req.query.caller||"").trim().toLowerCase();
  const receiver=String(req.query.receiver||"").trim().toLowerCase();
  const from=req.query.from?new Date(String(req.query.from)):null;
  const to=req.query.to?new Date(String(req.query.to)):null;
  return records.filter(r=>{
    const date=new Date(r.callStartTime);
    return (!city||String(r.city||"").toLowerCase().includes(city))
      &&(!caller||String(r.callerNumber||"").toLowerCase().includes(caller))
      &&(!receiver||String(r.receiverNumber||"").toLowerCase().includes(receiver))
      &&(!from||date>=from)&&(!to||date<=to);
  });
}
app.get("/api/analytics",auth,roles("Admin","Analyst"),(req,res)=>{
  const data=filtered(req);
  const totalDuration=data.reduce((s,r)=>s+Number(r.callDuration)||0,0);
  const incoming=data.filter(r=>r.callDirection===true||String(r.callDirection).toLowerCase()==="incoming").length;
  const outgoing=data.length-incoming;
  const callers={}; data.forEach(r=>{const k=r.callerNumber||r.callerName||"Unknown";callers[k]=(callers[k]||0)+1;});
  const topCallers=Object.entries(callers).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([caller,count])=>({caller,count}));
  const cities={};data.forEach(r=>{const k=r.city||"Unknown";cities[k]=(cities[k]||0)+1;});
  res.json({totalCalls:data.length,totalDuration,incoming,outgoing,topCallers,cities});
});
app.get("/api/cdr",auth,roles("Admin"),(req,res)=>{
  const page=Math.max(1,parseInt(req.query.page)||1);
  const limit=Math.min(100,Math.max(1,parseInt(req.query.limit)||20));
  const data=filtered(req);
  const start=(page-1)*limit;
  res.json({data:data.slice(start,start+limit),pagination:{page,limit,total:data.length,totalPages:Math.ceil(data.length/limit)}});
});
app.get("/api/admin/users",auth,roles("Admin"),(req,res)=>res.json({users:users.map(({id,username,role})=>({id,username,role}))}));

app.use((req,res)=>error(res,404,"Endpoint not found"));
app.use((err,req,res,next)=>{console.error(err);error(res,500,"Internal server error");});

loadData().then(()=>app.listen(PORT,()=>console.log("Backend running on http://localhost:"+PORT))).catch(err=>{console.error(err);process.exit(1)});