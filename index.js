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
  dct: 'http://purl.org/dc/terms/',
  aio: 'https://archief.io/id/',
  soort: 'https://archief.io/soort#',
  v: 'https://archief.io/veld#',
  rico: 'https://www.ica.org/standards/RiC/ontology#',
  recordType: 'https://www.ica.org/standards/RiC/vocabularies/recordSetTypes#'
  }
});

stream.pipe(jsonParser);

jsonParser.on('data', function (item) { //each object
  if (typeof(item)!="object") { console.error("Error: Array expected as root of JSON file"); process.exit(1); };
  if (!item.GUID) return console.error("Error: Skip item: GUID undefined",item.id || item);
  if (!item.aet) console.warn("Warning: AET undefined",item.id || item);

  // Structuur: https://docs.google.com/drawings/d/1IecmyErKqgqg2S9uEk3ThlvmN8DQ3lR3F_ztq_xsbM8/edit
  const subject = namedNode(`aio:${item.GUID}`);
  
  //rico:recordResourceExtent

  for (const veld in item) {
    if (!item[veld]) continue; //value undefined or empty

    //handle both arrays and single values
    const values = (typeof(item[veld])=="object") ? item[veld] : [item[veld]];

    for (const value of values) {

      if (veld=="relaties") writer.addQuad(subject, namedNode('dct:relation'), namedNode(`aio:${value.rel_adt_id}/${value.ahd_id_rel}`));

      else if (veld=="GUID") continue; //already present as part of the URI
      else if (veld=="parentItem") writer.addQuad(subject, namedNode('rico:includedIn'), namedNode(`aio:${item.parentItem}`));
      else if (veld=="previousItem") writer.addQuad(subject, namedNode('rico:follows'), namedNode(`aio:${item.previousItem}`));
      else if (veld=="aet") writer.addQuad(subject, namedNode('v:aet'), namedNode(`soort:${item.aet}`));

      //else if (item.aet=="abk" && veld=="ov") continue; 
      else if (veld=="na") writer.addQuad(subject, namedNode('rico:title'), literal(value));
      else if (veld=="pe") writer.addQuad(subject, namedNode('rico:date'), literal(value)); //titel in Mais Flexis: "Datering". in uitvoer: "pe" (periode ?)
      else if (veld=="code") writer.addQuad(subject, namedNode('rico:identifier'), literal(value));
      else if (veld=="ov") writer.addQuad(subject, namedNode('rico:recordResourceExtent'), literal(item["ov"])); //instantiationExtent
    
      //default
      else writer.addQuad(subject, namedNode('v:'+veld.replace(/ /g,"_").replace(/\//g,"_")), literal(value));
    }
  }
});



jsonParser.on('end', function() { //end of file
  writer.end();
});

