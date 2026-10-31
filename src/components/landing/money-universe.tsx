"use client";

import { useEffect, useRef, useState } from "react";

/** Real, locally rendered geometry. No remote models or textures are required. */
export function MoneyUniverse({ network = false }: { network?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let dispose = () => {};
    let cancelled = false;
    async function mount() {
      const THREE = await import("three");
      const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
      const { createThreeUIOrbitalField } = await import("./threeui-orbital");
      const { createGoalWorld } = await import("./goal-world");
      const { RoundedBoxGeometry } = await import("three/addons/geometries/RoundedBoxGeometry.js");
      if (cancelled || !element) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, .1, 80);
      camera.position.set(0, 3.2, 11.5);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const environment = pmrem.fromScene(room, .04);
      scene.environment = environment.texture;
      room.dispose();
      const gold = new THREE.MeshStandardMaterial({ color: 0xeeb45b, metalness: .92, roughness: .24 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x202a29, metalness: .75, roughness: .28 });
      const light = new THREE.MeshBasicMaterial({ color: 0xf4c777 });
      const green = new THREE.MeshStandardMaterial({ color: 0x70dcc6, emissive: 0x1a7567, emissiveIntensity: .35, metalness: .5, roughness: .25 });
      scene.add(new THREE.HemisphereLight(0xffe7c7, 0x233e3c, 2.5));
      const key = new THREE.DirectionalLight(0xffdeac, 4); key.position.set(4, 5, 5); scene.add(key);
      const rim = new THREE.PointLight(0x65e5d3, 32); rim.position.set(-4, 3, -2); scene.add(rim);
      const world = new THREE.Group(); scene.add(world);
      const core = new THREE.Group(); world.add(core);
      const textures: import("three").Texture[] = [];
      const goals = network ? createGoalWorld() : null;
      if (goals) world.add(goals.world);
      const label = (title: string, amount: string, color: string) => {
        const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 256;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#17201f"; ctx.beginPath(); ctx.roundRect(0, 0, 512, 256, 25); ctx.fill();
        ctx.strokeStyle = "#52605a"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(49, 51, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c7cec7"; ctx.font = "25px sans-serif"; ctx.fillText(title, 75, 60);
        ctx.fillStyle = "#f5eee1"; ctx.font = "500 46px sans-serif"; ctx.fillText(amount, 33, 148);
        ctx.fillStyle = color; ctx.font = "21px sans-serif"; ctx.fillText(network ? "Connected to your plan" : "Part of your money story", 33, 207);
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture); return texture;
      };
      const coinCanvas = document.createElement("canvas"); coinCanvas.width = coinCanvas.height = 256;
      const ctx = coinCanvas.getContext("2d")!;
      ctx.fillStyle = "#efbd69"; ctx.fillRect(0,0,256,256); ctx.strokeStyle = "#7b4c13"; ctx.lineWidth=4; ctx.beginPath();ctx.arc(128,128,112,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#704311";ctx.font="150px Georgia";ctx.textAlign="center";ctx.fillText("₹",128,181);
      const coinTexture = new THREE.CanvasTexture(coinCanvas); coinTexture.colorSpace = THREE.SRGBColorSpace; textures.push(coinTexture);
      const face = new THREE.MeshStandardMaterial({ map:coinTexture, metalness:.65, roughness:.3 });
      const wallet = new THREE.Group();
      if (!network) {
        const shell=new THREE.Mesh(new RoundedBoxGeometry(2.65,1.65,.55,4,.12),new THREE.MeshStandardMaterial({color:0x284e3c,roughness:.48,metalness:.25}));wallet.add(shell);
        const seam=new THREE.Mesh(new RoundedBoxGeometry(2.48,1.46,.03,3,.1),gold);seam.position.z=.29;wallet.add(seam);
        const cover=new THREE.Mesh(new RoundedBoxGeometry(2.42,1.4,.035,3,.09),dark);cover.position.z=.31;wallet.add(cover);
        const card=new THREE.Mesh(new THREE.BoxGeometry(2.08,1.05,.04),gold);card.position.set(0,.8,-.05);card.rotation.z=-.08;wallet.add(card);
        const text=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.9),new THREE.MeshBasicMaterial({map:label("Kosh","Your money, together","#efbc6a")}));text.position.set(0,.8,-.02);text.rotation.z=-.08;wallet.add(text);
        const clasp=new THREE.Mesh(new RoundedBoxGeometry(.7,.48,.13,3,.08),gold);clasp.position.set(1.05,0,.38);wallet.add(clasp);
        const stud=new THREE.Mesh(new THREE.SphereGeometry(.07,16,16),dark);stud.position.set(.99,0,.48);wallet.add(stud);
        wallet.rotation.set(-.12,-.25,-.08);wallet.position.set(-.55,.25,.4);world.add(wallet);
        core.position.set(1.1,-.5,1);core.scale.setScalar(.55);
      }
      if (network) core.add(createThreeUIOrbitalField());
      for (let i=0;i<(network ? 0 : 5);i++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,.14,64),[gold,face,gold]);
        coin.position.y = -.35 + i*.18; core.add(coin);
        const edge = new THREE.Mesh(new THREE.TorusGeometry(.85,.018,8,64),light); edge.rotation.x=Math.PI/2;edge.position.y=coin.position.y+.065;core.add(edge);
      }
      const rings: import("three").Mesh[] = [];
      [1.35,1.62,2.1].forEach((radius,i)=>{
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius,i===0?.065:.018,12,120), i===0?gold:i===1?green:light);
        ring.rotation.set(.5+i*.65,.25+i*.4, .3);core.add(ring);rings.push(ring);
      });
      // A physical plinth and concentric tracks anchor the floating sculpture.
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.35,2.5,.18,96),dark);plinth.position.y=-1.8;world.add(plinth);
      for(let i=0;i<3;i++){const track = new THREE.Mesh(new THREE.TorusGeometry(2.1+i*.12,.012,8,100),i===1?green:gold);track.rotation.x=Math.PI/2;track.position.y=-1.69;world.add(track);}
      const entries = network ? [["Income","₹85,000"],["Essentials","₹38,000"],["Everyday living","₹17,000"],["Goal capacity","₹30,000"]] : [["Salary received","+ ₹85,000"],["UPI · Groceries","− ₹4,200"],["Emergency fund","Your next goal"],["Bank statement","Everything, together"]];
      const cards: import("three").Group[]=[];
      const paths: import("three").CatmullRomCurve3[]=[];
      const pulses: import("three").Mesh[]=[];
      const links: import("three").Mesh[]=[];
      const anchors: import("three").Vector3[]=[];
      entries.forEach(([title,amount],i)=>{
        const theta=i*Math.PI/2+.4;
        const pos=new THREE.Vector3(Math.cos(theta)*3.05, i%2===0?.8:-.35,Math.sin(theta)*2.1);
        anchors.push(pos.clone());
        const card=new THREE.Group();card.position.copy(pos);
        const panel=new THREE.Mesh(new THREE.BoxGeometry(1.9,.95,.09),dark);card.add(panel);
        const front=new THREE.Mesh(new THREE.PlaneGeometry(1.88,.94),new THREE.MeshBasicMaterial({map:label(title,amount,i%2?"#83dcca":"#f2c16d"),transparent:true}));front.position.z=.051;card.add(front);world.add(card);cards.push(card);
        const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(pos.x*.5,1.35,pos.z*.5),pos]);paths.push(curve);
        const link=new THREE.Mesh(new THREE.TubeGeometry(curve,40,.012,6,false),i%2?green:gold);world.add(link);links.push(link);
        const pulse=new THREE.Mesh(new THREE.SphereGeometry(.055,12,12),light);world.add(pulse);pulses.push(pulse);
      });
      const particleGeometry=new THREE.BufferGeometry();const positions=[];
      for(let i=0;i<140;i++){const a=i*2.399;const r=2.5+(i%23)/10;positions.push(Math.cos(a)*r,Math.sin(i*3.7)*2,Math.sin(a)*r);}
      particleGeometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
      const particles=new THREE.Points(particleGeometry,new THREE.PointsMaterial({color:0xb6ab86,size:.018,transparent:true,opacity:.65}));world.add(particles);
      let visible=true, frame=0, progress=0, pointerX=0, pointerY=0;
      const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
      const resize=()=>{const {width,height}=element.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.position.z=width<500?14:11.5;camera.updateProjectionMatrix();};
      const observer=new ResizeObserver(resize);observer.observe(element);resize();
      const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});intersection.observe(element);
      const onPointer=(event:PointerEvent)=>{const rect=element.getBoundingClientRect();pointerX=(event.clientX-rect.left)/rect.width-.5;pointerY=(event.clientY-rect.top)/rect.height-.5;};
      element.addEventListener("pointermove",onPointer);
      const render=(time:number)=>{
        frame=requestAnimationFrame(render);if(!visible||document.hidden)return;
        const parent=element.closest("section")!;const rect=parent.getBoundingClientRect();
        const target=Math.max(0,Math.min(1,-rect.top/Math.max(1,rect.height-innerHeight)));
        progress+=(target-progress)*.08;
        const t=reduced.matches?0:time*.00018;
        const p=reduced.matches ? .5 : progress;
        const assemble=THREE.MathUtils.smoothstep(p,.08,.45);
        const revealGoals=network ? THREE.MathUtils.smoothstep(p,.63,.85) : 0;
        world.rotation.y=reduced.matches?-.25:Math.sin(t)*.06+p*(network?.85:.65)+pointerX*.12;
        core.rotation.y=t*.4;
        if(goals){core.position.y=1.05*revealGoals;core.scale.setScalar((.3+assemble*.7)*(1-revealGoals*.78));goals.world.scale.setScalar(Math.max(.001,revealGoals));goals.islands.forEach((island,i)=>island.position.y=-.55+(1-revealGoals)*(i+1));goals.plane.position.y=.35+Math.sin(t*3)*.045;}
        else {wallet.rotation.y=-.25+p*.45+Math.sin(t)*.06;core.position.y=-.5+Math.sin(t*3)*.06;}
        rings.forEach((ring,i)=>{ring.rotation.z=t*(i%2?-.6:.6)+i*.3;});
        cards.forEach((card,i)=>{card.lookAt(camera.position);card.visible=revealGoals<.8;const spread=network?1+(1-assemble)*.25:1;card.position.copy(anchors[i]).multiplyScalar(spread);card.position.y+=(reduced.matches?0:Math.sin(t*3+i)*.12);card.scale.setScalar(1-revealGoals*.7);});
        links.forEach(link=>link.visible=(!network||assemble>.65)&&revealGoals<.5);
        pulses.forEach((pulse,i)=>{pulse.visible=links[i].visible;pulse.position.copy(paths[i].getPoint((t+i*.25)%1));});
        if(network){camera.position.y=3.2-p*1.1;camera.position.z=(element.clientWidth<500?14:11.5)-Math.sin(p*Math.PI)*1.2;}
        else camera.position.y=3.2+(reduced.matches?0:p*1.2+pointerY*.35);
        camera.lookAt(0,-.1,0);
        renderer.render(scene,camera);
      };
      frame=requestAnimationFrame(render);
      dispose=()=>{cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();element.removeEventListener("pointermove",onPointer);scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line){object.geometry.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach(m=>m.dispose());}});textures.forEach(t=>t.dispose());environment.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();};
      if(cancelled)dispose();
    }
    mount().catch(()=>{if(!cancelled)setFailed(true);});
    return()=>{cancelled=true;dispose();};
  }, [network]);
  return <div ref={host} className="kosh3d-canvas" role="img" aria-label="A three-dimensional money model: rupee coins surrounded by connected income, spending and savings panels">{failed && <div className="kosh3d-fallback"><span>₹</span><p>Income → Your money model → Your goals</p></div>}</div>;
}
