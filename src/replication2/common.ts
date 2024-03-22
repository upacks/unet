import { pack, unpack } from 'msgpackr'
import { zlibSync, unzlibSync } from 'fflate'
import { Sfy } from 'utils'

export const zip = (data, logs = null) => {

    try {

        const actualSize = typeof data === 'object' ? Sfy(data).length : data.length
        const bin = pack(data)
        const zip = zlibSync(bin, { level: 9 })

        if (logs) logs.push(`[#] Pack:       [${actualSize} -> ${zip.length}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`)
        else console.log(`[#] Pack:       [${actualSize} -> ${zip.length}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`)

        return zip

    } catch (err) {

        if (logs) logs.push(`[#] Pack:       ${err.message}`)
        else console.log(`[#] Pack:       ${err.message}`)

        throw new Error(`ZIP: ${err.message}`)

    }

}


export const unzip = (zip, logs = null) => {

    try {

        const bin = unzlibSync(zip)
        const data = unpack(bin)
        const actualSize = typeof data === 'object' ? Sfy(data).length : data.length

        if (logs) logs.push(`[#] Unpack:     [${zip.length} -> ${actualSize}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`)
        else console.log(`[#] Unpack:     [${zip.length} -> ${actualSize}] ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}% eco`)

        return data

    } catch (err) {

        if (logs) logs.push(`[#] Unpack:     ${err.message}`)
        else console.log(`[#] Unpack:     ${err.message}`)

        throw new Error(`UNZIP: ${err.message}`)

    }

}