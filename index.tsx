import { useState } from 'react';
const tones = ['Cinematic','Bold','Energetic','Friendly','Elegant','Professional'] as const;
const formats = ['Reel (9:16)','Story (9:16)','Square (1:1)','Wide (16:9)'] as const;
export default function Home(){
  const [desc,setDesc]=useState(''); const [tone,setTone]=useState<(typeof tones)[number]>('Cinematic');
  const [format,setFormat]=useState<(typeof formats)[number]>('Reel (9:16)');
  const [loading,setLoading]=useState(false); const [resultUrl,setResultUrl]=useState<string|null>(null); const [error,setError]=useState<string|null>(null);
  async function handleGenerate(){ setLoading(true); setError(null); setResultUrl(null);
    try{ const res=await fetch('/api/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:desc,tone,format})});
      if(!res.ok) throw new Error(await res.text()); const data=await res.json(); setResultUrl(data.previewUrl||null);
    }catch(e:any){ setError(e?.message||'Something went wrong'); } finally{ setLoading(false); } }
  return (<main style={styles.page}><div style={styles.card}>
    <div style={styles.title}>Hi, I’m <span style={{color:'#7aa2ff'}}>Orion</span> — Your Social Media Manager Assistant.</div>
    <div style={styles.sub}>Tell me what you’re posting today and I’ll mock up your ad (simulated).</div>
    <label style={styles.label}>Post description</label>
    <textarea style={styles.textarea} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="e.g., 15s ad for a coffee shop launch, upbeat and friendly."/>
    <div style={styles.row}><div style={styles.col}><label style={styles.label}>Tone</label>
      <select style={styles.select} value={tone} onChange={e=>setTone(e.target.value as any)}>{tones.map(t=>(<option key={t} value={t}>{t}</option>))}</select>
    </div><div style={styles.col}><label style={styles.label}>Format</label>
      <select style={styles.select} value={format} onChange={e=>setFormat(e.target.value as any)}>{formats.map(f=>(<option key={f} value={f}>{f}</option>))}</select>
    </div></div>
    <button onClick={handleGenerate} style={styles.button} disabled={loading||!desc.trim()}>{loading?'Generating…':'Generate (Simulated)'}</button>
    {error && <div style={styles.error}>⚠️ {error}</div>}
    {resultUrl && <div style={styles.resultBox}><div style={styles.resultTitle}>Mock Result</div><div style={styles.resultHint}>This is a simulated link to a rendered asset.</div><a href={resultUrl} style={styles.link} target="_blank" rel="noreferrer">{resultUrl}</a></div>}
  </div><footer style={styles.footer}>© Orion Studio — MVP (sim mode)</footer></main>);}
const styles:Record<string,React.CSSProperties>={page:{minHeight:'100svh',background:'radial-gradient(60% 60% at 50% 20%, #0b1220 0%, #05080f 60%, #04060b 100%)',color:'#e8eefc',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px',boxSizing:'border-box'},card:{width:'100%',maxWidth:880,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:24,boxShadow:'0 10px 60px rgba(0,0,0,0.35)',backdropFilter:'blur(8px)'},title:{fontSize:24,fontWeight:700,marginBottom:8},sub:{opacity:.8,marginBottom:20},label:{fontSize:13,opacity:.8,margin:'10px 0 6px',display:'block'},textarea:{width:'100%',minHeight:110,borderRadius:12,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(0,0,0,0.25)',color:'#e8eefc',padding:12,outline:'none'},row:{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'},col:{flex:1,minWidth:220},select:{width:'100%',height:40,borderRadius:10,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(0,0,0,0.25)',color:'#e8eefc',padding:'0 10px',outline:'none',appearance:'none'},button:{width:'100%',height:46,marginTop:16,borderRadius:12,border:'1px solid rgba(122,162,255,0.35)',background:'linear-gradient(180deg, #87a6ff 0%, #6d8cff 100%)',color:'#071020',fontWeight:700,cursor:'pointer'},error:{marginTop:14,padding:'10px 12px',border:'1px solid rgba(255, 120, 120, 0.4)',background:'rgba(120, 0, 0, 0.25)',borderRadius:10,color:'#ffbaba',fontSize:14},resultBox:{marginTop:16,padding:14,borderRadius:12,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.03)'},resultTitle:{fontWeight:700,marginBottom:6},resultHint:{opacity:.8,fontSize:13,marginBottom:8},link:{color:'#7aa2ff',textDecoration:'underline'},footer:{position:'fixed',bottom:10,opacity:.6,fontSize:12}};
