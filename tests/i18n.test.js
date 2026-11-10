import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateMonuments, filterMonuments} from '../core.js';

test('Kazakh catalog preserves IDs and supports searches in both languages', async () => {
  globalThis.location = {search: '?lang=kk'};
  const {localizeRecords, translate, language} = await import('../i18n.js?kazakh-test');
  assert.equal(language, 'kk');
  const records = JSON.parse(await readFile(new URL('../data/monuments.json', import.meta.url)));
  const {valid, errors} = validateMonuments(localizeRecords(records));
  assert.deepEqual(errors, []);
  assert.deepEqual(valid.map(item => item.id), records.map(item => item.id));
  for (const query of ['Шоптыколь', 'Шөптікөл']) {
    assert.equal(filterMonuments(valid, query, '').length, 1);
  }
  assert.equal(translate('Найдено: 13 · Всего в коллекции: 13'), 'Табылды: 13 · Жинақтағы жалпы саны: 13');
  assert.equal(translate('Автор не указан'), 'Авторы көрсетілмеген');
  const legacy = localizeRecords([{...records[0], kk: undefined}])[0];
  assert.equal(legacy.name, records[0].name);
});
