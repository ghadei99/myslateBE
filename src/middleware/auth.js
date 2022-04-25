const jwt = require('jsonwebtoken')
const User = require('../models/user')


const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '')
        const decoded = jwt.verify(token, process.env.JWT_Word)
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token })
        // res.send(user)
        if (!user) {
            throw new Error()
        } else {
            req.user = user
        }
        req.token = token
        req.user = user
        next()
    } catch (e) {
        res.status(400).send({ error: 'Please Authenticate!' })
    }

}

module.exports = auth