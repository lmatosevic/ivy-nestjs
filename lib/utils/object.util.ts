export class ObjectUtil {
  static transfromKeysAndValues(
    object: any,
    newKey: (key: string, value: any, keyList?: string[]) => string = (key) => key,
    newValue: (key: string, value: any, keyList?: string[]) => any = (key, value) => value,
    mergeKeyValue: (
      key1: string,
      value1: any,
      key2: string,
      value2: any,
      keyList?: string[]
    ) => { key: string; value: any; remove?: boolean } = (key1, value1, key2, value2) => ({
      key: key2,
      value: value2
    }),
    keyList: string[] = []
  ): any {
    if (!object || Object.keys(object).length === 0) {
      return object;
    }
    return Object.keys(object).reduce((acc, key) => {
      let val = object[key];

      if (val && typeof val === 'object' && !Array.isArray(val)) {
        keyList.push(key);
        val = this.transfromKeysAndValues(val, newKey, newValue, mergeKeyValue);
      }

      let newKeyResult = newKey(key, val);
      if (newKeyResult) {
        let newValueResult = newValue(key, val);
        if (Object.keys(acc).includes(newKeyResult)) {
          let { key: resolvedKey, value: resolvedValue } = mergeKeyValue(
            key,
            acc[key],
            newKeyResult,
            newValueResult
          );
          acc[resolvedKey] = resolvedValue;
        } else {
          acc[newKeyResult] = newValueResult;
        }
      }

      keyList.pop();

      return acc;
    }, {});
  }

  static async transfromKeysAndValuesAsync(
    object: any,
    newKey: (key: string, value: any, keyList?: string[]) => Promise<string> = async (key) => key,
    newValue: (key: string, value: any, keyList?: string[]) => Promise<any> = async (key, value) => value,
    mergeKeyValue: (
      key1: string,
      value1: any,
      key2: string,
      value2: any,
      keyList?: string[]
    ) => Promise<{ key: string; value: any; remove?: boolean }> = async (key1, value1, key2, value2) => ({
      key: key2,
      value: value2
    }),
    keyList: string[] = []
  ): Promise<any> {
    if (!object || Object.keys(object).length === 0) {
      return object;
    }

    let acc = {};

    for (let key of Object.keys(object)) {
      let val = object[key];

      if (val && typeof val === 'object' && !Array.isArray(val)) {
        keyList.push(key);
        val = await this.transfromKeysAndValuesAsync(val, newKey, newValue, mergeKeyValue, keyList);
      }

      let newKeyResult = await newKey(key, val, keyList);
      if (newKeyResult) {
        let newValueResult = await newValue(key, val, keyList);
        if (Object.keys(acc).includes(newKeyResult)) {
          let {
            key: resolvedKey,
            value: resolvedValue,
            remove
          } = await mergeKeyValue(key, acc[newKeyResult], newKeyResult, newValueResult, keyList);
          if (remove) {
            delete acc[newKeyResult];
          }
          acc[resolvedKey] = resolvedValue;
        } else {
          acc[newKeyResult] = newValueResult;
        }
      }
      keyList.pop();
    }

    return acc;
  }
}
