"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unzip = exports.zip = void 0;
const msgpackr_1 = require("msgpackr");
const fflate_1 = require("fflate");
const utils_1 = require("utils");
const zip = (data, logs = null) => {
    try {
        const actualSize = typeof data === 'object' ? (0, utils_1.Sfy)(data).length : data.length;
        const bin = (0, msgpackr_1.pack)(data);
        const zip = (0, fflate_1.zlibSync)(bin, { level: 9 });
        if (logs)
            logs.push(`[#] Pack:       [${actualSize} -> ${zip.length}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`);
        else
            console.log(`[#] Pack:       [${actualSize} -> ${zip.length}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`);
        return zip;
    }
    catch (err) {
        if (logs)
            logs.push(`[#] Pack:       ${err.message}`);
        else
            console.log(`[#] Pack:       ${err.message}`);
        throw new Error(`ZIP: ${err.message}`);
    }
};
exports.zip = zip;
const unzip = (zip, logs = null) => {
    try {
        const bin = (0, fflate_1.unzlibSync)(zip);
        const data = (0, msgpackr_1.unpack)(bin);
        const actualSize = typeof data === 'object' ? (0, utils_1.Sfy)(data).length : data.length;
        if (logs)
            logs.push(`[#] Unpack:     [${zip.length} -> ${actualSize}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`);
        else
            console.log(`[#] Unpack:     [${zip.length} -> ${actualSize}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`);
        return data;
    }
    catch (err) {
        if (logs)
            logs.push(`[#] Unpack:     ${err.message}`);
        else
            console.log(`[#] Unpack:     ${err.message}`);
        throw new Error(`UNZIP: ${err.message}`);
    }
};
exports.unzip = unzip;
//# sourceMappingURL=common.js.map