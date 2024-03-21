"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unzip = exports.zip = void 0;
const msgpackr_1 = require("msgpackr");
const fflate_1 = require("fflate");
const utils_1 = require("utils");
const zip = (data, silent = true) => {
    try {
        const actualSize = typeof data === 'object' ? (0, utils_1.Sfy)(data).length : data.length;
        const bin = (0, msgpackr_1.pack)(data);
        const zip = (0, fflate_1.zlibSync)(bin, { level: 9 });
        !silent && utils_1.log.info(`String(size): ${typeof data} ` + actualSize);
        !silent && utils_1.log.info(`Pack(size): ${bin.constructor.name} ` + bin.length);
        !silent && utils_1.log.info(`Zip(size): ${zip.constructor.name} ` + zip.length);
        console.log(`[#] Pack:       [${actualSize} -> ${zip.length}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`);
        return zip;
    }
    catch (err) {
        throw new Error(`ZIP: ${err.message}`);
    }
};
exports.zip = zip;
const unzip = (zip) => {
    try {
        const bin = (0, fflate_1.unzlibSync)(zip);
        const data = (0, msgpackr_1.unpack)(bin);
        const actualSize = typeof data === 'object' ? (0, utils_1.Sfy)(data).length : data.length;
        console.log(`[#] Unpack:     [${zip.length} -> ${actualSize}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`);
        return data;
    }
    catch (err) {
        throw new Error(`UNZIP: ${err.message}`);
    }
};
exports.unzip = unzip;
//# sourceMappingURL=common.js.map