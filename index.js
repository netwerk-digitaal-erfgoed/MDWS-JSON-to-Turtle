#!/usr/bin/env node
//usage: $ ./index.js INPUT.txt
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

const fs = require('fs');
const filename = process.argv[2];
if (!filename) return console.log('usage: SCRIPT input.json');
if (!fs.existsSync(filename)) return console.log('File not found: ' + filename);
var contents = fs.readFileSync(filename);
var json = JSON.parse(contents);

//Het veld GUID komt afwisselend voor uppercase/lowercase in de MDWS Uitvoer
//Ook ontbreekt dit veld soms terwijl deze in de database wel aanwezig is.
//Onderstaande geeft een warning en bij een ontbrekende GUID en maakt er uppercase van
for (const item of json) {
  item.GUID = item.GUID || item.guid;
  delete item.guid;
  if (!item.GUID) console.warning("Ontbrekende GUID voor record",item.id);
}

//maak een index om item op id of op GUID te kunnen ophalen
var itemsById = [];
var itemsByGUID = [];
for (const item of json) {
  itemsById[item.id] = item;
  itemsByGUID[item.GUID] = item;
}

const writer = new N3.Writer({ prefixes: { 
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  aio: 'http://archief.io/id/',
  soort: 'http://archief.io/soort#',
  v: 'http://archief.io/veld#',
}});

for (const item of json) {
  const code = item["%0"] ? item["%0"] : "";
  const parent = itemsById[item.ahd_id];

  const subject = namedNode(`aio:${item.GUID}`);
  writer.addQuad(subject, namedNode('rdf:type'), namedNode(`soort:${item.aet}`));
  writer.addQuad(subject, namedNode('rdfs:label'), literal(item.na));
  if (parent && parent.GUID) writer.addQuad(subject, namedNode('v:parent'), namedNode(`aio:${parent.GUID}`));

  for (const veld in item) {
    if (!item[veld]) continue; //value undefined or empty
    if (veld=="na") continue; //since item.na is already present as rdfs:label
    if (veld=="aet") continue; //since item.aet is already present as rdf:type soort:...
    if (veld=="GUID") continue; //since item.GUID is already present as part of the URI
    writer.addQuad(subject, namedNode('v:'+veld.replace(" ","_")), literal(item[veld]));
  }  
}

writer.end((error, result) => console.log(result));

