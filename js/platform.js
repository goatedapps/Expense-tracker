export const isNativeApp=()=>!!window.Capacitor?.isNativePlatform?.();

export async function exportFile(content,name,type){
  if(isNativeApp()){
    const {Filesystem,Share}=window.Capacitor.Plugins;
    const result=await Filesystem.writeFile({path:`exports/${name}`,data:content,directory:'CACHE',encoding:'utf8',recursive:true});
    await Share.share({title:name,url:result.uri,dialogTitle:'Save or share your export'});
    return;
  }
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}

export function setupAndroidBack(closeEditor){
  if(!isNativeApp())return;
  window.Capacitor.Plugins.App.addListener('backButton',()=>{
    if(document.querySelector('#editor').open){closeEditor();return;}
    if(location.hash&&location.hash!=='#home'){location.hash='#home';return;}
    window.Capacitor.Plugins.App.exitApp();
  });
}
