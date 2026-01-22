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

(async function init() {
	const t0 = performance.now();
	await getMapSVG();          // wait until getMapSVG finishes
	//console.log(provinces);
	console.log(`Init took ${performance.now() - t0} ms.`);
	// TODO: fix it so that clicking on provinces will actually select them
})();

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
			enablePanZoom();

			const svgpaths = document.querySelectorAll("#map-group path");

			svgpaths.forEach((p) => {
				const pId = reformatId(p.id);
				provinces.set(pId, new Province(pId));
				paths.set(pId, p);
				p.addEventListener("click", () => {
					const pId = reformatId(p.id);
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
	if (str === null) {
		return;
	}
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
			console.log(`unpacking: ${path}`);
			const unpacked = unpackProvinceCode(path);
			for (let p of unpacked) {
				setProvince(p, name);
			}
		}
		console.log(newCountry);
	}
	updateMap();
}

// updates the map svg graphic
function updateMap() {
	const t0 = performance.now();
	paths.forEach((p) => {
		const pId = reformatId(p.id);
		const parent = getParent(pId);
		if (parent == null) {
			p.style.fill = "#EEEEEE";
		} else {
			p.style.fill = parent.color;
		}
	});

	console.log(`Map updated. Took ${performance.now() - t0} ms.`);
}

// enable zooming on map
function enablePanZoom() {
	const svg = document.querySelector("#map-container svg");
	if (!svg) {
		console.log("Map not found!");
		return;
	}

	const g = svg.querySelector("#map-group") || svg.documentElement;

	let scale = 1;
	let tx = 0; let ty = 0;
	let drag = null;

	function applyTransform() {
		g.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
	}

	function resetTransform() {
		scale = 3; tx = -1600; ty = -50; applyTransform();
	}

	resetTransform();

	svg.addEventListener("wheel", (e) => {
		e.preventDefault();

		// yeah this zoom logic lowk has confusing ass math lmao

		const rect = svg.getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;
		const delta = -e.deltaY; // get scroll amount
		const zoomFactor = Math.exp(delta * 0.0015); // tweak sensitivity

		const x = (cx - tx) / scale;
		const y = (cy - ty) / scale;
		scale = Math.min(Math.max(scale * zoomFactor, 1.2), 30);
		tx = cx - x * scale;
		ty = cy - y * scale;
		applyTransform();
	}, { passive: false });

	svg.addEventListener("pointerdown", (e) => {
		svg.setPointerCapture(e.pointerId);
		drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, tx, ty };
	});

	svg.addEventListener("pointermove", (e) => {
		if (!drag || e.pointerId !== drag.id) return;
		tx = drag.tx + (e.clientX - drag.sx);
		ty = drag.ty + (e.clientY - drag.sy);
		applyTransform();
	});

	svg.addEventListener("pointerup", (e) => {
		if (drag && e.pointerId === drag.id) {
			svg.releasePointerCapture(e.pointerId);
			drag = null;
		}
	});

	svg.addEventListener("pointercancel", () => { drag = null; });

	//svg.addEventListener("dblclick", resetTransform);

	applyTransform();
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
	console.log(`Setting province: ${pId}`);
	const p = provinces.get(pId);

	try {
		p.parent;
	} catch (e) {
		console.log(`${pId} unsuccessful.`);
		return;
	}

	if (p.parent == parentId) {
		return;
	}

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
	if (p.match("_(\\d+)-(\\d+)") === null) {
		unpacked.push(p);
		return unpacked;
	}
	const base = p.match("(.+_)\\d+-\\d+$")[1];
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

function reformatId(id) {
	return id.replaceAll("_0", "_");
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
