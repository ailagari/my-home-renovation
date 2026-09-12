// Presentation transforms only. Saved positions and engineering lengths stay in house coordinates.
export const coverageNames={room:'Selected room',ground:'Ground floor',first:'First floor',all:'Whole house'};
export function coverageOptions(mode,roomFloor=0){
  if(!Object.hasOwn(coverageNames,mode))throw Error('Unknown electrical view');
  return {scope:mode==='all'?'all':'floor',floor:mode==='ground'?0:mode==='first'?1:roomFloor,roomOnly:mode==='room',overview:mode!=='room',floorLayout:mode==='all'?'side-by-side':'stacked'};
}
export function pointsInView(points,mode,roomId,rooms,types){
  const o=coverageOptions(mode,rooms[roomId].floor);
  return points.filter(p=>mode==='room'?p.roomId===roomId:!['plumbing','model'].includes(types[p.type].group)&&(o.scope==='all'||rooms[p.roomId].floor===o.floor));
}
export function floorOffset(floor,o){
  if(o.scope!=='all')return [0,0,0];
  if(o.floorLayout==='side-by-side')return [floor*13,0,0];
  return [0,o.floorOffsets?.[floor]??(floor?(o.heights?.[0]??3)+(o.explode&&(!o.view||o.view==='cutaway')?2.5:0):0),0];
}
export function displayPosition(position,floor,o){
  const offset=floorOffset(floor,o);
  return [position[0]+offset[0],position[1]-floor*3+offset[1],position[2]+offset[2]];
}
