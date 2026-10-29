(function(){var K={"9-general": "31Ds1h1MrDRlPGmHMwEVj62pn6FyLekmPEthKmV12nE", "9-advanced": "YDby9NHJcVZd1wwJ0zQLJVkemO3cI2M70yWl-8s0Pus", "10-general": "C9IIEfoLIsNM-z2eXXkIMC_x_hevUEGm7NKBBVht3BE", "10-advanced": "kiPyJwvJ_t3vgMyS0vDnkzAp31_q0PJnqpApfXnv6iA", "11-general": "Ru7UHhjKekDgai6CRalMBCIoinQBmf9ACHB9TugyzVA", "11-advanced": "zXpjY5Nx-VsrFwNUP2TS566Q2Nu6zCsE7gtocd6gLXg", "12-general": "uM_JBeRLy2Y6hLFRvP6xPYsFriggkc6N4qimuAlgHx8", "12-advanced": "_zohgg_ujVXE07cUX6hgWB4GIyVVRNlictzjMRaKIPQ"};
window.LAUNCH=function(cls,name){var url="https://khalidiya-edu.github.io/g"+cls.grade+"-"+cls.track+"/go.html#k="+K[cls.grade+"-"+cls.track];
 try{localStorage.setItem("rev1.launch",JSON.stringify({name:name,code:cls.code,t:Date.now()}))}catch(e){}
 if(location.search.indexOf("dry")>-1){document.title=url.split("#")[0]+" | "+cls.code;return}
 location.href=url};
/* returning student on this phone: skip the entry screen and open his class at once (?new shows the entry screen: used after "log out") */
var best=null;try{if(location.search.indexOf("new")<0)for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i),m=k&&k.match(/^rev1\.(g[0-9]+-(?:general|advanced))\.me$/);if(m){var me=JSON.parse(localStorage.getItem(k)||"null");if(me&&(me.pid||me.guest||me.name)&&(!best||(me.at||0)>best.at))best={site:m[1],at:me.at||0}}}}catch(e){}
if(best&&K[best.site.slice(1)]){var u="https://khalidiya-edu.github.io/"+best.site+"/go.html#k="+K[best.site.slice(1)];if(location.search.indexOf("dry")>-1){document.title="FAST "+best.site;return}location.replace(u);return}
document.documentElement.dataset.theme="light";W.gate();})();
