import { ToolTips, ControlLimits } from "../src/Interfaces";

function getTooltips(data_type: string, limitsArray: ControlLimits,
                     numerator_values: number[], denominator_values: number[],
                     key_values: string[], prop_limits: boolean): ToolTips[][] {

    var val_name: string;
    if(data_type == "xbar") {
        val_name = "Group Mean"
    } else if(data_type == "s") {
        val_name = "Group SD"
    } else if(data_type == "c") {
        val_name = "Count"
    } else if(data_type == "t") {
        val_name = "Time"
    } else if(data_type == "g") {
        val_name = "Non-Events"
    } else if(data_type == "i" ||
              data_type == "run") {
        if(denominator_values.length == 0){
            val_name = "Observation"
        } else {
            val_name = "Ratio"
        }
    } else if(data_type == "mr") {
        if(denominator_values.length == 0){
            val_name = "Moving Range"
        } else {
            val_name = "Moving Range of Ratios"
        }
    } else if(data_type == "p" ||
              data_type == "pp") {
        val_name = "Proportion"
    } else {
        val_name = "Rate"
    }

    var inc_numdem: boolean = (data_type != "xbar" && data_type != "s" &&
                               data_type != "t" && data_type != "g" &&
                               data_type != "c" &&
                               !((data_type == "i" || data_type == "mr" || data_type == "run") && denominator_values.length == 0));

    let { key, value, centerline, upperLimit99, lowerLimit99, count } = limitsArray;
    return Array.apply(null, Array(key.length)).map(
        (d,i) => {
            let ind: number = key_values.indexOf(<string>key[i]);
            let base: ToolTips[] =  [{
                    displayName: (data_type == "t" || data_type == "g") ? "Event #:" : "Date:",
                    value: (data_type == "t" || data_type == "g") ? (i+1).toFixed(0) : <string>key[i]
                },{
                    displayName: val_name + ":",
                    value: (value[i] == null) ? "" : (prop_limits ? (<number>value[i] * 100).toFixed(2) + '%' : (<number>value[i]).toFixed(2))
                }];
            if (value[i] === null && upperLimit99[i] === null && lowerLimit99[i] === null) {
                return base;
            }
            if(data_type != "run") {
                base = base.concat([{
                    displayName: "Upper 99% Limit",
                    value: (prop_limits ? (<number>upperLimit99[i] * 100).toFixed(2) + '%' : (<number>upperLimit99[i]).toFixed(2))
                },{
                    displayName: "Lower 99% Limit",
                    value: (prop_limits ? (<number>lowerLimit99[i] * 100).toFixed(2) + '%' : (<number>lowerLimit99[i]).toFixed(2))
                }])
            }
            if(inc_numdem && numerator_values != null && denominator_values != null) {
                base = base.concat(
                    [{
                        displayName: "Numerator:",
                        value: (<number>numerator_values[ind]).toFixed(2)
                    },{
                        displayName: "Denominator:",
                        value: (<number>denominator_values[ind]).toFixed(2)
                    }]
                )
            }
            if(data_type == "xbar" || data_type == "s") {
                base = base.concat(
                    [{
                        displayName: "Group N",
                        value: (<number>(count[i])).toFixed(2)
                    }]
                )
            }
            return base;
        }
    )
}

export default getTooltips;
