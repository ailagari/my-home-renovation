let lastURL;
export function showProjectBackup(project,json){
 document.querySelector('#projectBackup')?.remove();if(lastURL)URL.revokeObjectURL(lastURL);
 lastURL=URL.createObjectURL(new Blob([json],{type:'application/json'}));
 const dialog=document.createElement('dialog');dialog.id='projectBackup';
 const title=document.createElement('h2');title.textContent='Project backup ready';dialog.append(title);
 const text=document.createElement('p');text.textContent='This file includes your layout, equipment, floor levels and original imported model files. Save it before clearing browser data or changing devices. If your browser blocks the download, open the JSON below, copy it and save it as a .json file.';dialog.append(text);
 const link=document.createElement('a');link.id='saveProjectBackup';link.className='primary filebutton';link.textContent='Save project JSON';link.href=lastURL;link.download=(project.name||'myhome').replace(/[^a-z0-9_-]+/gi,'-')+'-R'+project.revision+'.json';dialog.append(link);
 if(['127.0.0.1','localhost'].includes(location.hostname)&&location.port==='5173'){
  const save=document.createElement('button');save.id='saveLocalBackup';save.textContent='Save to local exports folder';const status=document.createElement('p');status.id='localBackupStatus';
  save.onclick=async()=>{save.disabled=true;try{const response=await fetch('/__house_backup__',{method:'POST',headers:{'Content-Type':'application/json'},body:json});if(!response.ok)throw Error('Restart the local viewer to enable file saving, or use Save project JSON.');const result=await response.json();status.textContent='Saved: '+result.path;}catch(e){status.textContent=e.message;save.disabled=false;}};dialog.append(save,status);
 }
 if(json.length<2e6){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='View or copy backup JSON';details.append(summary);const area=document.createElement('textarea');area.id='backupJson';area.readOnly=true;area.value=json;area.setAttribute('aria-label','Project backup JSON');details.append(area);dialog.append(details);}
 const close=document.createElement('button');close.textContent='Close backup';close.onclick=()=>dialog.close();dialog.append(close);document.body.append(dialog);dialog.showModal();
}
