#!/usr/bin/env node
const fs = require('fs');
const filename = process.argv[2];
if (!filename) return console.log('usage: SCRIPT input.json');
if (!fs.existsSync(filename)) return console.log('File not found: ' + filename);
var contents = fs.readFileSync(filename);
var json = JSON.parse(contents);

var itemsById = [];
var itemsByGUID = [];

for (const item of json) {
  itemsById[item.id] = item;
  itemsByGUID[item.GUID || item.guid] = item;
}

console.log(`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX aio: <http://archief.io/id/>
PREFIX soort: <http://archief.io/soort#>
PREFIX v: <http://archief.io/veld#>
`);

for (const item of json) {
  const guid = item.GUID || item.guid;
  const soort = item.recordType=="%0" ? "abk" : item.recordType;
  const label = JSON.stringify(item.na);
  const bj = item.bj;
  const ej = item.ej;
  const code = item["%0"] ? item["%0"] : "";
  const parentItem = itemsById[item.ahd_id];
  const parentGUID = parentItem ? (parentItem.GUID || parentItem.guid) : "";

  console.log(`aio:${guid}`);
  console.log(`  a soort:${soort} ;`);
  console.log(`  rdfs:label ${label} ;`);
  if (bj) console.log(`  v:beginjaar "${bj}" ;`);
  if (ej) console.log(`  v:beginjaar "${ej}" ;`);
  if (code) console.log(`  v:code "${code}" ;`);
  if (parentGUID) console.log(`  v:parent aio:${parentGUID} ;`);
  console.log(".\n");
}
