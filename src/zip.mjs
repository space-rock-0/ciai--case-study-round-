import {deflateRawSync, inflateRawSync} from 'node:zlib';
const table = Array.from({length: 256}, (_, n) => {
  for (let i = 0; i < 8; i++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
// Standard ZIP32, UTF-8 names, DEFLATE. No shell, package installation or PS policy change.
export function createZip(files) {
  if (files.length > 65535) throw Error('ZIP32 file count exceeded');
  const locals = [], central = []; let offset = 0;
  for (const file of files) {
    if (!file.name || file.name.includes('\\') || file.name.startsWith('/') || file.name.split('/').includes('..'))
      throw Error('Unsafe archive path');
    const name = Buffer.from(file.name, 'utf8'), data = Buffer.from(file.data), packed = deflateRawSync(data);
    if (data.length > 0xffffffff || offset > 0xffffffff) throw Error('ZIP32 size exceeded');
    const checksum = crc32(data), h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x800, 6);
    h.writeUInt16LE(8, 8); h.writeUInt16LE(33, 12); // Deterministic 1980-01-01 DOS date.
    h.writeUInt32LE(checksum, 14); h.writeUInt32LE(packed.length, 18); h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(name.length, 26);
    locals.push(h, name, packed);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(33, 14);
    c.writeUInt32LE(checksum, 16); c.writeUInt32LE(packed.length, 20); c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, name); offset += h.length + name.length + packed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
export function verifyZip(buffer, files) {
  let offset = 0;
  for (const file of files) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) throw Error('ZIP local header missing');
    const size = buffer.readUInt32LE(offset + 18), nameLength = buffer.readUInt16LE(offset + 26);
    const extra = buffer.readUInt16LE(offset + 28), start = offset + 30 + nameLength + extra;
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const data = inflateRawSync(buffer.subarray(start, start + size));
    if (name !== file.name || !data.equals(file.data) || crc32(data) !== buffer.readUInt32LE(offset + 14))
      throw Error('ZIP entry content or checksum mismatch');
    offset = start + size;
  }
  if (buffer.readUInt32LE(offset) !== 0x02014b50 || buffer.readUInt32LE(buffer.length - 22) !== 0x06054b50 ||
      buffer.readUInt16LE(buffer.length - 12) !== files.length) throw Error('ZIP directory invalid');
  return true;
}
