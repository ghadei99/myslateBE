const express = require('express')
const User = require('../models/user')
const TimeLine = require('../models/time-lines')
const timeLinesRouter = new express.Router()
const multer = require('multer')
const sharp = require('sharp')
const auth = require('../middleware/auth')
const request = require('postman-request');
const { type } = require('express/lib/response')
const { response } = require('express')
const Buffer = 'buffer';

// timeLinesRouter.post('/post/new', auth, async (req, res) => {
//     const timeline = new TimeLine({
//         ...req.body,
//         owner: req.user._id
//     })

//     try {
//         await timeline.save()
//         res.status(200).send({ "message": timeline })
//     } catch (error) {
//         console.log(error)
//         res.status(500).send({ error })
//     }
// })

timeLinesRouter.get('/post/all', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
        await user.populate('timeline').execPopulate()

        const timeLines = user.timeline.map(value => {
            return (
                [
                    value.text,
                    value.photos,
                    value.likes,
                    value.comments
                ]
            )
        })
        const size = timeLines.length
        res.status(200).send({ "total post": size, timeLines })
    } catch (e) {
        res.status(500).send(e)
    }
})

// Uploading Image


const upload = multer({
    // dest: 'images',
    limits: {
        fileSize: 5000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload an image file'))
        }
        cb(undefined, true)
    }
})

const uploadImageToIMGBB = ((image) => {
    const fs = require('fs')
    const uploadURL = `https://api.imgbb.com/1/upload?key=${process.env.imgbb_key}`

    const formData = {
        "image": image
    }

    request.post({ url: uploadURL, formData: formData }, (error, response, body) => {
        if (error) {
            return console.error('upload failed:', error);
        } else {
            return (JSON.parse(response.body).data.url);
        }
    })
})

timeLinesRouter.post('/post/new', auth, upload.single('photo'), async (req, res) => {

    if (!req.body.text && !req.file) {
        res.status(400).send({ "error": "please input a text or upload an image atleast!" })
        return new Error()
    }

    let buffer = undefined

    if (req.file) {
        // buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
        
        buffer = await sharp(req.file.buffer).png().toBuffer()
    }

    const timeline = new TimeLine({
        owner: req.user._id
    })

    if (req.body.text) {
        timeline.text = req.body.text
    }

    if (buffer) {
        // timeline.photos = await timeline.photos.concat({ photo: buffer })
        const uploadURL = `https://api.imgbb.com/1/upload?key=${process.env.imgbb_key}`
        const formData = {
            "image": buffer.toString('base64')
        }
        request.post({ url: uploadURL, formData: formData }, async (error, response, body) => {
            if (error) {
                return new Error('upload failed:', error);
            } else {
                // timeline.photosURL = timeline.photosURL.concat({ photoUrl: JSON.parse(response.body).data.url })
                timeline.imagesURL = await timeline.imagesURL.concat({ imageURL: JSON.parse(response.body).data.url })
                await timeline.save()
            }
        })
    } else {
        timeline.imagesURL = await timeline.imagesURL.concat({ imageURL: '' })
        await timeline.save()
    }

    try {
        await timeline.save()
        res.status(200).send({ "message": "You just wrote into Slate!" })
    } catch (error) {
        res.status(500).send({ error })
    }
})


timeLinesRouter.get('/timeline', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit)
        const page = parseInt(req.query.page) - 1
        const time = await TimeLine.find({}).limit(limit).skip(page * limit)
        const getData = await Promise.all(time.map(async (value) => {
            return (
                await value.populate('owner').execPopulate()
            )
        }))

        const allTimelines = getData.map(value => {
            return (
                {
                    "name": value.owner.name,
                    "username": value.owner.userName,
                    "profilePic": value.owner.avatarURL,
                    // "emailId": value.owner.email,
                    "text": value.text,
                    "image": value.imagesURL[0],
                    "Total_Like": value.likes.length,
                    "Total_Comment": value.comments.length
                }
            )
        })
        const size = allTimelines.length
        res.status(200).send({ "total post": size, "timeLines": allTimelines })
    } catch (e) {
        res.status(500).send(e)
    }
})

timeLinesRouter.post('/like', auth, async (req, res) => {
    try {
        const userId = req.user._id
        const timeLineId = req.body.id
        const timeline = await TimeLine.findOne({ _id: timeLineId, 'likes.likedBy': userId })

        const tl = await TimeLine.findById(timeLineId)

        if (!timeline) {
            tl.likes = await tl.likes.concat({ likedBy: userId, userName: req.user.userName, avatarURL: req.user.avatarURL })
            await tl.save()
            res.status(200).send({ "message": "Liked!" })
        } else {
            tl.likes = await tl.likes.filter((like) => {
                return like.likedBy.toString() !== userId.toString()
            })
            await tl.save()
            res.status(200).send({ "message": "Disliked!" })
        }
    } catch (e) {
        res.status(400).send({ "message": e })
    }
})

timeLinesRouter.post('/comment', auth, async (req, res) => {
    try {
        const userId = req.user._id
        const timeLineId = req.body.id
        const timeline = await TimeLine.findOne({ _id: timeLineId, 'comments.commentedBy': userId })
        const tl = await TimeLine.findById(timeLineId)
        if (!timeline) {
            tl.comments = await tl.comments.concat({ commentedBy: userId, comment: req.body.comment, userName: req.user.userName, avatarURL: req.user.avatarURL })
            await tl.save()
            res.status(200).send({ "message": "Comment added!" })
        } else {
            tl.comments = await tl.comments.filter((comment) => {
                return comment.commentedBy.toString() !== userId.toString()
            })
            tl.comments = await tl.comments.concat({ commentedBy: userId, comment: req.body.comment, userName: req.user.userName, avatarURL: req.user.avatarURL })
            await tl.save()
            res.status(200).send({ "message": "Disliked!" })
        }
    } catch (e) {
        res.status(400).send({ "message": e })
    }
})

timeLinesRouter.get('/getAllLikes', auth, async (req, res) => {
    try {
        const timeline = await TimeLine.findById(req.query.timeLineId)
        res.status(200).send({ "total_likes": timeline.likes.length })
    } catch (e) {
        console.log(e)
        res.status(400).send({ "message": e })
    }
})

timeLinesRouter.get('/getAllComments', auth, async (req, res) => {
    try {
        const timeline = await TimeLine.findById(req.query.timeLineId)
        const commentArray = timeline.comments.map((value) => {
            return ({
                "comment": value.comment,
                "userName": value.userName,
                "avatarURL": value.avatarURL
            })
        })
        res.status(200).send({ "comment": commentArray })
    } catch (e) {
        console.log(e)
        res.status(400).send({ "message": e })
    }
})


module.exports = timeLinesRouter