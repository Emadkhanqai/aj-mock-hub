const PREVIEW_RUNTIME_BRIDGE = `<script data-ajmh-preview-bridge>(()=>{
  const applied=new Set();
  const colors=value=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value)?value:null;
  const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=120?value:null;
  const target=id=>Array.from(document.querySelectorAll('[data-ajmh-id]')).find(element=>element.getAttribute('data-ajmh-id')===id);
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||!event.data||event.data.type!=='ajmh:preview-operation')return;
    const message=event.data;
    if(typeof message.messageId!=='string')return;
    if(applied.has(message.messageId)){
      window.parent.postMessage({type:'ajmh:preview-operation-applied',messageId:message.messageId},'*');
      return;
    }
    if(!['RENAME','RECOLOR','CLONE','ADD_BUTTON','THEME'].includes(message.operation))return;
    const element=target(message.targetId);
    if(message.operation!=='THEME'&&message.operation!=='ADD_BUTTON'&&!element)return;
    if(message.operation==='RENAME'){
      const replacement=text(message.replacementText);
      if(!replacement)return;
      const label=element.matches('button')?element:element.querySelector('h2');
      if(!label)return;
      label.textContent=replacement;
    }
    if(message.operation==='RECOLOR'){
      const foreground=colors(message.textColor);
      const background=colors(message.backgroundColor);
      if(!foreground&&!background)return;
      if(foreground)element.style.color=foreground;
      if(background)element.style.background=background;
    }
    if(message.operation==='CLONE'){
      const clone=element.cloneNode(true);
      clone.setAttribute('data-ajmh-id',message.targetId+':draft-copy');
      element.insertAdjacentElement('afterend',clone);
    }
    if(message.operation==='ADD_BUTTON'){
      const label=text(message.buttonLabel);
      const canvas=document.querySelector('.canvas');
      if(!label||!canvas)return;
      const button=document.createElement('button');
      button.type='button';
      button.className='canvas-action';
      button.textContent=label;
      canvas.append(button);
    }
    if(message.operation==='THEME'){
      if(!['AURORA','MIDNIGHT','PAPER','SUNSET'].includes(message.themePreset))return;
      document.querySelector('.app-shell')?.setAttribute('data-theme',message.themePreset);
    }
    applied.add(message.messageId);
    window.parent.postMessage({type:'ajmh:preview-operation-applied',messageId:message.messageId},'*');
  });
  window.parent.postMessage({type:'ajmh:preview-bridge-ready'},'*');
})();</script>`;

export function injectPreviewRuntimeBridge(body: Buffer, path: string): Buffer {
  if (!path.toLowerCase().endsWith('.html')) return body;
  const html = body.toString('utf8');
  if (html.includes('data-ajmh-preview-bridge')) return body;
  const bridged = html.includes('</body>')
    ? html.replace('</body>', `${PREVIEW_RUNTIME_BRIDGE}</body>`)
    : `${html}${PREVIEW_RUNTIME_BRIDGE}`;
  return Buffer.from(bridged, 'utf8');
}
