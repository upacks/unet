import { pack, unpack } from 'msgpackr'
import { zlibSync, unzlibSync } from 'fflate'
import { log, Sfy } from 'utils'

export const zip = (data) => {

    try {

        const actualSize = typeof data === 'object' ? Sfy(data).length : data.length
        const bin = pack(data)
        const zip = zlibSync(bin, { level: 9 })

        log.info(`String(size): ${typeof data} ` + actualSize)
        log.info(`Pack(size): ${bin.constructor.name} ` + bin.length)
        log.info(`Zip(size): ${zip.constructor.name} ` + zip.length)
        log.info(`Reduced: ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}%`)

        return zip

    } catch (err) { throw new Error(`ZIP: ${err.message}`) }

}


export const unzip = (zip) => {

    try {

        const bin = unzlibSync(zip)
        const data = unpack(bin)
        return data

    } catch (err) { throw new Error(`UNZIP: ${err.message}`) }

}