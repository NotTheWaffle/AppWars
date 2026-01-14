class Country {
  constructor(n, c) {
    this.name = n;
    this.terrs = new Set(); // set of province id's rather than province 
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
    this.id = id; // path id in the svg file, e.g. Texas_03
    this.parent = null;  // the country object that the province belongs to
  }

  setParent(parent) {
    this.parent = parent;
  }
}

let provinces = new Map(); // province  id : province object
let countries = new Map(); // country id : country object
// made these so countries and provinces will have O(1) lookup times

countries.set(1, new Country("Red country", "#FF0000"));
countries.set(2, new Country("Green empire", "#00FF00"));
countries.set(3, new Country("Blue republic", "#0000FF"));

let currentCountry = 0;
let provinceall = "";

function gid(id) {
  return document.getElementById(id);
}

function country(id) {
  currentCountry = id;
  if (id > 0) {
    gid("message").innerHTML = `Editing country ${countries.get(id).name}`;
  } else {
    gid("message").innerHTML = `Removing territories`;
  }
}

function removeProvince(pId) {
  let p = provinces.get(pId);
  if (p.parent !== null) {
    p.parent.removeTerr(pId);
  }
  p.setParent(null);
}

function setProvince(pId, parentId) {
  let selected = provinces.get(pId);
  gid("message").innerHTML = `selected ${pId}`;
  // if not null: delete province from the current country object that it is in
  if (selected.parent !== null) {
    selected.parent.removeTerr(pId);
  }
  // set the province's country to current country object
  selected.setParent(countries.get(parentId));
  gid("message").innerHTML = `set ${pId} parent to ${selected.parent.name}`;
  // add province to current country object
  selected.parent.addTerr(pId);
}

function getMapSVG() {
  fetch("assets/worldmap.svg").then(res => res.text()).then(svg => {
    gid("map-container").innerHTML = svg;

    const paths = document.querySelectorAll('#map-group path');

    paths.forEach(p => {
      let pId = p.id;
      provinceall = pId;
      provinces.set(pId, new Province(pId));

      p.addEventListener('click', () => {
        pId = p.id;
        gid("message").innerHTML = `selected ${pId}`;
        if (currentCountry < 0) {
          removeProvince(pId);
          console.log("remove");
        } else if (currentCountry > 0) {
          setProvince(pId, currentCountry);
          console.log("add");
        }
        updateMap();
      });
    });
  });
}

function getSave() {
  const str = prompt("Please enter the save code:")
  const data = JSON.parse(str);
  resetMap();
  for (const color in data.groups) {
    //console.log(color);
    const name = data.groups[color].label;
    //console.log(name);
    countries.set(name, new Country(name, color));
    const paths = data.groups[color].paths;
    console.log(paths);
    for (const p in paths) {
      if (provinces.has(p)) {
        setProvince(p, name);
      }
    }
  }
  updateMap();
  console.log("map updated!");
  console.log(countries.get("Grand Principality of Ingria (Ben)"));
}

function resetMap() {
  countries = new Map();
  for (const p of provinces.values()) {
    p.setParent(null);
  }
}

function updateMap() {
  const paths = document.querySelectorAll('#map-group path');
  paths.forEach(p => {
    let pId = p.id;
    let parent = provinces.get(pId).parent;
    console.log(provinces.get(pId));
    if (parent == null) {
      p.style.fill = "#EEEEEE";
    } else {
      console.log("HELLO WORLD");
      console.log(provinces.get(pId).parent.color);
      p.style.fill = provinces.get(pId).parent.color;
    }
  })
}

getMapSVG();
updateMap();
gid("provinces").innerHTML = "";