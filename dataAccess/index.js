const {dbQuery} = require("../db/index");

const dataAccess = {
    async create(newData) {
        try {
            let newData = await dbQuery('INSERT INTO client ')
        } catch (error) {
            
        }
    }
}

module.exports = dataAccess