
export async function promisePool<T>(
     items: T[],
     mapper: (item: T) => Promise<void>,
     concurrency: number
) {
     const executing: Promise<void>[] = [];
     for (const item of items) {
          const p = mapper(item).then(() => {
               executing.splice(executing.indexOf(p), 1);
          });
          executing.push(p);
          if (executing.length >= concurrency) {
               await Promise.race(executing);
          }
     }
     await Promise.all(executing);
}