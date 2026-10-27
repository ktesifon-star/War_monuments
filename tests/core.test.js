import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as wait} from 'node:timers/promises';
import {validateMonuments, filterMonuments, createMarkerIndex, debounce} from '../core.js';
const record = (id = 'one') => ({id, name:'Мемориал Славы', region:'г. Алматы', location:'Алматы, парк', coords:[43.259,76.957], description:'Описание', photo:null});

test('bad record does not hide subsequent valid records', () => {
  const result = validateMonuments([record(), {...record('bad'), coords:null}, record('last')]);
  assert.deepEqual(result.valid.map(x => x.id), ['one', 'last']);
  assert.equal(result.errors.length, 1);
});
test('reject duplicate ids, unsafe photos, missing credits, invalid coordinates and URLs', () => {
  const bad = [
    {...record('nan'), coords:[NaN,76]},
    {...record('reversed'), coords:[76.957,43.259]},
    {...record('outside'), coords:[0,0]},
    {...record('image'), photo:'https://elsewhere.example/photo.jpg'},
    {...record('path'), photo:'images/../secret.png'},
    {...record('credit'), photo:'images/photo.jpg'},
    {...record('source'), sources:['javascript:alert(1)']},
  ];
  assert.equal(validateMonuments([record(),record()]).errors.length,1);
  assert.equal(validateMonuments(bad).errors.length,bad.length);
  assert.equal(validateMonuments({}).errors.length,1);
});
test('valid photo metadata is accepted', () => {
  assert.equal(validateMonuments([{...record(),photo:'images/almaty/photo.webp',photoAuthor:'Автор',photoSource:'Личный архив',photoPermission:'Разрешение получено',sources:['https://example.org/history']}]).errors.length,0);
});
test('search is case independent, handles ё and matches all words in any order', () => {
  const {valid} = validateMonuments([{...record(),name:'Герои — всё помним'},record('second')]);
  assert.equal(filterMonuments(valid,'  ВСЕ   Алматы ','').length,1);
  assert.equal(filterMonuments(valid,'славы Алматы','г. Алматы').length,1);
  assert.equal(filterMonuments(valid,'','Другой регион').length,0);
  assert.equal(filterMonuments(valid,'неизвестно','').length,0);
});
test('1000 markers are reused across filtering; popup content stays lazy', () => {
  const records = validateMonuments(Array.from({length:1000},(_,i)=>record(`m-${i}`))).valid;
  let created = 0;
  let photos = 0;
  const visible = new Set();
  const index = createMarkerIndex({addLayer:x=>visible.add(x),removeLayer:x=>visible.delete(x)}, item => {
    created++;
    return {id:item.id, open:()=>{photos++;}};
  });
  index.sync(records);
  index.sync(records.slice(0,10));
  assert.equal(visible.size,10);
  index.sync(records);
  assert.equal(created,1000);
  assert.equal(photos,0);
  index.get('m-1').open();
  assert.equal(photos,1);
  index.sync([]);
  assert.equal(visible.size,0);
});
test('rapid search inputs cause only one callback; pending work can be cancelled', async () => {
  const calls=[];
  const fn=debounce(value=>calls.push(value),15);
  fn('а');fn('ал');fn('алм');
  await wait(40);
  assert.deepEqual(calls,['алм']);
  fn('cancel');fn.cancel();
  await wait(40);
  assert.deepEqual(calls,['алм']);
});
