import { sum, mean } from "../D3 Plotting Functions/D3 Modules";
import { subtract, add, divide, multiply, truncate, abs, sqrt, diff, rep } from "../Functions";
import { type controlLimitsObject, type controlLimitsArgs } from "../Classes";

export default function uprimeLimits(args: controlLimitsArgs): controlLimitsObject {
  const val: number[] = divide(args.numerators, args.denominators);
  const cl: number = sum(args.numerators) / sum(args.denominators);
  const sd: number[] = sqrt(divide(cl,args.denominators));
  const zscore: number[] = divide(subtract(val,cl), sd);

  const consec_diff: number[] = abs(diff(zscore));
  const consec_diff_ulim: number = mean(consec_diff) * 3.267;
  const outliers_in_limits: boolean = args.outliers_in_limits;
  const consec_diff_valid: number[] = outliers_in_limits ? consec_diff : consec_diff.filter(d => d < consec_diff_ulim);
  const sigma: number[] = multiply(sd, mean(consec_diff_valid) / 1.128);

  return {
    keys: args.keys,
    values: val,
    numerators: args.numerators,
    denominators: args.denominators,
    targets: rep(cl, args.keys.length),
    ll99: truncate(subtract(cl, multiply(3,sigma)), {lower: 0}),
    ll95: truncate(subtract(cl, multiply(2,sigma)), {lower: 0}),
    ul95: add(cl, multiply(2,sigma)),
    ul99: add(cl, multiply(3,sigma))
  };
}
