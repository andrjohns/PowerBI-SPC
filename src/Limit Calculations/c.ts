import * as d3 from "d3";
import { rep } from "./HelperFunctions";
import { ControlLimits } from "../Interfaces";

function c_limits(key: string[], value: number[]): ControlLimits {
    let cl: number = d3.mean(value);
    let sigma: number = Math.sqrt(cl);

    let limits: ControlLimits = {
        key: key,
        value: value,
        centerline: cl,
        lowerLimit: rep(Math.max(cl - 3*sigma, 0), key.length),
        upperLimit: rep(cl + 3*sigma, key.length),
        count: null
    }
    return limits;
}

export default c_limits;
