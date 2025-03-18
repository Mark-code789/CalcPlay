window.Updates = {
	version: "1.0.0", 
	updatesLog: new Map([
		["1.0.0", ["This the first version of this game, thank you for choosing this app. More updates will come later."]], 
	]), 
	getDescription: function (version) {
		let versionDescription = "<ul>";
		if(!version) {
			for(let [key, value] of this.updatesLog.entries()) {
				if(key >= this.version) {
					versionDescription += `<li>Version: ${key}</li><ul>${value.map(desc => "<li>" + desc + "</li>").join("")}</ul>`;
				} 
			} 
		} 
		else {
			let value = this.updatesLog.get(version);
			value = !value? this.updatesLog.get(Array.from(this.updatesLog.keys())[0]): value;
			versionDescription += value.map(desc => "<li>" + desc + "</li>").join("");
		} 
		versionDescription += "</ul>";
		return versionDescription;
	} 
}