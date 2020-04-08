#!/usr/bin/env node
//usage: $ ./index.js INPUT.txt
const fs = require('fs');
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const filename = process.argv[2];
if (!filename) return console.log('usage: SCRIPT input.json');
if (!fs.existsSync(filename)) return console.log('File not found: ' + filename);

const stream = fs.createReadStream(filename); //, {encoding: 'utf8'}),
const jsonParser = require('JSONStream').parse('*');

const writer = new N3.Writer(process.stdout, { end: false, prefixes: { 
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  aio: 'https://archief.io/id/',
  soort: 'https://archief.io/soort#',
  v: 'https://archief.io/veld#'}
});

stream.pipe(jsonParser);

jsonParser.on('data', function (item) { //each object

  if (!item.GUID) return console.error("Error: Skip item: GUID undefined",item.id || item);
  if (!item.aet) console.warn("Warning: AET undefined",item.id || item);

  const subject = namedNode(`aio:${item.GUID}`);

  if (item.aet) writer.addQuad(subject, namedNode('rdf:type'), namedNode(`soort:${item.aet}`));
  writer.addQuad(subject, namedNode('rdfs:label'), literal(item.na || "?"));

  if (item.parentItem) writer.addQuad(subject, namedNode('v:parent'), namedNode(`aio:${item.parentItem}`));

  for (const veld in item) {
    if (!item[veld]) continue; //value undefined or empty
    if (veld=="parentItem") continue; //already present as v:parent
    if (veld=="na") continue; //already present as rdfs:label
    if (veld=="aet") continue; //already present as rdf:type soort:...
    if (veld=="GUID") continue; //already present as part of the URI
    writer.addQuad(subject, namedNode('v:'+veld.replace(/ /g,"_").replace(/\//g,"_")), literal(item[veld]));
  }  
});

jsonParser.on('end', function() { //end of file
  writer.end();
});

