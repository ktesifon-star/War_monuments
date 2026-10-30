import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as wait} from 'node:timers/promises';

let sequence = 0;
function fixture({records, leaflet = true, fail = false}) {
  const stats = {images:0, markers:0, views:[], requests:0};
  const elements = new Map();
  class Element {
    constructor(tag) { this.tagName=tag;this.children=[];this.events={};this.dataset={};this.value=''; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children=children; }
    addEventListener(name, callback) { this.events[name]=callback; }
    scrollIntoView() {}
    set src(value) { stats.images++;this.url=value; }
    replaceWith() {}
  }
  const map = {
    setMinZoom(){}, getBoundsZoom(){return 4;}, fitBounds(){}, closePopup(){}, on(){}, panInsideBounds(){},
    setView(coords,zoom){stats.views.push({coords,zoom});},
  };
  const markerObjects=[];
  const L = {
    map(id, options){stats.options=options;return map;},
    tileLayer(){return {on(){},addTo(){}};},
    layerGroup(){return {addTo(){return this;},addLayer(){},removeLayer(){}};},
    divIcon(options){stats.icon=options;return options;},
    marker(){
      stats.markers++;
      const marker={events:{},on(name,fn){this.events[name]=fn;},openPopup(){throw Error('Leaflet popup must not be used');}};
      markerObjects.push(marker);
      return marker;
    },
  };
  globalThis.document={querySelector(selector){if(!elements.has(selector))elements.set(selector,new Element('div'));return elements.get(selector);},createElement:tag=>new Element(tag)};
  globalThis.Option=class extends Element {constructor(text,value){super('option');this.textContent=text;this.value=value;}};
  globalThis.window={L:leaflet?L:undefined,addEventListener(){}};
  globalThis.location={hash:''};
  globalThis.history={replaceState(a,b,hash){location.hash=hash;}};
  globalThis.fetch=async()=>{stats.requests++;if(fail && stats.requests===1)throw Error('offline');return {ok:true,json:async()=>records};};
  return {stats,elements,markerObjects};
}
const record=i=>({id:`m-${i}`,name:`Мемориал ${i}`,region:'Алматы',location:'Алматы',coords:[43.259,76.957],description:'Описание',photo:'images/photo.jpg',photoAuthor:'Автор',photoSource:'Архив',photoPermission:'Разрешено'});
async function start(options) {
  const f=fixture(options);
  await import(`../script.js?test=${sequence++}`);
  await wait(0);
  return f;
}

test('app loads 65 markers once, pages cards, lazily opens photo and preserves reset/filter behavior',async()=>{
  const {stats,elements,markerObjects}=await start({records:Array.from({length:65},(_,i)=>record(i))});
  assert.equal(stats.markers,65);
  assert.equal(stats.images,0);
  assert.equal(elements.get('#results').hidden,true);
  assert.equal(elements.get('#results').children.length,0);
  assert.equal(elements.get('#show-more').hidden,true);
  markerObjects[0].events.click();
  assert.equal(elements.get('#monument-panel').hidden,false);
  assert.equal(elements.get('#monument-detail').children.length,1);
  elements.get('#close-monument').events.click();
  assert.equal(elements.get('#monument-panel').hidden,true);
  assert.equal(stats.images,1);
  elements.get('#search').value='Мемориал 64';
  elements.get('#search').events.input();
  await wait(220);
  assert.equal(elements.get('#results').hidden,true);
  assert.equal(stats.markers,65);
  assert.equal(stats.images,1);
  elements.get('#search').events.keydown({key:'Enter',preventDefault(){}});
  assert.equal(stats.views.at(-1).zoom,14);
  assert.equal(elements.get('#monument-panel').hidden,false);
  elements.get('#reset-view').events.click();
  assert.equal(elements.get('#search').value,'Мемориал 64');
  assert.equal(stats.options.scrollWheelZoom,true);
  assert.equal(stats.options.maxBoundsViscosity,1);
  assert(stats.icon.html.includes('width="18"'));
});
test('without Leaflet the catalog still opens details and loads photos only on expansion',async()=>{
  const {stats,elements}=await start({records:[record(1)],leaflet:false});
  assert.equal(elements.get('#map').hidden,true);
  assert.equal(stats.images,0);
  const details=elements.get('#results').children[0].children[2];
  details.open=true;details.events.toggle();
  details.events.toggle();
  assert.equal(stats.images,1);
});
test('JSON fetch failure exposes retry and recovers without a page reload',async()=>{
  const {stats,elements}=await start({records:[record(1)],fail:true});
  assert.equal(elements.get('#retry-data').hidden,false);
  await elements.get('#retry-data').events.click();
  assert.equal(stats.requests,2);
  assert.equal(elements.get('#results').hidden,true);
  assert.equal(elements.get('#data-status').hidden,true);
});
test('invalid coordinates are skipped and valid records after them still appear',async()=>{
  const {stats,elements}=await start({records:[record(1),{...record(2),coords:null},record(3)]});
  assert.equal(stats.markers,2);
  assert.equal(elements.get('#result-count').textContent,'Найдено: 2 · Всего в коллекции: 2');
  assert.equal(elements.get('#data-status').hidden,false);
});
