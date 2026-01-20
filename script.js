class Country {
	constructor(n, c) {
		this.name = n;
		this.terrs = new Set(); // set of province id's rather than province object
		this.color = c;
	}

	addTerr(pId) {
		this.terrs.add(pId);
	}

	removeTerr(pId) {
		this.terrs.delete(pId);
	}
}

class Province {
	constructor(id) {
		this.id = id; // path id in the svg file, e.g. Texas_3
		this.parent = null; // the country id (string) that the province belongs to
	}

	setParent(parent) {
		this.parent = parent;
	}
}

// the 2 objects below is the data used for main data transfer
let provinces = new Map(); // province id : province object
let countries = new Map(); // country id : country object

// vector path lookup optimization
let paths = new Map(); // province id : svg path object

countries.set(1, new Country("Red country", "#FF0000"));
countries.set(2, new Country("Green empire", "#00FF00"));
countries.set(3, new Country("Blue republic", "#0000FF"));

let currentCountry = 0;
let provinceall = "";

getMapSVG();
console.log(provinces);


/* 
---------------------
MAIN LOGIC FUNCTIONS
---------------------
*/

// retrieves map SVG object once the page loads
async function getMapSVG() {
	const t0 = performance.now();
	await fetch("assets/worldmap.svg")
		.then((res) => res.text())
		.then((svg) => {
			gid("map-container").innerHTML = svg;

			const svgpaths = document.querySelectorAll("#map-group path");

			svgpaths.forEach((p) => {
				const pId = p.id.replace("_0", "_");
				provinceall = pId;
				provinces.set(pId, new Province(pId));
				paths.set(pId, p);
                //console.log(pId);

				p.addEventListener("click", () => {
					const pId = p.id.replace("_0", "_");
					gid("message").innerHTML = `selected ${pId}`;
					if (currentCountry < 0) {
						removeProvince(pId);
					} else if (currentCountry > 0) {
						setProvince(pId, currentCountry);
					}
				});
			});
		});
    console.log(`Map fetched. Took ${performance.now() - t0} ms.`);
    updateMap();
}

function getSave() {
	const str = prompt("Please enter the save code from MapChart:");
	const data = JSON.parse(str);
	resetMap();
	for (let group in data.groups) {
		console.log(group);
		let color = group;
		if (group.includes("_")) {
			const match = group.match("_(.*?)_");
			console.log("diagonal matched " + match);
			color = match[1];
			color = "#" + color;
		}

		const name = data.groups[group].label;
		const newCountry = new Country(name, color);
		const paths = data.groups[group].paths;
        
		countries.set(name, newCountry);
		for (const path of paths) {
			console.log(path);
			const unpacked = unpackProvinceCode(path);
			for (let p of unpacked) {
				console.log(p);
				setProvince(p, name);
			}
		}
		console.log(newCountry);
	}
	updateMap();
	console.log("map updated!");
}

// updates the map svg graphic
function updateMap() {
	const t0 = performance.now();
	paths.forEach((p) => {
		const pId = p.id.replace("_0", "_");
		const parent = getParent(pId);
		if (parent == null) {
			p.style.fill = "#EEEEEE";
		} else {
			p.style.fill = parent.color;
		}
	});

	console.log(`Map updated. Took ${performance.now() - t0} ms.`);
}


/* 
-----------------------------
PRIMARY HELPER FUNCTIONS
Larger helper functions that are called
only once or twice.
-----------------------------
*/ 

function country(id) {
	currentCountry = id;
	if (id > 0) {
		gid("message").innerHTML = `Editing country ${countries.get(id).name}`;
	} else {
		gid("message").innerHTML = `Removing territories`;
	}
}

function setProvince(pId, parentId) {
	gid("message").innerHTML = `selected ${pId}`;
	const p = provinces.get(pId);

	if (p.parent == parentId) {
		return;
	}

	console.log(pId + " selected ");
    
    // removes province from parent
	if (p.parent !== null) {
		getParent(pId).removeTerr(pId);
	}

	// set the province's parent country to current country object
	p.setParent(parentId);
	gid("message").innerHTML = `set ${pId} parent to ${p.parent}`;

	// add province to current country object
	getParent(pId).addTerr(pId);

	draw(pId, parentId);
}

function removeProvince(pId) {
	const p = provinces.get(pId);
	if (p.parent !== null) {
		getParent(pId).removeTerr(pId);
	}
	p.setParent(null);

	draw(pId, null);
}

// returns a list of province id's based on province code from the MapChart JSON
function unpackProvinceCode(p) {
	let unpacked = [];
	if (!p.includes("-")) {
		unpacked.push(p);
		return unpacked;
	}
	const base = p.match("(.+?_)\\d")[1];
	const match = p.match("_(\\d+)-(\\d+)");
	const lower = Number(match[1]);
	const upper = Number(match[2]);

	for (let i = lower; i <= upper; i++) {
		unpacked.push(base + i);
	}

	return unpacked;
}


/* 
---------------------
SECONDARY HELPER FUNCTIONS
---------------------
*/ 

function gid(id) {
	return document.getElementById(id);
}

// gets the parent country object based on province id
function getParent(pId) {
	//console.log("getting parent: " + provinces.get(pId).parent);
	if (provinces.get(pId).parent !== null) {
		return countries.get(provinces.get(pId).parent);
	}
	return null;
}

function resetMap() {
	countries = new Map();
	for (const p of provinces.values()) {
		p.setParent(null);
	}
}

// updates a single province path
function draw(pId, parentId) {
	if (parentId == null) {
		paths.get(pId).style.fill = "#EEEEEE";
		return;
	}
	paths.get(pId).style.fill = countries.get(parentId).color;
}

function sleep(ms) {

}
