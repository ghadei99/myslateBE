const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Supersim = require('twilio/lib/rest/Supersim')

const userSchema = mongoose.Schema({
    userName: {
        type: String,
        unique: true,
        required: true,
        minlength: 2
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowerCase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('its not a valid email id')
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 7,
        validate(value) {
            if (value.includes('password')) {
                throw new Error(' password can not be able accepted as password!')
            }
        }
    },
    age: {
        type: Number,
        default: 0,
        maxlength: 2,
        validate(value) {
            if (value < 0) {
                throw new Error('Age of a person can not be negatives')
            }
        }
    },
    phone: {
        type: String,
        minlength: 10,
        maxlength: 10
    },
    avatarURL: {
        type: String
    },
    contactRecieved: [{
        recieved: {
            type: String
        }
    }],
    contactRequested: [{
        requested: {
            type: String
        }
    }],
    contacts: [{
        contact: {
            type: String
        }
    }],
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
},
    {
        timestamps: true
    })


// here instead of tasks we can use anything its not mandatory to be model name
// from --  const Task = mongoose.model('task-manager' , taskSchema)
// we have to take the correct task-manager collection name otherwise it will throw error

userSchema.virtual('timeline', {
    ref: 'Time-Lines',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()
    delete userObject.password
    delete userObject.tokens
    //   delete userObject._id
    delete userObject.__v
    delete userObject.avatar
    return userObject
}

userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_Word, { expiresIn: '1h' })
    user.tokens = user.tokens.concat({ token: token })
    user.save()
    return token
}

// sending Request

userSchema.statics.sendFriendRequest = async (sender, reciever) => {
    const user1 = await User.findOne({ userName: sender })

    const user2 = await User.findOne({ userName: reciever })

    user1.contactRequested = user1.contactRequested.concat({ requested: reciever })
    user2.contactRecieved = user2.contactRecieved.concat({ recieved: sender })

    user1.save()
    user2.save()

    return ('Request Sent!')
}

// Confirming Request

userSchema.statics.confirmingRequest = async (sender, reciever) => {
    const user1 = await User.findOne({ userName: sender })
    const user2 = await User.findOne({ userName: reciever })

    user1.contactRequested = user1.contactRequested.filter(requested => {
        return requested.requested !== reciever
    })

    user2.contactRecieved = user2.contactRecieved.filter(recieved => {
        return recieved.recieved !== sender
    })

    user1.contacts = user1.contacts.concat({ contact: reciever })
    user2.contacts = user2.contacts.concat({ contact: sender })

    user1.save()
    user2.save()

    return (`Request Accepted! , you are now friend with ${user1.userName}`)

}

// Show All the friendList 

userSchema.statics.getAllContacts = async (userName) => {
    const user = await User.findOne({ userName })
    const contactsList = user.contacts.map(value => value.contact)
    return contactsList
}

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email: email })
    if (!user) {
        throw new Error('unable to login')
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        throw new Error('unable to login')
    }
    return user
}

userSchema.pre('save', async function (next) {
    const user = this
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }
    next()
})




// const User = mongoose.model('User_data', userSchema )
const User = mongoose.model('User_data', userSchema)
module.exports = User