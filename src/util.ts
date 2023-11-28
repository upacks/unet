import { PackageExists } from 'utils'

export const { Op }: any = PackageExists('sequelize') ? require('sequelize') : { Op: {} }

export const isAsync = (p: any) => p && (p.constructor.name === "AsyncFunction" || (typeof p === 'object' && typeof p.then === 'function'))

export const execute = (f, req, res, content) => new Promise((resolve, reject) => {

    if (typeof f === 'object') {

        reject({ message: `Wrong` })

    } else {

        if (isAsync(f)) {

            f(req, res, content).then((e) => {
                resolve(e)
            }).catch(e => {
                reject(e)
            })

        }
        else {
            resolve(f(req, res, content))
        }

    }
})

export const authenticate = (req: any) => {

    if ('headers' in req) {

        const { verified, role } = req.headers

        if (typeof verified === 'string' && verified === 'yes') {

            const roles = ['level-1', 'level-2', 'level-3', 'level-4', 'level-5']

            if (typeof role === 'string' && roles.includes(role)) {

                try {

                    const { project, name } = req.headers

                    return {
                        proj: project,
                        type: 'owner',
                        name: name,
                        level: roles.findIndex((s) => s === role) + 1,
                    }

                } catch { }

            } else {

                try {

                    const { project, type, name } = req.headers

                    return {
                        proj: project,
                        type: typeof type === 'string' ? type : 'unknown',
                        name: name,
                        level: 0,
                    }

                } catch { }

            }

        }

    }

    return null

}