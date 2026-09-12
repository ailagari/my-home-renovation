import * as THREE from './vendor/three.module.js';

// Generic hardware at approximate physical scale. These are not manufacturer models.
const palette=new Map();
const material=(color,glow=false)=>{const key=color+glow;if(!palette.has(key))palette.set(key,new THREE.MeshStandardMaterial({color,roughness:.48,metalness:color==='#343c43'?.5:.08,...(glow?{emissive:color,emissiveIntensity:.65}:{})}));return palette.get(key);};
function box(g,x,y,z,w,h,d,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
function disc(g,x,y,z,r,depth,c){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,depth,32),material(c,c==='#ffe7ad'));m.rotation.x=Math.PI/2;m.position.set(x,y,z);g.add(m);return m;}
function label(g,text,x,y,z,w=.13){const c=document.createElement('canvas');c.width=256;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='#27343d';ctx.fillRect(0,0,256,80);ctx.fillStyle='white';ctx.font='bold 40px Segoe UI';ctx.textAlign='center';ctx.fillText(text,128,55);const texture=new THREE.CanvasTexture(c);texture.userData.temporary=true;texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w*.3125),new THREE.MeshBasicMaterial({map:texture}));m.position.set(x,y,z);g.add(m);}
export function fixture(p,color){
  const root=new THREE.Group(),g=new THREE.Group();root.add(g);
  const wall=p.surface==='A'?0:p.surface==='B'?-Math.PI/2:p.surface==='C'?Math.PI:p.surface==='D'?Math.PI/2:0;
  const hanging=['fan','pendant','projector'].includes(p.type);
  if(!hanging){if(p.surface==='ceiling')g.rotation.x=Math.PI/2;else if(p.surface==='floor')g.rotation.x=-Math.PI/2;else g.rotation.y=wall;}
  const white='#eeeae0',dark='#343c43';
  if(p.type==='fan'){
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.22,16),material(dark));stem.position.y=-.11;g.add(stem);
    const hub=new THREE.Mesh(new THREE.SphereGeometry(.105,20,12),material(white));hub.scale.y=.5;hub.position.y=-.24;g.add(hub);
    for(let i=0;i<3;i++){const blade=new THREE.Group();blade.rotation.y=i*Math.PI*2/3;g.add(blade);box(blade,.30,-.235,0,.56,.022,.12,'#8a725c');}
  }else if(['socket13','socket16','socket1','socket2','bedstation','pc','tv','av','counter','usb'].includes(p.type)){
    const twin=['socket2','bedstation','pc','counter','av'].includes(p.type),w=twin?.15:.09;
    box(g,0,0,.018,w,.10,.036,white);
    for(const x of twin?[-.035,.035]:[0]){if(p.type==='socket16'){for(const [dx,dy] of [[-.018,-.01],[.018,-.01],[0,.023]])disc(g,x+dx,dy,.038,.006,.003,dark);}else{for(const [dx,dy] of [[-.016,-.013],[.016,-.013],[0,.018]])box(g,x+dx,dy,.038,.009,.019,.004,dark);}}
    box(g,w/2-.014,.03,.042,.014,.021,.009,color);if(p.type==='socket13'||p.type==='socket16')label(g,p.type==='socket13'?'13A':'16A',0,-.039,.04,.035);
  }else if(['rj45','rj45single','hdmi'].includes(p.type)){
    box(g,0,0,.017,.09,.09,.034,white);
    for(const x of p.type==='rj45'?[-.023,.023]:[0]){box(g,x,0,.036,.027,.022,.004,dark);for(let i=0;i<4;i++)box(g,x-.009+i*.006,.004,.04,.002,.006,.003,'#d4b453');}
    label(g,p.type==='hdmi'?'AV':'RJ45',0,-.03,.04,.045);
  }else if(['switch','dimmer'].includes(p.type)){
    box(g,0,0,.015,.09,.09,.03,white);if(p.type==='dimmer')disc(g,0,0,.04,.022,.025,dark);else box(g,0,0,.038,.04,.055,.022,white);box(g,0,-.033,.034,.021,.003,.004,color);
  }else if(['db1p','db3p','rack'].includes(p.type)){
    const rack=p.type==='rack',w=rack?.5:.38,h=rack?.65:.52,d=rack?.35:.12;
    box(g,0,0,d/2,w,h,d,rack?dark:white);box(g,0,0,d+.008,w-.045,h-.05,.018,'#53616a');
    const rows=rack?5:3;
    for(let row=0;row<rows;row++){const y=h*.32-row*(h*.64/(rows-1));if(rack){box(g,0,y,d+.022,w-.075,.065,.012,dark);for(let i=0;i<8;i++)box(g,-.16+i*.044,y,d+.031,.025,.012,.008,i<2?'#39bd99':'#9d9f8d');}else for(let i=0;i<(p.type==='db3p'?6:4);i++){box(g,-.13+i*.05,y,d+.03,.036,.068,.023,white);box(g,-.13+i*.05,y,d+.046,.021,.028,.012,row===0?color:dark);}}
    label(g,rack?'NETWORK':p.type==='db3p'?'3 PHASE':'1 PHASE',0,h/2-.02,d+.037,w*.55);
  }else if(p.type==='screen'){
    box(g,0,0,.05,2.05,.09,.10,white);box(g,0,-.61,.07,2.0,1.13,.024,'#e6e7df');
  }else if(p.type==='camera'){
    box(g,0,0,.025,.12,.10,.05,white);const dome=new THREE.Mesh(new THREE.SphereGeometry(.065,24,16),material(dark));dome.position.set(0,-.03,.085);g.add(dome);disc(g,0,-.03,.145,.025,.02,'#233c45');
  }else if(p.type==='ac'){
    box(g,0,0,.12,.88,.29,.24,white);for(let i=0;i<5;i++)box(g,0,-.055-i*.02,.247,.72,.007,.006,'#74817f');disc(g,.33,.07,.245,.012,.004,'#78c8b4');
  }else if(['downlight','sensor','ap'].includes(p.type)){
    disc(g,0,0,.025,p.type==='ap'?.105:.075,.05,white);disc(g,0,0,.052,p.type==='downlight'?.061:.035,.012,p.type==='downlight'?'#ffe7ad':color);
  }else if(p.type==='pendant'){
    const wire=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.55,8),material(dark));wire.position.y=-.275;g.add(wire);const shade=new THREE.Mesh(new THREE.ConeGeometry(.16,.22,32,1,true),material('#baa589'));shade.position.y=-.6;g.add(shade);
  }else if(p.type==='projector'){
    box(g,0,-.10,0,.025,.20,.025,dark);box(g,0,-.22,0,.31,.11,.23,white);disc(g,.08,-.22,.125,.036,.025,dark);
  }else if(['appliance13','appliance16','fridge','washer','dryer','oven','dishwasher'].includes(p.type)){
    box(g,0,0,.23,.52,.55,.46,white);box(g,0,0,.465,.43,.36,.012,dark);label(g,p.type==='appliance16'?'16A':p.type==='appliance13'?'13A':'APPLIANCE',0,.22,.475,.26);
  }else if(['strip','sconce','night','outdoorlight'].includes(p.type)){
    box(g,0,0,.035,p.type==='strip'?.65:.13,p.type==='strip'?.025:.19,.07,dark);box(g,0,0,.074,p.type==='strip'?.60:.095,p.type==='strip'?.015:.14,.014,'#ffe7ad');
  }else if(p.type==='exhaust'){
    box(g,0,0,.045,.24,.24,.09,white);disc(g,0,0,.097,.09,.018,dark);for(let i=0;i<3;i++){const b=box(g,0,0,.112,.14,.025,.01,white);b.rotation.z=i*Math.PI/3;}
  }else{box(g,0,0,.035,.14,.16,.07,white);box(g,0,0,.075,.08,.08,.013,color);}
  return root;
}
