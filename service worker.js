// Service worker
const version = "1";
const cacheName = "cp-v:" + version;
const appShellFiles = [
	"./src/images/delete.png",
    "./src/images/play.png",
    "./src/images/stop.png",
    "./src/images/favicon.ico",
    "./src/images/favicon16.png",
    "./src/images/favicon32.png",
    "./src/images/favicon96.png",
    "./src/audio/click.mp3",
	"./src/audio/pop.mp3", 
	"./src/audio/game over.mp3", 
	"./src/audio/right beep.mp3",
	"./src/audio/wrong beep.mp3", 
	"./src/scripts/jquery/jquery.min.js",
	"./src/scripts/sweetalert/sweetalert.min.js",
	"./src/scripts/index.js",
	"./src/styles/index.css",
	"./manifest.webmanifest",
	"./index.html",
];

self.addEventListener("install", (e) => {
	const addFiles = (cache) => {
	    const stack = [];
	    appShellFiles.forEach((file) => stack.push(
	        cache.add(file).catch( _ => console.error(`can't load ${file} to cache`))
	    ));
	    return Promise.all(stack);
	};
	
    e.waitUntil(
        /* caches.open(cacheName).then((cache) => {
            return cache.addAll(appShellFiles);
        }) */
        caches.open(cacheName).then(addFiles) 
    )
});

self.addEventListener("fetch", (e) => {
    e.respondWith(
        caches.match(e.request.url.replace(/Checkers\/$/i, t => t + "index.html"), {cacheName, ignoreSearch: true}).then( async (res) => {
        	if(res && !/(updates.js|\.css.*)$/gi.test(e.request.url)) {
            	return res;
            }
            
            return fetch(e.request).then((res2) => {
            	if(res2.status != 200) {
	            	return res || res2;
            	} 
            	
                return caches.open(cacheName).then((cache) => {
                    cache.put(e.request.url.split("?")[0], res2.clone());
                    return res2;
                }).catch((error) => {
					return res2;
				});
            }).catch((error) => {
            	//console.log(e.request.url);
            	return res || new Response(null, {"status": 200});
            });
        })
    )
});

self.addEventListener("activate", (e) => {
    const keepList = [cacheName];
    
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if(keepList.indexOf(key) === -1) {
                    return caches.delete(key);
                } 
            }))
        })
    )
});

self.addEventListener("message", async (e) => {
	if(e.data && e.data.type == "skip-waiting") {
		self.skipWaiting();
	} 
	else if(e.data && e.data.type == "move-search") {
		sendMsg(e.data.content);
		await searchMove(e.data.content);
	} 
});

function sendMsg(msg) {
	self.clients.matchAll({type: 'window'}).
	then((clients) => {
		for(let client of clients) {
			client.postMessage(msg);
		} 
	});
} 

