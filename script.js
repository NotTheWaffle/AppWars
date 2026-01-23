class Country {
	constructor(n, c) {
		this.name = n;
		this.terrs = new Set(); // set of province id's rather than province object
		this.color = c;
	}

	addTerr(pId) {
		this.terrs.add(pId);
	}

	removeTerr(pId) { // please do not use this in main logic functions
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

// the 2 hashmaps below is the data used for main data transfer
let provinces = new Map(); // province id : province object
let countries = new Map(); // country id : country object

// vector path lookup optimization
let paths = new Map(); // province id : svg path object

let currentCountry = null;
let isPainting = false;

countries.set(1, new Country("Red country", "#FF0000"));
countries.set(2, new Country("Green empire", "#00FF00"));
countries.set(3, new Country("Blue republic", "#0000FF"));


(async function init() {
	const t0 = performance.now();
	await initMap();          // wait until getMapSVG finishes
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
async function initMap() {
	const t0 = performance.now();
	initPaintHandler();
	await fetch("assets/worldmap.svg")
		.then((res) => res.text())
		.then((svg) => {
			gid("map-container").innerHTML = svg;
			enablePanZoom();

			const svgPaths = document.querySelectorAll("#map-group path");

			svgPaths.forEach((p) => {
				const pId = reformatId(p.id);
				provinces.set(pId, new Province(pId));
				paths.set(pId, p);

				p.addEventListener("mouseenter", (e) => {
					gid("hover").innerHTML = `Hovering: ${reformatId(p.id)}`;

					if (isPainting) {
						if (e.ctrlKey) return;
						const pId = reformatId(p.id);

						if (currentCountry === null) {
							gid("message").innerHTML = "No country selected";
							return;
						}

						if (currentCountry === -1) {
							removeProvince(pId);
						} else {
							setProvince(pId, currentCountry);
						}
					}
				});

				p.addEventListener("mouseleave", () => {
					gid("hover").innerHTML = `Hovering: none`;
				});

			});
		});
	console.log(`Map fetched. Took ${performance.now() - t0} ms.`);
	updateMap();

}

function getSave() {
	let nextId = 1;

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

		const curGroup = data["groups"][group];
		const newCountry = new Country(curGroup["label"], color);
		const id = nextId++;
		countries.set(id, newCountry);

		for (const path of curGroup["paths"]) {
			const unpacked = unpackProvinceCode(path);
			for (let p of unpacked) {
				setProvince(p, id);
			}
		}

		console.log(newCountry);
	}

	currentCountry = null;
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
	const svg = getMapSVG();
	if (!svg) {
		console.log("Map not found!");
		return;
	}

	const g = svg.querySelector("#map-group");

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
		if (!e.ctrlKey) {
			isPainting = true;
			return;
		}

		svg.setPointerCapture(e.pointerId);
		drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, tx, ty };

		svg.addEventListener("pointermove", (e) => {
			if (!drag || e.pointerId !== drag.id) return;
			tx = drag.tx + (e.clientX - drag.sx);
			ty = drag.ty + (e.clientY - drag.sy);
			applyTransform();
		});

		svg.addEventListener("pointerup", (e) => {
			isPainting = false;
			if (drag && e.pointerId === drag.id) {
				svg.releasePointerCapture(e.pointerId);
				drag = null;
			}
		});
	});

	svg.addEventListener("pointercancel", () => { drag = null; });

	//svg.addEventListener("dblclick", resetTransform);

	applyTransform();
}

function initPaintHandler() {
	document.addEventListener("pointerup", () => {
		isPainting = false;
	});
}

/* 
-----------------------------
PRIMARY HELPER FUNCTIONS
-----------------------------
*/

function country(id) {
	currentCountry = id;
	if (id === -1) {
		gid("message").innerHTML = "Removing territories";
	} else {
		gid("message").innerHTML =
			`Editing country ${countries.get(id).name}`;
	}
}


function setProvince(pId, parentId) {
	gid("message").innerHTML = `selected ${pId}`;
	console.log(`Setting province: ${pId}`);
	const p = provinces.get(pId);

	try {
		if (p.parent === parentId) {
			return;
		}
	} catch (e) { // if province pId doesn't exist
		console.log(`${pId} unsuccessful.`);
		return;
	}

	// removes province from parent
	if (p.parent !== null) {
		getParent(pId).removeTerr(pId);
	}

	// set the province's parent country to current country object
	p.setParent(parentId);

	// add province to current country object
	getParent(pId).addTerr(pId);

	paint(pId, parentId);
}

function removeProvince(pId) {
	const p = provinces.get(pId);

	if (p.parent !== null) {
		getParent(pId).removeTerr(pId);
	} else { return; }

	p.setParent(null);
	paint(pId, null);

	console.log(`Removed ${pId}`);
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

function getMapSVG() {
	return document.querySelector("#map-container");
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
function paint(pId, parentId) {
	if (parentId == null) {
		paths.get(pId).style.fill = "#EEEEEE";
		return;
	}
	paths.get(pId).style.fill = countries.get(parentId).color;
}
