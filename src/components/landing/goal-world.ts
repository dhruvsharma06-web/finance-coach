import * as THREE from "three";

/** Procedural goal diorama: every mesh represents a recognisable financial goal. */
export function createGoalWorld() {
  const world = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: 0xe0dbc9, roughness: .7 });
  const green = new THREE.MeshStandardMaterial({ color: 0x356455, roughness: .45, metalness: .2 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe1af62, roughness: .3, metalness: .65 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x82d4ca, emissive: 0x2d776d, emissiveIntensity: .3, metalness: .6, roughness: .18 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x162a24, roughness: .5 });
  const box = (parent: THREE.Group, size: number[], pos: number[], material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number,number,number]), material);
    mesh.position.set(...pos as [number,number,number]);parent.add(mesh);return mesh;
  };
  const islands = [-2.15,0,2.15].map(x => {
    const group = new THREE.Group();group.position.set(x,-.55,0);world.add(group);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.94,1.02,.18,48),green);base.position.y=-.7;group.add(base);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(.96,.018,8,64),gold);trim.rotation.x=Math.PI/2;trim.position.y=-.6;group.add(trim);
    return group;
  });
  const home=islands[0];
  box(home,[1.05,.85,.9],[0,-.12,0],cream);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(.9,.62,4),green);roof.rotation.y=Math.PI/4;roof.position.y=.6;home.add(roof);
  box(home,[.23,.47,.04],[.2,-.31,.47],gold);
  [-.31,.28].forEach(x=>box(home,[.22,.23,.04],[x,.13,.47],glass));
  box(home,[.18,.42,.18],[.3,.64,-.2],cream);
  for(let i=0;i<3;i++)box(home,[.38,.06,.16],[.2,-.57-i*.035,.58+i*.13],cream);
  const vault=islands[1];
  box(vault,[1.15,1.23,.8],[0,0,0],dark);box(vault,[1.02,1.1,.08],[0,0,.44],gold);box(vault,[.84,.92,.06],[0,0,.5],green);
  const dial=new THREE.Mesh(new THREE.TorusGeometry(.22,.045,12,32),gold);dial.position.set(0,.08,.59);vault.add(dial);
  for(let i=0;i<3;i++){const spoke=box(vault,[.48,.035,.04],[0,.08,.6],gold);spoke.rotation.z=i*Math.PI/3;}
  box(vault,[.07,.32,.09],[.35,-.17,.58],gold);
  const travel=islands[2];
  const plane=new THREE.Group();travel.add(plane);plane.rotation.set(.15,.45,-.12);plane.position.y=.35;
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.12,1.15,8,16),cream);body.rotation.x=Math.PI/2;plane.add(body);
  box(plane,[1.35,.045,.27],[0,0,.05],cream);box(plane,[.6,.04,.16],[0,.07,-.56],gold);box(plane,[.04,.3,.25],[0,.16,-.5],green);
  [-.3,.3].forEach(x=>{const engine=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.25,16),gold);engine.rotation.x=Math.PI/2;engine.position.set(x,-.08,.12);plane.add(engine);});
  box(travel,[.45,.55,.25],[-.35,-.31,.35],gold);box(travel,[.2,.07,.07],[-.35,.01,.35],dark);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(.72,.018,8,64,Math.PI),glass);arch.position.y=-.35;travel.add(arch);
  return { world, islands, plane };
}
