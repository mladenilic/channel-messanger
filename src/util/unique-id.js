const uniqueId = () => {
  let shards = new Uint32Array(4);

  crypto.getRandomValues(shards);

  return Array.from(shards).concat([performance.now()]).map(s => s.toString(36)).join('');
}

export default uniqueId;