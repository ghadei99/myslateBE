const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const otpGenerator = require('otp-generator')
const { sendOpt } = require('../emails/account')

const optGenerator = mongoose.Schema({
    
    name: {
        type: String,
        require: true
    },
    password: {
        type: String,
        require: true,
        trim: true,
        minlength: 7,
        validate(value) {
            if (value.includes('password')) {
                throw new Error(' password can not be able accepted as password!')
            }
        }
    },
    confPassword: {
        type: String,
        require: true,
        trim: true,
        minlength: 7,
        validate(value) {
            if (value.includes('password')) {
                throw new Error(' password can not be able accepted as password!')
            }
        }
    },
    userName: {
        type: String,
        unique: true,
        require: true,
        minlength: 2
    },
    email: {
        type: String,
        unique: true,
        require: true,
        // trim : true,
        // lowerCase : true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('its not a valid email id')
            }
        }
    },
    otp: {
        type: String,
        require: false,
        trim: true,
        minlength: 7
    }
})

optGenerator.statics.findByEmail = async (email, otp) => {
    const user = await Otp.findOne({ email })
    const userObject = user.toObject()
    if (!user) {
        throw new Error('Unable to verify')
    }

    const isMatch = await bcrypt.compare(otp, user.otp)

    if (!isMatch) {
        throw new Error('unable to verify')
    }
    delete userObject.otp
    return userObject
}

optGenerator.statics.deleteTempUser = async (email) => {
    await Otp.deleteOne({ email })
}

optGenerator.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()
    delete userObject.otp
    return userObject
}

optGenerator.pre('save', async function (next) {
    const user = this
    const otp = otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
    sendOpt(user.email, otp)
    user.otp = await bcrypt.hash(otp, 6)
    next()
})

const Otp = mongoose.model('temp-users', optGenerator)
module.exports = Otp