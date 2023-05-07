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