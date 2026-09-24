import { bcrypt, cdrData, filtered, json, currentUser, requireRole, readBody, makeToken, makeCookie, users } from "./_lib.js";

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("route") || url.pathname.replace(/^\\/api\\/?/, "");
    const method = req.method.toUpperCase();

    if (method === "GET" && path === "health") {
      return json(200,{status:"ok",records:cdrData.length,source:"assignment PDF dataset"});
    }

    if (method === "POST" && path === "auth/login") {
      const {username="",password=""}=await readBody(req);
      const user=users.find(u=>u.username.toLowerCase()===String(username).trim().toLowerCase());
      if(!user || !(await bcrypt.compare(String(password),user.passwordHash))) {
        return json(401,{error:{status:401,message:"Invalid credentials"}});
      }
      return json(200,{user:{username:user.username,role:user.role}},{ "Set-Cookie":makeCookie(makeToken(user)) });
    }

    if (method === "POST" && path === "auth/signup") {
      const {username="",password=""}=await readBody(req);
      const name=String(username).trim();
      if(name.length<3 || String(password).length<8) {
        return json(400,{error:{status:400,message:"Username must be 3+ characters and password 8+ characters"}});
      }
      if(users.some(u=>u.username.toLowerCase()===name.toLowerCase())) {
        return json(409,{error:{status:409,message:"Username already exists"}});
      }
      users.push({id:Date.now(),username:name,role:"Analyst",passwordHash:await bcrypt.hash(String(password),10)});
      return json(201,{message:"Analyst account created"});
    }

    if (method === "POST" && path === "auth/logout") {
      return json(200,{message:"Logged out"},{ "Set-Cookie":makeCookie("",0) });
    }

    if (method === "GET" && path === "auth/me") {
      const user=currentUser(req);
      if(!user) return json(401,{error:{status:401,message:"Authentication required"}});
      return json(200,{user:{username:user.username,role:user.role}});
    }

    if (method === "GET" && path === "analytics") {
      const access=requireRole(req,["Admin","Analyst"]);
      if(access.response) return access.response;
      const data=filtered(req);
      const incoming=data.filter(r=>r.callDirection===true).length;
      const callers={},cities={};
      data.forEach(r=>{
        const caller=r.callerNumber||r.callerName||"Unknown";
        callers[caller]=(callers[caller]||0)+1;
        const city=r.city||"Unknown";
        cities[city]=(cities[city]||0)+1;
      });
      return json(200,{
        totalCalls:data.length,
        totalDuration:data.reduce((s,r)=>s+Number(r.callDuration||0),0),
        incoming,
        outgoing:data.length-incoming,
        topCallers:Object.entries(callers).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([caller,count])=>({caller,count})),
        cities
      });
    }

    if (method === "GET" && path === "cdr") {
      const access=requireRole(req,["Admin"]);
      if(access.response) return access.response;
      const q=url.searchParams;
      const page=Math.max(1,Number(q.get("page")||1));
      const limit=Math.min(100,Math.max(1,Number(q.get("limit")||15)));
      const data=filtered(req);
      const start=(page-1)*limit;
      return json(200,{
        data:data.slice(start,start+limit),
        pagination:{page,limit,total:data.length,totalPages:Math.max(1,Math.ceil(data.length/limit))}
      });
    }

    return json(404,{error:{status:404,message:"Endpoint not found"}});
  } catch(error) {
    console.error(error);
    return json(500,{error:{status:500,message:"Internal server error"}});
  }
}
