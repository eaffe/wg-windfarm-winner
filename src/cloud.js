import {SUPABASE} from './config.js';
import {score} from './engine.js';

const MAX_SNAPSHOT_BYTES=120_000;
export class Cloud {
  constructor(){this.client=null;this.loadPromise=null;this.user=null;}
  get available(){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE.url) && /^(sb_publishable_|eyJ)/.test(SUPABASE.publishableKey);}
  async connect(){
    if(!this.available)throw Error('A separate Supabase project has not been connected yet. Offline play is available.');
    if(this.client)return this.client;
    if(!this.loadPromise)this.loadPromise=(async()=>{
      const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      this.client=createClient(SUPABASE.url,SUPABASE.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data,error}=await this.client.auth.getUser();if(!error)this.user=data.user;
      return this.client;
    })();
    try{return await this.loadPromise;}finally{this.loadPromise=null;}
  }
  async signUp(email,password,nickname){
    const c=await this.connect();const {data,error}=await c.auth.signUp({email,password,options:{emailRedirectTo:new URL('./',location.href).href,data:{nickname}}});
    if(error)throw Error(error.message);this.user=data.session?data.user:null;return {confirmationRequired:!data.session};
  }
  async signIn(email,password){const c=await this.connect();const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw Error(error.message);this.user=data.user;return data.user;}
  async signOut(){const c=await this.connect();const {error}=await c.auth.signOut();if(error)throw Error(error.message);this.user=null;}
  async resetPassword(email){const c=await this.connect();const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:new URL('./',location.href).href});if(error)throw Error(error.message);}
  async profile(){const c=await this.connect();const {data,error}=await c.from('wfw_profiles').select('nickname,leaderboard_opt_in').eq('user_id',this.user.id).maybeSingle();if(error)throw Error(error.message);return data;}
  async setProfile(nickname,optIn){const c=await this.connect();const {error}=await c.from('wfw_profiles').upsert({user_id:this.user.id,nickname,leaderboard_opt_in:Boolean(optIn)},{onConflict:'user_id'});if(error)throw Error(error.message);}
  async save(game){if(!this.user)return;const c=await this.connect();const snapshot=JSON.stringify(game);if(snapshot.length>MAX_SNAPSHOT_BYTES)throw Error('Save reached the storage limit. Start a new fund.');
    const {error}=await c.from('wfw_runs').upsert({id:game.id,user_id:this.user.id,snapshot:game,completed:game.closed,score:game.closed?score(game):null,exit_count:game.exits.length,multiple:game.closed?game.finalMultiple:null},{onConflict:'id'});
    if(error)throw Error(error.message);}
  async loadLatest(){const c=await this.connect();const {data,error}=await c.from('wfw_runs').select('snapshot').eq('user_id',this.user.id).order('updated_at',{ascending:false}).limit(1).maybeSingle();if(error)throw Error(error.message);return data?.snapshot||null;}
  async leaderboard(){const c=await this.connect();const {data,error}=await c.rpc('wfw_leaderboard');if(error)throw Error(error.message);return data||[];}
}
