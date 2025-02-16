// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json";

export default {
  input: 'src/index.ts',
  output: {
    format: 'umd',
    name: 'spc',
    file: './.tmp/build/bundle.js'
  },
  plugins: [typescript({
    tsconfig: 'tsconfig.json'
  }), json(), nodeResolve(), commonjs()]
};
