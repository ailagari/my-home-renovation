// Owner-confirmed: a four-sided band below the first-floor slab and a 1 m roof parapet.
// Band depth/thickness, parapet thickness and the existing 0.16 m slab are provisional.
export function structureSettings(value={}){
 const s={band:true,bandDepth:.25,bandThickness:.23,parapet:true,parapetHeight:1,parapetThickness:.15,...value};
 for(const key of ['band','parapet'])if(typeof s[key]!=='boolean')throw Error('Choose whether to show the band and parapet.');
 for(const [key,min,max] of [['bandDepth',.05,.8],['bandThickness',.1,.8],['parapetHeight',.2,2],['parapetThickness',.08,.5]])if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error('Enter valid band and parapet dimensions.');
 return s;
}
export function roofFootprints(proposed=true){
 const outlines=[[[0,proposed?2.35:4.08],[3.45,proposed?2.35:4.08],[3.45,5.70],[8.6,5.70],[8.6,12.88],[0,12.88]]];
 if(proposed)outlines.push([[4.45,3.7],[6.42,3.7],[6.42,5.75],[4.45,5.75]]);
 return outlines;
}
export function perimeterSegments(outline){return outline.map((start,i)=>({start,end:outline[(i+1)%outline.length]}));}
export function structureGeometry(settings,heights=[3,3],proposed=true){
 const s=structureSettings(settings),slab=.16,bandTop=heights[0]-slab;
 return {
  band:s.band?perimeterSegments([[0,0],[8.6,0],[8.6,12.85],[0,12.85]]).map(seg=>({...seg,bottom:bandTop-s.bandDepth,height:s.bandDepth,thickness:s.bandThickness})):[],
  parapet:s.parapet?roofFootprints(proposed).flatMap(outline=>perimeterSegments(outline).map(seg=>({...seg,bottom:heights[1],height:s.parapetHeight,thickness:s.parapetThickness}))):[]
 };
}
