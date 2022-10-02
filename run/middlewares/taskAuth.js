const { getAuth } = require('firebase-admin/auth');
const db = require('../lib/firebase');

module.exports = async (req, res, next) => {
    const data = { ...req.body.data, ...req.query };
    try {
        console.log(data)
        if (data.secret === process.env.AUTH_SECRET)
            next();
        else
            res.sendStatus(401);
    } catch(error) {
        console.error(data)
        console.error(error);
        res.status(401).send(error);
    }
};
