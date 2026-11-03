import test from 'node:test';
import assert from 'node:assert/strict';
import {crc32, createZip, verifyZip} from '../src/zip.mjs';
test('CRC-32 matches standard published check vector', () => assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926));
test('ZIP entries round-trip exact UTF-8 bytes with portable paths and deterministic output', () => {
  const files = [{name: 'report.html', data: Buffer.from('<h1>Calendar</h1>')},
    {name: 'outputs/évidence.json', data: Buffer.from('{"verified":true}')}];
  const zip = createZip(files);
  assert.equal(verifyZip(zip, files), true);
  assert.ok(zip.equals(createZip(files)));
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
});
test('ZIP path traversal and malformed archives are rejected', () => {
  for (const name of ['../secret', '/absolute', 'outputs\\file'])
    assert.throws(() => createZip([{name, data: Buffer.from('x')}]));
  const files = [{name: 'file', data: Buffer.from('content')}], zip = createZip(files);
  zip[0] = 0; assert.throws(() => verifyZip(zip, files));
});
