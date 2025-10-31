// ===== frontend/src/App.jsx =====
// Single clean page: Question + Memories + Voice prototype (mic + send). Uses Netlify /api proxy.

import React, { useEffect, useMemo, useState } from "react";

export default function App(){
  const [question,setQuestion]=useState("Using the clinic docs, what should a new patient bring?");
  const [memories,setMemories]=useState([]); const [newMemoryText,setNewMemoryText]=useState("");
  const [loading,setLoading]=useState(false); const [memError,setMemError]=useState("");

  // memory helpers
  async function listMemories(){ setMemError(""); try{ const r=await fetch("/api/memory"); if(!r.ok) throw new Error(`list failed: ${r.status}`); const {items}=await r.json(); setMemories(Array.isArray(items)?items:[]);}catch(e){ setMemories([]); setMemError(e.message||String(e)); } }
  async function addMemory(text){ const v=(text??newMemoryText).trim(); if(!v) return; setLoading(true); setMemError(""); try{ const r=await fetch("/api/memory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:v})}); if(!r.ok) throw new Error(`add failed: ${r.status}`); setNewMemoryText(""); await listMemories(); }catch(e){ setMemError(e.message||String(e)); }finally{ setLoading(false);} }
  async function clearMemory(){ setLoading(true); setMemError(""); try{ const r=await fetch("/api/memory",{method:"DELETE"}); if(!r.ok) throw new Error(`clear failed: ${r.status}`); await listMemories(); }catch(e){ setMemError(e.message||String(e)); }finally{ setLoading(false);} }
  useEffect(()=>{ listMemories(); },[]);
  const memCount=useMemo(()=>memories.length,[memories]);

  // mic (simple inline)
  const [micStatus,setMicStatus]=useState("");
  async function startMic(){ try{ const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR){ setMicStatus("not supported"); return;} const rec=new SR(); rec.lang="en-US"; rec.interimResults=false; rec.onresult=(ev)=>{ const txt=ev.results?.[0]?.[0]?.transcript||""; setQuestion(q=> txt || q); setMicStatus("ok"); }; rec.onerror=(ev)=> setMicStatus(ev?.error||"mic error"); rec.onend=()=>{ if(micStatus==="listening…") setMicStatus("no-speech"); }; setMicStatus("listening…"); rec.start(); }catch(e){ setMicStatus(e?.message||"mic error"); } }

  // prototype send -> /api/respond
  const [protoText,setProtoText]=useState(""); const [protoReply,setProtoReply]=useState(""); const [protoError,setProtoError]=useState("");
  async function sendToPrototype(){ setProtoError(""); setProtoReply(""); try{ const r=await fetch("/api/respond",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ text: protoText || question })}); if(!r.ok) throw new Error(`respond failed: ${r.status}`); const data=await r.json(); setProtoReply(data.reply||data.text||JSON.stringify(data)); }catch(e){ setProtoError(e.message||String(e)); } }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-4xl font-extrabold mb-6">GarvanGPT — Clinic Docs</h1>

      {/* Question */}
      <section className="mb-8">
        <label className="block font-semibold mb-2">Question</label>
        <textarea className="w-full h-40 rounded border p-3" value={question} onChange={e=>setQuestion(e.target.value)} />
        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <button className="px-4 py-2 rounded bg-black text-white" onClick={()=>alert("Hook to rich Q&A later")}>Ask</button>
          <button className="px-4 py-2 rounded border" onClick={()=>setQuestion("")}>Clear</button>
          <button className="px-4 py-2 rounded border" onClick={startMic}>🎤 Start mic</button>
          <span className="text-sm text-gray-500">Tip: Cmd/Ctrl + Enter</span>
        </div>
        {micStatus && <div className="mt-2 text-xs text-gray-600">Mic: {micStatus}</div>}
      </section>

      {/* Memories */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Memories <span className="text-gray-500">({memCount})</span></h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border" onClick={listMemories} disabled={loading}>Refresh</button>
            <button className="px-3 py-1 rounded border" onClick={clearMemory} disabled={loading||memCount===0}>Clear All</button>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <input className="flex-1 rounded border p-2" placeholder="Add a memory…" value={newMemoryText} onChange={e=>setNewMemoryText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') addMemory(newMemoryText); }} />
          <button className="px-4 py-2 rounded bg-black text-white" onClick={()=>addMemory(newMemoryText)} disabled={loading}>Add</button>
        </div>
        {memError && <div className="mb-3 text-red-600">Error: {memError}</div>}
        <ul className="space-y-2">
          {memories.map(m=> (
            <li key={m.id} className="p-3 rounded border">
              <div className="text-xs text-gray-500 mb-1">{m.createdAt||''}</div>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </li>
          ))}
          {memories.length===0 && <li className="text-gray-500">No memories yet.</li>}
        </ul>
      </section>

      {/* Prototype box */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-2">Talk to the prototype</h2>
        <textarea className="w-full h-28 rounded border p-3" value={protoText} onChange={e=>setProtoText(e.target.value)} placeholder="say or type something to send…" />
        <div className="mt-3 flex gap-3">
          <button className="px-4 py-2 rounded bg-black text-white" onClick={sendToPrototype}>Send to prototype</button>
        </div>
        <div className="mt-4">
          <div className="font-semibold mb-1">Prototype reply</div>
          {protoError ? <div className="text-red-600">Error: {protoError}</div> : <div className="whitespace-pre-wrap">{protoReply || '—'}</div>}
        </div>
      </section>

      <footer className="text-xs text-gray-400 pb-10">UI uses Netlify → Render via <code>/api/*</code></footer>
    </div>
  );
}