export function Override() {
  return (target: Object, propertyKey: string) => {
    const propKey = Object.getOwnPropertyDescriptor(target, propertyKey);

    const methodProps = Reflect.getMetadataKeys(Object.getOwnPropertyDescriptor(target.constructor.prototype, propertyKey));

    console.log(methodProps);
  }
}

export function property(options) {
  return (target, name) => {
    // Note: This is a workaround due to a similar bug described here:
    // https://stackoverflow.com/questions/43912168/typescript-decorators-with-inheritance

    if (!Object.getOwnPropertyDescriptor(target, '_sqtMetadata')) {
      target._sqtMetadata = {}
    }

    if (target._sqtMetadata.properties) {
      target._sqtMetadata.properties[name] = options.type
    } else {
      target._sqtMetadata.properties = { [name]: options.type }
    }

    const parentTarget = Object.getPrototypeOf(target)
    const parentData = parentTarget._sqtMetadata

    if (parentData) {
      if (parentData.properties) {
        Object.keys(parentData.properties).forEach((key) => {
          if (!target._sqtMetadata.properties[key]) {
            target._sqtMetadata.properties[key] = parentData.properties[key]
          }
        })
      }
    }
  }
}
