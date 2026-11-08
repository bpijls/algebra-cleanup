/* The node-type registry. Every kind of factor (number, letter, bracket, root …) is one object with the same
   contract, so the generic operations (clone, key, merge, walk, evaluate) never switch on the kind:

   KIND = {
     k,                       // the tag in node.k
     clone(f),                // a deep copy with fresh ids
     key(f),                  // equal keys: the same piece (order of terms and factors doesn't matter)
     canMerge(x, y),          // x · y can become one piece of this kind (y has the same kind)
     merge(x, y),             // that piece
     terms(f),                // the sum inside it that holds tiles of its own (a bracket, a root), else null
     has(f, b),               // it contains the letter b
     eval(f, env, evalTerms), // its value with the letters in env
   }

   A new kind (log, sin, π …) is a new file in this folder that calls defineKind, plus its renderers
   (render/text.js and the tiles in ui.js): nothing else has to switch on it. */
export const KINDS = {};
export const defineKind = spec => { KINDS[spec.k] = spec; return spec; };
export const kindOf = f => {
  const K = KINDS[f.k];
  if (!K) throw new Error(`unknown kind of node: ${f.k}`);
  return K;
};

let uid = 1;
export const nid = () => uid++;
