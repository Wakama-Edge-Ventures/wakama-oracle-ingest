const fs=require('fs'); const crypto=require('crypto');
function rndn(mu,s){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return mu+s*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function clip(x,a,b){return Math.max(a,Math.min(b,x))}
function one(ts,zone,dev,s){
  let v,u;
  if(s==='dht22_temp'){v=clip(rndn(28,2)+0.002*((ts/1000)%3600),15,45);u='°C'}
  else if(s==='dht22_hum'){v=clip(rndn(70,5),20,100);u='%'}
  else if(s==='ds18b20'){v=clip(rndn(27,1.5),10,50);u='°C'}
  else if(s==='soil_moisture'){v=clip(rndn(55,8),5,100);u='%'}
  else {v=rndn(0,1);u='u'}
  if(Math.random()<0.01){v*= (Math.random()<0.5?0.5:1.5)}
  return {zone_id:zone,device_id:dev,sensor_type:s,ts:new Date(ts).toISOString(),value:Math.round(v*10)/10,unit:u};
}
(function main(){
  const N=parseInt(process.argv[2]||'50',10), zone=process.argv[3]||'raviart', dev=process.argv[4]||'esp32-cam-01';
  const sensors=['dht22_temp','dht22_hum','ds18b20','soil_moisture'], t0=Date.now(), m=[];
  for(let i=0;i<N;i++){ m.push(one(t0+i*1000,zone,dev,sensors[i%sensors.length])); }
  const b={batch_id:crypto.randomUUID(), ts_min:m[0].ts, ts_max:m[m.length-1].ts, count:m.length, measures:m};
  const name=`${b.ts_min.replace(/[:]/g,'-').replace(/\..*/,'')}_${b.batch_id}.json`;
  fs.writeFileSync(`batches/${name}`, JSON.stringify(b));
  console.log(`batches/${name}`);
})();
