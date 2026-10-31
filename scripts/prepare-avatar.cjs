// Rebuild the AGPL avatar-core fork with a precompiled validator; no eval in browsers.
const fs=require('node:fs'),path=require('node:path'),Ajv=require('ajv/dist/2020').default,standalone=require('ajv/dist/standalone').default;
const dir='src/components/assistant/avatar-engine';fs.mkdirSync(dir,{recursive:true});
const header='// Bible Strong Avatar Lab, smontlouis; AGPL-3.0-only.\n// Kosh modification: precompile schema validation for strict CSP.\n';
const schema=JSON.parse(fs.readFileSync('node_modules/@bible-strong/avatar-core/dist/avatarDefinition.schema.json','utf8'));
const ajv=new Ajv({allErrors:true,strict:true,code:{source:true}});const validate=ajv.compile(schema);
fs.writeFileSync(path.join(dir,'avatar-validator.cjs'),header+standalone(ajv,validate));
for(const file of ['ambientMotion.js','body.js','geometry.js','index.js','surfaces.js']){
 let text=fs.readFileSync('node_modules/@bible-strong/avatar-core/dist/'+file,'utf8');
 if(file==='index.js'){
 text=text.replace('import O from "ajv/dist/2020.js";','import validateAvatarSchema from "./avatar-validator.cjs";');
 const before=text;text=text.replace(/F = new O\(\{[\s\S]*?\}\)\.compile\(k\)/,'F = validateAvatarSchema');if(text===before)throw new Error('Upstream validator changed; review before regenerating.');
 }
 fs.writeFileSync(path.join(dir,file),header+text);
}
fs.copyFileSync('node_modules/@bible-strong/avatar-core/LICENSE',path.join(dir,'LICENSE'));
console.log('Prepared CSP-safe avatar engine with full schema validation.');


