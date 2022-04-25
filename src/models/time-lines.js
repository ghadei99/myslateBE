const mongoose = require('mongoose')

const timeLineSchema = mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        // unique: false,
        ref: 'User_data'
    },
    text: {
        type: String
    },
    imagesURL: [{
        imageURL: {
            type: String
        }
    }],
    photos: [{
        photo: {
            type: Buffer
        }
    }],
    likes: [{
        likedBy: {
            type: mongoose.Schema.Types.ObjectId
            // ,unique: true
        },
        userName: {
            type: String
        },
        avatarURL: {
            type: String
        }
    }],
    comments: [{
        commentedBy: {
            type: mongoose.Schema.Types.ObjectId
            // ,unique: true
        },
        comment: {
            type: String
        },
        userName: {
            type: String
        },
        avatarURL: {
            type: String
        }
    }]
})

timeLineSchema.statics.allPosts = async (owner) => {
    const user = await TimeLine.findone({ owner })
    console.log(owner)
    const postArray = user.text
    return postArray
}

const TimeLine = mongoose.model('Time-Lines', timeLineSchema)
module.exports = TimeLine