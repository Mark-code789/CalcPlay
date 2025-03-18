window.onload = async function () {
	if("serviceWorker" in navigator) {
		window.reg = null;
		navigator.serviceWorker.onmessage = (e) => console.log(e.data);
		reg = await navigator.serviceWorker.register("./service worker.js");
			
		reg.addEventListener("updatefound", () => {
			if(reg.installing) {
				reg.installing.addEventListener("statechange", () => {
					if(reg.waiting)
						invokeSWUpdateFlow();
				});
			} 
		});
		
		let refreshing = false;
		navigator.serviceWorker.addEventListener("controllerchange", (e) => {
			if(!refreshing) {
				location.reload();
				refreshing = true;
			} 
		});
		
		if(App.deferredEvent && reg) 
			$(".install").addClass("show_install_prompt");
	} 
	else {
    	alert("OFFLINE REGISTRATION FAILURE\n\nCan't Register an offline version of this game because your browser don't support this capability. However you can still access it only while online. If you however really need the offline version, try: \n\n1. Update your browser. or\n2. try another browser, preferably chrome.");
    } 
    
	$('select').change((event) => Game.select(event));
	$('select').click((event) => Game.selectClick(event));
	$('button:not(.install-btn)').click((event) => Game.btnClick(event));
	$('.install-btn').click((event) => App.install());
	$(window).on('keyup', (event) => Game.keyUp(event));
} 

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    App.deferredEvent = e;
    
    if($("main").css("display") == "grid")
    	$(".install").addClass("show_install_prompt");
});

async function invokeSWUpdateFlow () {
	let versionDescription = await Updates.getDescription();
	let version = Updates.version;
	if(version == "1.0.0")
		return swal({
			title: "Calculator Game", 
			content: $(versionDescription)[0]
		});
		
	let update = await swal({ 
		title: "APP UPDATE", 
		content: $("<label>Thank you for using Calculator Game App.<br>There is a new version of this app. All you need is to refresh.<br>New version: " + version + "</label><span>What's New?</span>" + versionDescription + "<label style='display: block; text-align: left;'>Do you want to update?</label>")[0], 
		buttons: ["Later", "Update"]
	});
	
	if(update) {
		swal({
			title: "Updating Checkers...",
			text: "Please Wait as we update the app. This may take a few seconds depending n the speed of your bandwidth.", 
			colseOnClickOutside: false, 
			buttons: [false, false], 
		});
		await reg.waiting.postMessage({type: "skip-waiting"});
	} 
	else {
		swal("App update declined.");
		if(App.deferredEvent) 
			$(".install").addClass("show_install_prompt");
	} 
} 

class App {
	static deferredEvent = null;
	static hideInstallPrompt (event) {
	    $(".install").removeClass("show_install_prompt");
	} 
	
	static async install () {
		this.hideInstallPrompt();
	    this.deferredEvent.prompt();
	    const {outcome} = await this.deferredEvent.userChoice;
	    if(outcome === 'accepted') {
	        swal("Installation successfully");
	    } 
	    else {
	        swal("Installation canceled");
	    } 
		this.deferredEvent = null;
	} 
}  

class Game {
	level = 1;
	range = 10;
	rangeId = 0;
	points = 0;
	questions = 0;
	failed = 0;
	passed = 0;
	consecutiveFails = 0;
	record = 0;
	records = {};
	answer = null;
	
	timer = {
		time: 500,
		elem: null, 
		interval: null, 
		stopped: false, 
		
		getTime: () => {
			let time = 0;
			if(this.level == 1) 
				time = (this.rangeId + 2) * 1000 + 6000;
			else if(this.level == 2) 
				time = (this.rangeId + 1) * 1000 + 4000;
			else if(this.level == 3) 
				time = (this.rangeId + 0) * 1000 + 2000;
				
			return time;
		}, 
		convert: () => {
			return String(Math.floor(this.timer.time / 1000)).padStart(2, '0') + ':' +
				   String(this.timer.time % 1000).padStart(3, '0'); 
		}, 
		start: () => {
			if(this.timer.stopped)
				return true;
				
			return new Promise((resolve) => {
				this.timer.stopped = false;
				this.timer.time = this.timer.getTime();
				
				this.timer.elem = $(".count div:first-of-type");
				this.timer.elem.text("Time left: " + this.timer.convert());
				
				clearInterval(this.timer.interval);
				
				let start = Date.now();
				this.timer.interval = setInterval (() => {
					let elapsed = Date.now() - start;
					this.timer.time -= elapsed;
					
					start = Date.now();
					this.timer.elem.text("Time left: " + this.timer.convert());
					
					if(this.timer.time <= 0) {
						this.timer.time = 0;
						this.timer.elem.text("Time left: " + this.timer.convert());  
						clearInterval(this.timer.interval);
						resolve(this.timer.stopped);
					}
				});
			});
		},
		stop: () => {
			this.timer.stopped = true;
			this.timer.time = 0;
		} 
	} 
	
	constructor (level, range, rangeId) {
		this.level = level;
		this.range = range;
		this.rangeId = rangeId;
		
		let records = localStorage && localStorage.getItem("cg-records");
		this.records = records && JSON.parse(records) || {};
		this.record = this.records[level + "-" + range];
	} 
	
	generateQuestion () {
		let sign = this.level == 1 && "+" ||
				   this.level == 2 && "+-" ||
				   this.level == 3 && "+-/*" || "";
					
		if(!sign) return;
		
		sign = sign.charAt(Math.floor(Math.random() * sign.length)); 
		
		let min = sign == '/'? 1: 0;
		let a = Math.round(Math.random() * (this.range - min) + min);
		let b = Math.round(Math.random() * this.range);
		
		this.answer = eval(a + sign + b);
		
		$(".question").text(a + ' ' + sign.replace('*', '×').replace('/', '÷') + ' ' + b + ' = ?');
	} 
	
	async next () {
		let answer = $('.question').text().split('=')[1].trim();
		let audio;
		
		if(Number(answer).toFixed(4) == this.answer.toFixed(4)) {
			this.consecutiveFails = 0;
			this.passed++;
			this.points += 10;
			audio = "right";
		} 
		else {
			this.consecutiveFails++;
			this.failed++;
			this.points = Math.max(this.points - 10, 0);
			audio = "wrong";
			navigator.vibrate([100, 50, 100]);
		}
		
		this.questions++;
		
		let elems = $(".middle h2, .count div:last-of-type, .success div");
		
		elems.eq(0).html("Points: " + this.points); 
		elems.eq(1).text("Questions: " + this.questions);
		elems.eq(2).text(this.passed + " :Passed");
		elems.eq(3).text(this.failed + " :Failed");
		
		if(this.consecutiveFails > 2) {
			audio = "over";
			
			this.timer.stop();
			swal({
				title: "Game Over", 
				text: "You've failed 3 questions consecutively.", 
				closeOnClickOutside: false, 
			}); 
		} 
		
		this.start();
		Game.audioPlayer.play(audio);
	} 
	
	async start (clicked = false) {
		if(clicked) {
			Game.audioPlayer.play("pop");
			
			let start = await swal({
				title: "New Game", 
				content: $("<p>Each question will take " + (this.timer.getTime() / 1000) + " seconds." +
					(this.level == 3? "<br/>Please round off decimal numbers to the nearest 4 decimals places</p>": "</p>"))[0],
				buttons: [true, "Start"]
			});
			
			if(!start)
				return false;
				
			let currentRecord = this.records[this.level + "-" + this.range] || "";
			
			let elems = $(".middle h2, .middle h3, .count div:last-of-type, .success div");
			elems.eq(0).text("Points: " + this.points); 
			elems.eq(1).text(currentRecord? "Current Record: " + currentRecord: "");
			elems.eq(2).text("Questions: " + this.questions);
			elems.eq(3).text(this.passed + " :Passed");
			elems.eq(4).text(this.failed + " :Failed");
			
			$("button[value='start'], select").addClass('disabled');
			$("button[value='stop'], button[value='next']").removeClass('disabled');
			
			this.timer.stopped = false;
		} 
		
		this.generateQuestion();
		let stopped = await this.timer.start();
		if(!stopped) {
			this.next();
			return true;
		} 
			
		let currentRecord = this.records[this.level + "-" + this.range] || 0;
		let newRecord = Math.max(currentRecord, this.points);
		this.records[this.level + "-" + this.range] = newRecord;
		localStorage && localStorage.setItem("cg-records", JSON.stringify(this.records));
		$(".question").text("");
		$(".middle h3").text(newRecord? (currentRecord < newRecord? "New Record: ": "Current Record: ") + newRecord: "");
		$("button[value='start'], select").removeClass('disabled');
		$("button[value='stop'], button[value='next']").addClass('disabled');
	} 
	
	stop () {
		this.timer.stop();
	} 
	
	input (key) {
		let elem = $(".question");
		let text = elem.text();
		
		if(!text)
			return;
		
		elem.text(text.replace("?", "") + key);
	} 
	
	del () {
		let elem = $(".question");
		let text = elem.text();
		text = text.slice(0, -1); 
		
		if(!text)
			return;
		
		if(!text.split("=")[1].trim())
			text += "?";
			
		elem.text(text);
	} 
	
	static game = null;
	static rangeId = 0;
	static range = 10;
	static level = 1;
	
	static select (event) {
		let value = $(event.target).val();
		
		if(value > 3) {
			this.range = value;
			this.rangeId = $(event.target).children(`[value="${value}"]`).index();
		} 
		else {
			this.level = value;
		} 
	} 
	
	static selectClick (event) {
		this.audioPlayer.play('click');
	} 
	
	static btnClick (event) {
		let value = $(event.target).attr('value');
		
		switch (value) {
			case "start":
				this.game = new Game(this.level, this.range, this.rangeId);
				let started = this.game.start(true);
				this.game = started? this.game: null;
				break;
				
			case "stop":
				this.audioPlayer.play('click');
				if(this.game)
					this.game.stop();
					
				this.game = null;
				break;
				
			case "delete":
				this.audioPlayer.play('click');
				if(this.game)
					this.game.del();
				break;
				
			case "next":
				if(this.game)
					this.game.next();
				break;
				
			case "mute":
				this.audioPlayer.play('click');
				this.audioPlayer.muted = !this.audioPlayer.muted;
				$(event.target).toggleClass("off");
				break;
				
			default:
				this.audioPlayer.play('click');
				if(this.game)
					this.game.input(value);
				break;
		} 
	}  
	
	static keyUp (event) {
		let key = event.key;
		
		if(/[0-9\.\-]/i.test(key)) {
			this.audioPlayer.play('click');
			if(this.game)
				this.game.input(key);
		} 
		else if(/Delete|Backspace/i.test(key)) {
			this.audioPlayer.play('click');
			if(this.game)
				this.game.del();
		} 
		else if(key == "Enter" && this.game) {
			this.game.next();
		} 
		else if(key == " ")
			if(this.game) {
				this.audioPlayer.play('click');
				this.game.stop();
				this.game = null;
			} 
			else {
				this.game = new Game(this.level, this.range, this.rangeId);
				let started = this.game.start(true);
				this.game = started? this.game: null;
			} 
	} 
	
	static audioPlayer = {
		audio: null, 
		muted: false, 
		init: () => {
			this.audioPlayer.right = new Audio("./src/audio/right beep.mp3");
			this.audioPlayer.wrong = new Audio("./src/audio/wrong beep.mp3");
			this.audioPlayer.over = new Audio("./src/audio/game over.mp3");
			this.audioPlayer.click = new Audio("./src/audio/click.mp3");  
			this.audioPlayer.pop = new Audio("./src/audio/pop.mp3"); 
			
			this.audioPlayer.right.volume = 0;
			this.audioPlayer.right.play();
			this.audioPlayer.wrong.volume = 0;
			this.audioPlayer.wrong.play();
			this.audioPlayer.over.volume = 0;
			this.audioPlayer.over.play();
			this.audioPlayer.click.volume = 0;
			this.audioPlayer.click.play();
			this.audioPlayer.pop.volume = 0;
			this.audioPlayer.pop.play();
		}, 
		play: (type) => {
			try {
				if(this.audioPlayer.audio) 
					this.audioPlayer.audio.pause();
					
				this.audioPlayer.audio = this.audioPlayer[type];
				
				if(!this.audioPlayer.audio) 
					return this.audioPlayer.init();
					
				this.audioPlayer.audio.muted = this.audioPlayer.muted;
				this.audioPlayer.audio.currentTime = 0;
				this.audioPlayer.audio.volume = 1;
				this.audioPlayer.audio.play();
			} catch () {}
		}, 
	}  
}