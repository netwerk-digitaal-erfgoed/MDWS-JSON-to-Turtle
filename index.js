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

const aiobase = 'https://archief.io/';

// const adt_id = '39'
// to uri-fi id's and ahd_id's we need to bring in adt_id to distinguish
// records with equal id's between different archives.

let prefixes = { 
  aio: aiobase+'id/',
  dct: 'http://purl.org/dc/terms/',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  recordType: 'https://www.ica.org/standards/RiC/vocabularies/recordSetTypes#',
  rico: 'https://www.ica.org/standards/RiC/ontology#',
  soort: aiobase+'soort#',
  v: aiobase+'veld#',
  xsd: 'http://www.w3.org/2001/XMLSchema#'
}

const uriFields = [
  "Auteursrechthouder",
  "Bestand_downloadbaar",
  "bno",
  "CATTWD",
  "CXTWD_PLAATSNAAM",
  "CXTWD_STRAATNAAM",
  "CXTWD_VERVAARDIGER",
  "Deelcollectie",
  "fnc_bestand_intern",
  "fnc_eigendomein",
  "fnc_lic",
  "fnc_vrij_downloaden",
  "Materiaal",
  "Materiaalsoort",
  "Soort_beeldmateriaal",
  "THTWD",
  "THWTW",
  "Uitleg_Auteursrechten",
  "Vervaardiger",
  ];

for (const uriField of uriFields) {
  prefixes[uriField] = aiobase+'def/'+uriField+"#";
}

const writer = new N3.Writer(process.stdout, { end: false, prefixes
});

stream.pipe(jsonParser);

jsonParser.on('data', function (item) { //each object

  for (let veld in item) {    
    safe_veld = veld.replace(/[ \/#]/g,"_");
    if (veld!=safe_veld) {
      item[safe_veld] = item[veld];
      delete item[veld];
    }
  }

  if (typeof(item)!="object") { console.error("Error: Array expected as root of JSON file"); process.exit(1); };
  if (!item.GUID) return console.error("Error: Skip item: GUID undefined",item.id || item);
  if (!item.aet) console.warn("Warning: AET undefined",item.id || item);

  const subject = namedNode(`aio:${item.GUID}`);
  
  for (let veld in item) {
    if (!item[veld]) continue; //value undefined or empty

    //handle both arrays and single values
    const values = (typeof(item[veld])=="object") ? item[veld] : [item[veld]];

    for (const value of values) {

      if (veld=="relaties") {
        if (value.rel_stuk_aet_code!="PAP") { //relatie naar fysieke stukken niet relevant)
          const rel_aet = (value.rel_stuk_aet_code || value.rel_top_aet_code).toLowerCase();
          writer.addQuad(subject, namedNode('dct:relation'), namedNode(`${aiobase}id/${value.rel_adt_id}/${rel_aet}/${value.ahd_id_rel}`));
        }
      }

      else if (uriFields.indexOf(veld)>-1) {
        //Make safe URI field and value
        //Google Sheets formula: // REGEXREPLACE(REGEXREPLACE(REGEXREPLACE((REGEXREPLACE(B92, "[|, ""$/']", "-")), "[().]", "") ,"--","-"),"--","-")
        let uri = value.replace(/[:;|,<>=& "$/']/g, "-").replace(/[().]/g, "").replace(/--/g,"-").replace(/--/g,"-");
        writer.addQuad(subject, namedNode('v:'+veld),namedNode(veld+":"+uri));
      }

      else if (veld=="GUID") continue; //already present as part of the URI
      else if (veld=="parentItem") writer.addQuad(subject, namedNode('rico:includedIn'), namedNode(`aio:${item.parentItem}`));
      else if (veld=="previousItem") writer.addQuad(subject, namedNode('rico:follows'), namedNode(`aio:${item.previousItem}`));
      else if (veld=="aet") writer.addQuad(subject, namedNode('v:aet'), namedNode(`soort:${item.aet}`));

      //type = date
      else if (veld=="bj" || veld=="ej") writer.addQuad(subject, namedNode("v:"+veld), literal(value,{value:"http://www.w3.org/2001/XMLSchema#date"}));

      //RiC-O
      else if (veld=="na") writer.addQuad(subject, namedNode('rico:title'), literal(value));
      else if (veld=="pe") writer.addQuad(subject, namedNode('rico:date'), literal(value)); //titel in Mais Flexis: "Datering". in uitvoer: "pe" (periode ?)
      else if (veld=="code") writer.addQuad(subject, namedNode('rico:identifier'), literal(value));
      else if (veld=="ov") writer.addQuad(subject, namedNode('rico:recordResourceExtent'), literal(item["ov"])); //instantiationExtent
    
      //default literals
      else writer.addQuad(subject, namedNode('v:'+veld), literal(value));
    }
  }
});



jsonParser.on('end', function() { //end of file
  writer.end();
});

