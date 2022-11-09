import powerbi from "powerbi-visuals-api"
import { dataViewObjects } from "powerbi-visuals-utils-dataviewutils";
import dataObject from "./dataObject";

class settingsPair<T> {
  default: T;
  value: T;

  constructor(initialValue: T) {
    this.default = initialValue;
    this.value = initialValue;
  }
}

class axispadSettings {
  x: {
    padding: settingsPair<number>,
    end_padding: settingsPair<number>
  };
  y: {
    padding: settingsPair<number>,
    end_padding: settingsPair<number>
  };

  constructor() {
    this.x = {
      padding: new settingsPair(50),
      end_padding: new settingsPair(10)
    };
    this.y = {
      padding: new settingsPair(50),
      end_padding: new settingsPair(10)
    };
  };
};

class spcSettings {
  chart_type: settingsPair<string>;
  multiplier: settingsPair<number>;
  denom_split: settingsPair<string>;
  ll_truncate: settingsPair<number>;
  ul_truncate: settingsPair<number>;

  constructor() {
    this.chart_type = new settingsPair("i");
    this.multiplier = new settingsPair(1);
    this.denom_split = new settingsPair(null);
    this.ul_truncate = new settingsPair(null);
    this.ll_truncate = new settingsPair(null);
  }
}

class scatterSettings {
  size: settingsPair<number>;
  colour: settingsPair<string>;
  opacity: settingsPair<number>;
  opacity_unselected: settingsPair<number>;

  constructor() {
    this.size = new settingsPair(2.5);
    this.colour = new settingsPair("#000000");
    this.opacity = new settingsPair(1);
    this.opacity_unselected = new settingsPair(0.2);
  }
}

class lineSettings {
  width_99: settingsPair<number>;
  width_95: settingsPair<number>;
  width_main: settingsPair<number>;
  width_target: settingsPair<number>;
  type_99: settingsPair<string>;
  type_95: settingsPair<string>;
  type_main: settingsPair<string>;
  type_target: settingsPair<string>;
  colour_99: settingsPair<string>;
  colour_95: settingsPair<string>;
  colour_main: settingsPair<string>;
  colour_target: settingsPair<string>;

  constructor() {
    this.width_99 = new settingsPair(2);
    this.width_95 = new settingsPair(2);
    this.width_main = new settingsPair(1);
    this.width_target = new settingsPair(1.5);
    this.type_99 = new settingsPair("10 10");
    this.type_95 = new settingsPair("2 5");
    this.type_main = new settingsPair("10 0");
    this.type_target = new settingsPair("10 0");
    this.colour_99 = new settingsPair("#00667B");
    this.colour_95 = new settingsPair("#00667B");
    this.colour_main = new settingsPair("#00667B");
    this.colour_target = new settingsPair("#00667B");
  }
}

class axisSettings {
  xlimit_label: settingsPair<string>;
  ylimit_label: settingsPair<string>;
  xlimit_l: settingsPair<number>;
  xlimit_u: settingsPair<number>;
  ylimit_l: settingsPair<number>;
  ylimit_u: settingsPair<number>;

  constructor() {
    this.xlimit_label = new settingsPair(<string>null);
    this.ylimit_label = new settingsPair(<string>null);
    this.xlimit_l = new settingsPair(<number>null);
    this.xlimit_u = new settingsPair(<number>null);
    this.ylimit_l = new settingsPair(<number>null);
    this.ylimit_u = new settingsPair(<number>null);
  };
}

class outliersSettings {
  flag_direction: settingsPair<string>;
  astronomical: settingsPair<boolean>;
  ast_colour: settingsPair<string>;
  shift: settingsPair<boolean>;
  shift_colour: settingsPair<string>;
  trend: settingsPair<boolean>;
  trend_colour: settingsPair<string>;
  two_in_three: settingsPair<boolean>;
  twointhree_colour: settingsPair<string>;
  shift_n: settingsPair<number>;
  trend_n: settingsPair<number>;

  constructor() {
    this.flag_direction = new settingsPair("both");
    this.astronomical = new settingsPair(true);
    this.ast_colour = new settingsPair("#E1C233");
    this.shift = new settingsPair(true);
    this.shift_colour = new settingsPair("#E1C233");
    this.trend = new settingsPair(true);
    this.trend_colour = new settingsPair("#E1C233");
    this.two_in_three = new settingsPair(true);
    this.twointhree_colour = new settingsPair("#E1C233");
    this.shift_n = new settingsPair(7);
    this.trend_n = new settingsPair(5);
  };
}

class settingsObject {
  axispad: axispadSettings;
  spc: spcSettings;
  outliers: outliersSettings;
  scatter: scatterSettings;
  lines: lineSettings;
  axis: axisSettings;

  updateSettings(inputObjects: powerbi.DataViewObjects): void {
    let allSettingGroups: string[] = Object.getOwnPropertyNames(this)
                                           .filter(groupName => groupName !== "axispad");
    allSettingGroups.forEach(settingGroup => {
      let settingNames: string[] = Object.getOwnPropertyNames(this[settingGroup]);
      let valueSettings: string[] = settingNames.filter(name => !name.includes("colour"))
      let colourSettings: string[] = settingNames.filter(name => name.includes("colour"))
      valueSettings.forEach(settingName => {
        this[settingGroup][settingName].value = dataViewObjects.getValue(
          inputObjects, {
            objectName: settingGroup,
            propertyName: settingName
          },
          this[settingGroup][settingName].default
        )
      })

      colourSettings.forEach(settingName => {
        this[settingGroup][settingName].value = dataViewObjects.getFillColor(
          inputObjects, {
            objectName: settingGroup,
            propertyName: settingName
          },
          this[settingGroup][settingName].default
        )
      })
    })
  }

  settingInData(settingGroupName: string, settingName: string): boolean {
    let settingsInData: string[] = ["chart_type", "multiplier", "flag_direction"];
    return ["spc", "outliers"].includes(settingGroupName) && settingsInData.includes(settingName);
  }

  returnValues(settingGroupName: string, inputData: dataObject) {
    let settingNames: string[] = Object.getOwnPropertyNames(this[settingGroupName]);
    let firstSettingObject = {
      [settingNames[0]]: this.settingInData(settingGroupName, settingNames[0])
        ? inputData[settingNames[0]]
        : this[settingGroupName][settingNames[0]].value
    };
    return settingNames.reduce((previousSetting, currentSetting) => {
      return {
        ...previousSetting,
        ...{
          [currentSetting]: this.settingInData(settingGroupName, currentSetting)
            ? inputData[currentSetting]
            : this[settingGroupName][currentSetting].value
        }
      }
    }, firstSettingObject);
  }

  constructor() {
    this.axispad = new axispadSettings();
    this.spc = new spcSettings();
    this.outliers = new outliersSettings();
    this.scatter = new scatterSettings();
    this.lines = new lineSettings();
    this.axis = new axisSettings();
  }
}

export default settingsObject;
