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
  const soort = item.recordType=="%0" ? "abk" : item.recordType;
  const label = item.na;
  const bj = item.bj;
  const ej = item.ej;
  const code = item["%0"] ? item["%0"] : "";
  const parent = itemsById[item.ahd_id];

  const sub = namedNode(`aio:${item.GUID}`);
  writer.addQuad(sub, namedNode('rdf:type'), namedNode(`soort:${soort}`));
  writer.addQuad(sub, namedNode('rdfs:label'), literal(label));
  if (bj) writer.addQuad(sub, namedNode('v:beginjaar'), literal(bj));
  if (ej) writer.addQuad(sub, namedNode('v:eindjaar'), literal(ej));
  if (code) writer.addQuad(sub, namedNode('v:code'), literal(code));
  if (parent && parent.GUID) writer.addQuad(sub, namedNode('v:parent'), namedNode(`aio:${parent.GUID}`));
}

writer.end((error, result) => console.log(result));

