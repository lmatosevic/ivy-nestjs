export class MapUtil {
  static async batchMap<T>(
    array: any[],
    mapFn: (chunk: any[]) => any[],
    chunkSize: number = 1000
  ): Promise<T[]> {
    const mapped: T[] = [];

    function processChunk(i: number, cb: (data: T[]) => void): void {
      if (i >= array.length) {
        cb(mapped);
        return;
      }

      mapped.push(...mapFn(array.slice(i, i + chunkSize)));

      setImmediate(processChunk.bind(null, i + chunkSize, cb));
    }

    return new Promise((resolve) => {
      processChunk(0, resolve);
    });
  }
}
