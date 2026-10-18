/* Dependency-free ZIP (STORE): already-compressed images need no extra deflation.
   UTF-8 names, CRC-32, local headers, central directory and EOCD. */
window.makeZip = async entries => {
  const encoder = new TextEncoder(), parts = [], directory = [];
  const table = Array.from({length:256}, (_, i) => {
    let c = i; for (let k=0;k<8;k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let offset = 0;
  for (const entry of entries) {
    const data = new Uint8Array(await entry.blob.arrayBuffer()), name = encoder.encode(entry.name);
    let crc = 0xffffffff; for (const b of data) crc = table[(crc ^ b) & 255] ^ (crc >>> 8);
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = new Uint8Array(30 + name.length), v = new DataView(local.buffer);
    v.setUint32(0,0x04034b50,true); v.setUint16(4,20,true); v.setUint16(6,0x800,true);
    v.setUint32(14,crc,true); v.setUint32(18,data.length,true); v.setUint32(22,data.length,true);
    v.setUint16(26,name.length,true); local.set(name,30);
    parts.push(local,data);
    const central = new Uint8Array(46+name.length), c = new DataView(central.buffer);
    c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true);
    c.setUint16(8,0x800,true); c.setUint32(16,crc,true); c.setUint32(20,data.length,true);
    c.setUint32(24,data.length,true); c.setUint16(28,name.length,true); c.setUint32(42,offset,true);
    central.set(name,46); directory.push(central); offset += local.length+data.length;
  }
  const length = directory.reduce((n,x)=>n+x.length,0), end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true); e.setUint16(8,entries.length,true); e.setUint16(10,entries.length,true);
  e.setUint32(12,length,true); e.setUint32(16,offset,true);
  return new Blob([...parts,...directory,end],{type:'application/zip'});
};
