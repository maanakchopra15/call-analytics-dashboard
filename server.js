import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "node:path";
import {fileURLToPath} from "node:url";

import part1 from "./data/cdr-part-01.json" with {type:"json"};
import part2 from "./data/cdr-part-02.json" with {type:"json"};
import part3 from "./data/cdr-part-03.json" with {type:"json"};
import part4 from "./data/cdr-part-04.json" with {type:"json"};
import part5 from "./data/cdr-part-05.json" with {type:"json"};
import part6 from "./data/cdr-part-06.json" with {type:"json"};
import part7 from "./data/cdr-part-07.json" with {type:"json"};
import part8 from "./data/cdr-part-08.json" with {type:"json"};
import part9 from "./data/cdr-part-09.json" with {type:"json"};
import part10 from "./data/cdr-part-10.json" with {type:"json"};
import part11 from "./data/cdr-part-11.json" with {type:"json"};
import part12 from "./data/cdr-part-12.json" with {type:"json"};
import part13 from "./data/cdr-part-13.json" with {type:"json"};
import part14 from "./data/cdr-part-14.json" with {type:"json"};
import part15 from "./data/cdr-part-15.json" with {type:"json"};
import part16 from "./data/cdr-part-16.json" with {type:"json"};
import part17 from "./data/cdr-part-17.json" with {type:"json"};
import part18 from "./data/cdr-part-18.json" with {type:"json"};
import part19 from "./data/cdr-part-19.json" with {type:"json"};
import part20 from "./data/cdr-part-20.json" with {type:"json"};

const app=express();
const PORT=process.env.PORT||10000;
const SECRET=process.env.JWT_SECRET||"week3-call-analytics-demo-secret";
const cdrData=[part1,part2,part3,part4,part5,part6,part7,part8,part9,part10,part11,part12,part13,part14,part15,part16,part17,part18,part19,part20].flat();

const users=globalThis.__cdrUsers||(globalThis.__cdrUsers=[
 {id:1,username:"admin",role:"Admin",passwordHash:bcrypt.hashSync("Admin123!",10)},
 {id:2,username:"analyst",role:"Analyst",passwordHash:bcrypt.hashSync("Analyst123!",10)}
]);

app.use(express.json({limit:"100kb"}));
app.set("trust proxy",1);

function error(res,status,message){return res.status(status).json({error:{status,message}})}
function tokenFor(user){return jwt.sign({id:user.id,username:user.username,role:user.role},SECRET,{expiresIn:"2h"})}
function setToken(res,token){res.cookie("token",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:7200000})}
function userFrom(req){
 try{
  const raw=req.cookies?.token||req.headers.authorization?.replace(/^Bearer\s+/,"");
  return raw?jwt.verify(raw,SECRET):null;
 }catch{return null}
}
function auth(req,res,next){
 const user=userFrom(req);
 if(!user)return error(res,401,"Authentication required");
 req.user=user; next();
}
function role(...roles){return (req,res,next)=>roles.includes(req.user.role)?next():error(res,403,"Insufficient permissions")}
function filtered(req){
 const {city="",caller="",receiver="",from="",to=""}=req.query;
 return cdrData.filter(r=>{
  const d=String(r.callStartTime||"").slice(0,10);
  return (!city||String(r.city||"").toLowerCase().includes(String(city).trim().toLowerCase()))
   &&(!caller||String(r.callerNumber||"").includes(String(caller).trim()))
   &&(!receiver||String(r.receiverNumber||"").includes(String(receiver).trim()))
   &&(!from||d>=from)&&(!to||d<=to);
 });
}

app.get("/api/health",(req,res)=>res.json({status:"ok",records:cdrData.length}));
app.post("/api/auth/login",async(req,res)=>{
 const {username,password}=req.body||{};
 if(!username||!password)return error(res,400,"Username and password are required");
 const u=users.find(x=>x.username===String(username).trim());
 if(!u||!(await bcrypt.compare(password,u.passwordHash)))return error(res,401,"Invalid username or password");
 setToken(res,tokenFor(u)); res.json({user:{username:u.username,role:u.role}});
});
app.post("/api/auth/signup",async(req,res)=>{
 const username=String(req.body?.username||"").trim();
 const password=String(req.body?.password||"");
 if(!/^[A-Za-z0-9_.-]{3,30}$/.test(username))return error(res,400,"Username must be 3-30 characters");
 if(password.length<8)return error(res,400,"Password must be at least 8 characters");
 if(users.some(x=>x.username.toLowerCase()===username.toLowerCase()))return error(res,409,"Username already exists");
 const u={id:users.length+1,username,role:"Analyst",passwordHash:await bcrypt.hash(password,10)};
 users.push(u); res.status(201).json({user:{username:u.username,role:u.role}});
});
app.post("/api/auth/logout",(req,res)=>{res.clearCookie("token",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"});res.json({ok:true})});
app.get("/api/auth/me",auth,(req,res)=>res.json({user:{username:req.user.username,role:req.user.role}}));

app.get("/api/analytics",auth,(req,res)=>{
 const rows=filtered(req);
 const callers={}; const cities={};
 let totalDuration=0,incoming=0,outgoing=0;
 for(const r of rows){
  totalDuration+=Number(r.callDuration)||0;
  r.callDirection===true?incoming++:outgoing++;
  const c=String(r.callerName||r.callerNumber||"Unknown"); callers[c]=(callers[c]||0)+1;
  const city=String(r.city||"Unknown"); cities[city]=(cities[city]||0)+1;
 }
 const topCallers=Object.entries(callers).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([caller,count])=>({caller,count}));
 res.json({totalCalls:rows.length,totalDuration,incoming,outgoing,topCallers,cities});
});

app.get("/api/cdr",auth,role("Admin"),(req,res)=>{
 const rows=filtered(req);
 const page=Math.max(1,Number(req.query.page)||1);
 const limit=Math.min(100,Math.max(1,Number(req.query.limit)||15));
 const total=rows.length; const totalPages=Math.max(1,Math.ceil(total/limit));
 const safePage=Math.min(page,totalPages);
 const start=(safePage-1)*limit;
 res.json({data:rows.slice(start,start+limit),pagination:{page:safePage,limit,total,totalPages}});
});

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(__dirname,"dist");
app.use(express.static(dist));
app.get("/{*splat}",(req,res)=>{
 if(req.path.startsWith("/api/"))return error(res,404,"Endpoint not found");
 res.sendFile(path.join(dist,"index.html"));
});

app.listen(PORT,"0.0.0.0",()=>console.log(`Call Analytics Platform running on port ${PORT}`));
