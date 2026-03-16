const fs = require('fs');
const path = require('path');

const queueDir = path.join(__dirname, 'test-queue');
const outputDir = path.join(__dirname, 'test-output');

const tweets = [];
for (let slot = 1; slot <= 5; slot++) {
  const f = path.join(queueDir, `tweet-slot${slot}.json`);
  if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, 'utf-8'));
  const imgFile = d.imageFile || `tweet-slot${slot}.png`;
  const hasImage = fs.existsSync(path.join(outputDir, imgFile));
  tweets.push(Object.assign({}, d, { slot, hasImage, imageFile: hasImage ? imgFile + '?v=' + Date.now() : null }));
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@tryethernal Tweet Pipeline</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#1b2836;font-family:Roboto,sans-serif}
#page{max-width:441px;margin:0 auto;padding-bottom:40px}
#topbar{background:#243447;height:53px;position:sticky;top:0;font-size:17px;padding:15px 13px;box-shadow:0 2px 8px #111a22;z-index:999;color:#fff}
.ss{background:#243447;padding:10px 13px;border-bottom:1px solid #15202a;display:flex;align-items:center;gap:8px}
.ss .bg{background:#1da1f2;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px}
.ss .lb{color:#8a9ba8;font-size:13px}
.td{padding:13px}
.td .u{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.av{width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#3D95CE,#1a1a2e);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;color:#fff;flex-shrink:0}
.avs{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#3D95CE,#1a1a2e);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;flex-shrink:0;z-index:1;position:relative}
.nm{font-size:15px;font-weight:700;color:#fff;display:flex;align-items:center;gap:4px}
.nm svg{width:18px;height:18px;fill:#1da1f2}
.hd{font-size:15px;color:#8a9ba8}
.tx{color:#fff;font-size:23px;line-height:30px;white-space:pre-wrap;word-wrap:break-word;margin-bottom:12px}
.mn{color:#1da2f4}
.td .media{width:100%;border-radius:14px;margin-bottom:12px}
.dt{color:#8a9ba8;font-size:15px;padding:13px 0;border-bottom:1px solid #15202a}
.cb{color:#657786;font-size:11px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px;margin-left:4px;font-family:monospace}
.ib{display:flex;height:46px;align-items:center;border-bottom:1px solid #15202a}
.ib .ic{flex:1;display:flex;align-items:center;justify-content:center}
.ib .ic svg{width:20px;height:20px;fill:#8a9ba8}
.bx{min-height:80px;padding:13px;display:flex}
.bx .ln{flex-shrink:0;width:54px;position:relative;display:flex;flex-direction:column;align-items:center}
.bx .ln .br{position:absolute;left:26px;top:0;bottom:0;width:3px;background:#3d5466}
.bx:last-child .ln .br{display:none}
.bx:last-child{border-bottom:1px solid #15202a}
.bx .ct{flex:1;padding-left:10px;overflow:hidden}
.bx .inf{display:flex;align-items:center;margin-bottom:2px}
.bx .inf .nm{font-size:15px;margin-right:4px}
.bx .inf .nm svg{width:16px;height:16px}
.bx .rt{color:#8a9ba8;font-size:13px;padding:2px 0 4px}
.bx .rtx{color:#fff;font-size:15px;line-height:21px;white-space:pre-wrap;word-wrap:break-word;margin-bottom:8px}
.bx .ri{display:flex;padding-bottom:8px}
.bx .ri .ic{width:21%;display:flex;align-items:center;gap:6px}
.bx .ri .ic svg{width:16px;height:16px;fill:#8a9ba8}
</style>
</head>
<body>
<div id="page">
<div id="topbar"><b>@tryethernal</b></div>
<div id="feed"></div>
</div>
<script>
var T=${JSON.stringify(tweets)};
var V='<svg viewBox="0 0 22 22"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.141.27.587.7 1.086 1.24 1.44s1.167.551 1.813.568c.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.26.27 1.894.14.634-.132 1.22-.438 1.69-.884.445-.47.75-1.055.88-1.69.13-.634.08-1.29-.14-1.898.585-.273 1.084-.704 1.438-1.244.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>';
var iR='<svg viewBox="0 0 24 24"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.25-.862 4.394-2.427 5.862l-8.07 7.57a.75.75 0 0 1-1.024 0l-8.072-7.57C1.8 14.394.938 12.25.938 10h.813z"/></svg>';
var iT='<svg viewBox="0 0 24 24"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg>';
var iL='<svg viewBox="0 0 24 24"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.56-1.13-1.666-1.84-2.908-1.91z"/></svg>';
var iS='<svg viewBox="0 0 24 24"><path d="M8.75 21V3h2v18h-2zM18.75 21V8.5h2V21h-2zM13.75 21v-6h2v6h-2zM3.75 21v-3h2v3h-2z"/></svg>';
function e(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function f(t){return e(t).replace(/@(\\w+)/g,'<span class="mn">@$1</span>')}
var h="";T.forEach(function(t){
var thr=t.thread&&t.thread.length>0;
h+='<div class="ss"><span class="bg">Slot '+t.slot+'</span><span class="lb">'+t.bucket+'</span></div>';
h+='<div class="td"><div class="u"><div class="av">E</div><div><div class="nm">Ethernal '+V+'</div><div class="hd">@tryethernal</div></div></div>';
h+='<div class="tx">'+f(t.hook)+'<span class="cb">'+t.hook.length+'</span></div>';
if(t.hasImage)h+='<img class="media" src="'+t.imageFile+'">';
h+='<div class="dt">Preview</div>';
h+='<div class="ib"><div class="ic">'+iR+'</div><div class="ic">'+iT+'</div><div class="ic">'+iL+'</div><div class="ic">'+iS+'</div></div></div>';
if(thr){h+='<div>';
t.thread.forEach(function(r,i){
h+='<div class="bx"><div class="ln"><div class="br"></div><div class="avs">E</div></div><div class="ct"><div class="inf"><div class="nm">Ethernal '+V+'</div><div class="hd">@tryethernal</div></div>';
h+='<div class="rt">Replying to <span class="mn">@tryethernal</span></div>';
h+='<div class="rtx">'+f(r)+'<span class="cb">'+r.length+'</span></div>';
h+='<div class="ri"><div class="ic">'+iR+'</div><div class="ic">'+iT+'</div><div class="ic">'+iL+'</div><div class="ic">'+iS+'</div></div></div></div>';
});h+='</div>';}});
document.getElementById("feed").innerHTML=h;
<\/script>
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, 'showcase.html'), html);
console.log('Written to', path.join(outputDir, 'showcase.html'));
