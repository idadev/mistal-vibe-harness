// Minimal JSON Schema validator (subset used by schema.json): type, enum, required,
// properties, additionalProperties:false, items, $ref to #/definitions/*.
export function validate(value, schema, root = schema, path = "$") {
  const errors = [];
  if (schema.$ref) return validate(value, root.definitions[schema.$ref.split("/").pop()], root, path);
  if (schema.enum) {
    if (!schema.enum.includes(value)) errors.push(`${path}: must be one of ${JSON.stringify(schema.enum)}, got ${JSON.stringify(value)}`);
    return errors;
  }
  const types = [].concat(schema.type ?? []);
  const actual = value === null ? "null" : Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value;
  if (types.length && !types.includes(actual) && !(actual === "integer" && types.includes("number"))) {
    errors.push(`${path}: expected ${types.join("|")}, got ${actual}`);
    return errors;
  }
  if (actual === "object") {
    for (const k of schema.required ?? []) if (!(k in value)) errors.push(`${path}: missing "${k}"`);
    for (const k of Object.keys(value)) {
      if (schema.properties?.[k]) errors.push(...validate(value[k], schema.properties[k], root, `${path}.${k}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property "${k}"`);
    }
  }
  if (actual === "array" && schema.items) value.forEach((v, i) => errors.push(...validate(v, schema.items, root, `${path}[${i}]`)));
  return errors;
}
