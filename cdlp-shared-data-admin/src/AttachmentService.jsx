import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const BUCKET='cdlp-attachments'
const MAX_BYTES=25*1024*1024

function safeSegment(v){return String(v||'').trim().replace(/[^A-Za-z0-9._@+=;:!()$&,-]+/g,'-').replace(/^-+|-+$/g,'')||'NA'}
function extOf(name){const m=String(name||'').toLowerCase().match(/\.([a-z0-9]{1,8})$/);return m?.[1]||'bin'}
function formatBytes(v){if(v==null)return'';if(v<1024)return `${v} B`;if(v<1024*1024)return `${(v/1024).toFixed(1)} KB`;return `${(v/1024/1024).toFixed(2)} MB`}
function mimeOf(file){if(file.type)return file.type;const e=extOf(file.name);return({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',pdf:'application/pdf',txt:'text/plain',csv:'text/csv',doc:'application/msword',xls:'application/vnd.ms-excel',ppt:'application/vnd.ms-powerpoint',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',zip:'application/zip'})[e]||'application/octet-stream'}

async function sha256(file){const buf=await file.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',buf);return[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function readExifOrientation(file){if(!/jpe?g/i.test(file.type||file.name))return null;try{const buf=await file.slice(0,256*1024).arrayBuffer(),v=new DataView(buf);if(v.getUint16(0,false)!==0xffd8)return null;let o=2;while(o+4<v.byteLength){const marker=v.getUint16(o,false);o+=2;if((marker&0xff00)!==0xff00)break;const len=v.getUint16(o,false);if(len<2||o+len>v.byteLength)break;if(marker===0xffe1&&len>=10){const exif=o+2;if(v.getUint32(exif,false)!==0x45786966)break;const tiff=exif+6,le=v.getUint16(tiff,false)===0x4949,ifd=tiff+v.getUint32(tiff+4,le),count=v.getUint16(ifd,le);for(let i=0;i<count;i++){const p=ifd+2+i*12;if(p+12>v.byteLength)break;if(v.getUint16(p,le)===0x0112)return v.getUint16(p+8,le)}break}o+=len}}catch{}return null}
async function makeThumbnail(file){const mime=mimeOf(file);if(!mime.startsWith('image/')||/heic|heif/i.test(mime))return null;try{let bitmap;try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'})}catch{bitmap=await createImageBitmap(file)}const max=480,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale)),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(bitmap,0,0,w,h);bitmap.close?.();const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('縮圖產生失敗')),'image/jpeg',0.82));return{blob,width:w,height:h,mime:'image/jpeg'}}catch{return null}}

export default function AttachmentService({mode,data,loadLive,setNotice}){
  const [projectId,setProjectId]=useState(''),[sourceApp,setSourceApp]=useState('ADMIN'),[recordType,setRecordType]=useState('SharedRecord'),[recordId,setRecordId]=useState('V00'),[purpose,setPurpose]=useState('General'),[file,setFile]=useState(null),[busy,setBusy]=useState(false),[attachments,setAttachments]=useState([])
  const projects=data.projects||[]
  const selectedProject=useMemo(()=>projects.find(x=>x.project_id===projectId),[projects,projectId])
  const loadAttachments=useCallback(async()=>{if(mode!=='live'){setAttachments([]);return}const{data:rows,error}=await supabase.from('v_admin_attachments').select('*').order('created_at',{ascending:false}).limit(200);if(error){setNotice('附件清單讀取失敗：'+error.message);return}setAttachments(rows||[])},[mode,setNotice])
  useEffect(()=>{loadAttachments()},[loadAttachments])
  useEffect(()=>{if(!projectId&&projects[0]?.project_id)setProjectId(projects[0].project_id)},[projects,projectId])

  async function cleanup(paths,attachmentId){try{if(attachmentId)await supabase.from('attachments').delete().eq('attachment_id',attachmentId)}catch{}try{if(paths.length)await supabase.storage.from(BUCKET).remove(paths)}catch{}}
  async function upload(){
    if(mode!=='live')return setNotice('請先登入 LIVE 模式。')
    if(!selectedProject||!sourceApp.trim()||!recordType.trim()||!recordId.trim()||!file)return setNotice('請選專案並填 Source APP / Record Type / Record ID / 檔案。')
    if(file.size>MAX_BYTES)return setNotice('檔案超過 25MB，請先壓縮或改用其他檔案。')
    const mime=mimeOf(file);if(mime==='application/octet-stream')return setNotice('無法辨識檔案類型，請使用圖片、PDF、Office、CSV/TXT 或 ZIP。')
    setBusy(true);let attachmentId=null,paths=[]
    try{
      attachmentId=crypto.randomUUID();const base=`${projectId}/${safeSegment(sourceApp)}/${safeSegment(recordType)}/${safeSegment(recordId)}/${attachmentId}`,originalPath=`${base}/original/original.${extOf(file.name)}`,thumb=await makeThumbnail(file),thumbPath=thumb?`${base}/thumb/preview.jpg`:null,[checksum,exif]=await Promise.all([sha256(file),readExifOrientation(file)])
      const up=await supabase.storage.from(BUCKET).upload(originalPath,file,{contentType:mime,cacheControl:'3600',upsert:false});if(up.error)throw up.error;paths.push(originalPath)
      if(thumb){const tu=await supabase.storage.from(BUCKET).upload(thumbPath,thumb.blob,{contentType:thumb.mime,cacheControl:'86400',upsert:false});if(tu.error)throw tu.error;paths.push(thumbPath)}
      let originalWidth=null,originalHeight=null;if(mime.startsWith('image/')&&!/heic|heif/i.test(mime)){try{const b=await createImageBitmap(file);originalWidth=b.width;originalHeight=b.height;b.close?.()}catch{}}
      const attachment={attachment_id:attachmentId,project_id:projectId,storage_bucket:BUCKET,file_name:file.name,original_file_name:file.name,mime_type:mime,storage_path:originalPath,file_size:file.size,width:originalWidth,height:originalHeight,orientation_normalized:false,thumbnail_storage_path:thumbPath,thumbnail_mime_type:thumb?.mime||null,thumbnail_file_size:thumb?.blob.size||null,thumbnail_width:thumb?.width||null,thumbnail_height:thumb?.height||null,thumbnail_orientation_normalized:thumb?true:null,checksum_sha256:checksum,exif_orientation:exif,source_app:sourceApp.trim(),source_record_id:recordId.trim(),upload_status:'Ready',processed_at:thumb?new Date().toISOString():null}
      const ai=await supabase.from('attachments').insert(attachment);if(ai.error)throw ai.error
      const ri=await supabase.from('record_attachments').insert({organization_id:selectedProject.organization_id,project_id:projectId,attachment_id:attachmentId,source_app:sourceApp.trim(),record_type:recordType.trim(),record_id:recordId.trim(),purpose:purpose.trim()||null});if(ri.error)throw ri.error
      setNotice(`附件上傳完成：${file.name}｜SHA-256 ${checksum.slice(0,12)}…${thumb?'｜縮圖完成':'｜未產縮圖'}`);setFile(null);await loadAttachments();await loadLive()
    }catch(e){await cleanup(paths,attachmentId);setNotice('附件上傳失敗：'+(e?.message||String(e)))}finally{setBusy(false)}
  }
  async function openFile(row,preferThumb=false){const path=preferThumb&&row.thumbnail_storage_path?row.thumbnail_storage_path:row.storage_path,{data:r,error}=await supabase.storage.from(row.storage_bucket||BUCKET).createSignedUrl(path,300);if(error)return setNotice('建立下載連結失敗：'+error.message);window.open(r.signedUrl,'_blank','noopener,noreferrer')}

  return <section className="card attachment-service">
    <div className="section-head"><h2>Shared Attachment Service｜共用附件服務</h2><b>{attachments.length} 件</b></div>
    <div className="service-note">Private Bucket：<b>{BUCKET}</b>｜單檔上限 25MB｜Project RLS｜原檔保留＋預產縮圖＋SHA-256＋EXIF Orientation</div>
    <div className="form-grid attach-form"><label>專案<select value={projectId} onChange={e=>setProjectId(e.target.value)} disabled={mode!=='live'}><option value="">選擇專案</option>{projects.map(p=><option key={p.project_id} value={p.project_id}>{p.project_code}｜{p.project_name}</option>)}</select></label><label>Source APP<input value={sourceApp} onChange={e=>setSourceApp(e.target.value)} placeholder="SITE-DIARY / QA-DEF / ADMIN"/></label><label>Record Type<input value={recordType} onChange={e=>setRecordType(e.target.value)} placeholder="Diary / Defect / SharedRecord"/></label><label>Record ID<input value={recordId} onChange={e=>setRecordId(e.target.value)} placeholder="UUID / Local ID / external id"/></label><label>用途<input value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="Photo / Evidence / General"/></label><label className="file-label">檔案<input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"/></label></div>
    {file&&<div className="file-preview"><b>{file.name}</b><span>{mimeOf(file)}｜{formatBytes(file.size)}</span></div>}
    <div className="form-actions"><button className="primary" onClick={upload} disabled={busy||mode!=='live'}>{busy?'處理中…':'上傳並建立附件關聯'}</button><button onClick={loadAttachments} disabled={busy||mode!=='live'}>重新整理附件</button></div>
    <div className="table-wrap"><table><thead><tr><th>原始檔</th><th>專案</th><th>Source APP</th><th>大小</th><th>影像</th><th>EXIF</th><th>SHA-256</th><th>Links</th><th>狀態</th><th>開啟</th></tr></thead><tbody>{attachments.length?attachments.map(a=><tr key={a.attachment_id}><td>{a.original_file_name||a.file_name}<div className="mono">{a.attachment_id}</div></td><td>{a.project_code}</td><td>{a.source_app||''}<div>{a.source_record_id||''}</div></td><td>{formatBytes(a.file_size)}{a.thumbnail_file_size!=null&&<div className="muted-small">thumb {formatBytes(a.thumbnail_file_size)}</div>}</td><td>{a.width&&a.height?`${a.width}×${a.height}`:'-'}{a.thumbnail_width&&a.thumbnail_height&&<div className="muted-small">thumb {a.thumbnail_width}×{a.thumbnail_height}</div>}</td><td>{a.exif_orientation??'-'}</td><td className="mono">{a.checksum_sha256?`${a.checksum_sha256.slice(0,12)}…`:'-'}</td><td>{a.record_link_count??0}</td><td>{a.upload_status}</td><td className="row-actions"><button onClick={()=>openFile(a,false)}>原檔</button>{a.thumbnail_storage_path&&<button onClick={()=>openFile(a,true)}>縮圖</button>}</td></tr>):<tr><td colSpan="10" className="empty">尚無共用附件。</td></tr>}</tbody></table></div>
  </section>
}
