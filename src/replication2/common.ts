import { pack, unpack } from 'msgpackr'
import { zlibSync, unzlibSync } from 'fflate'
import { log, Sfy } from 'utils'

export const zip = (data, silent = true) => {

    try {

        const actualSize = typeof data === 'object' ? Sfy(data).length : data.length
        const bin = pack(data)
        const zip = zlibSync(bin, { level: 9 })

        !silent && log.info(`String(size): ${typeof data} ` + actualSize)
        !silent && log.info(`Pack(size): ${bin.constructor.name} ` + bin.length)
        !silent && log.info(`Zip(size): ${zip.constructor.name} ` + zip.length)

        console.log(`[#] Pack:       [${actualSize} -> ${zip.length}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`)

        return zip

    } catch (err) { throw new Error(`ZIP: ${err.message}`) }

}


export const unzip = (zip) => {

    try {

        const bin = unzlibSync(zip)
        const data = unpack(bin)
        const actualSize = typeof data === 'object' ? Sfy(data).length : data.length

        console.log(`[#] Unpack:     [${zip.length} -> ${actualSize}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`)

        return data

    } catch (err) { throw new Error(`UNZIP: ${err.message}`) }

}