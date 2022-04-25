const express = require('express')
const User = require('../models/user')
const Otp = require('../models/otp-verification')
const userRouter = new express.Router()
const auth = require('../middleware/auth')
const { sendWelcomeMail } = require('../emails/account')
const multer = require('multer')
const sharp = require('sharp')
const request = require('postman-request');
const req = require('express/lib/request')
// for sign up

// userRouter.post('/users/signup', async (req, res) => {
//     const user = new User(req.body)
//     try {
//         await user.save()
//         sendWelcomeMail(user.email, user.name)
//         const token = await user.generateAuthToken()
//         res.status(201).send({ user, token })
//     } catch (error) {
//         res.status(406).send(error)
//     }
// })

userRouter.post('/sendOtp', async (req, res) => {
    const user = new Otp(req.body)
    try {
        await user.save()
        res.status(201).send('Otp sent, Please confirm')
    } catch (error) {
        // console.log(error)
        res.status(406).send(error)
    }
})

userRouter.get('/confirm', async (req, res) => {
    try {
        const tempUser = await Otp.findByEmail(req.query.email, req.query.otp)
        const user = new User(tempUser)

        //
        user.avatarURL = 'https://i.ibb.co/fNBydPJ/104b8e260ab2.png'
        //

        await user.save()
        Otp.deleteTempUser(req.query.email)
        sendWelcomeMail(user.email, user.name)
        const token = await user.generateAuthToken()
        res.status(201).send('OTP is confirmed!, Welcome to Slate!')
    } catch (e) {
        res.status(404).send(e)
    }
})


//for login

userRouter.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.status(200).send({ token })
    } catch (e) {
        res.status(404).send(e)
    }

})

// Sending Request

userRouter.post('/request/send', auth, async (req, res) => {
    try {
        const response = await User.sendFriendRequest(req.body.sender, req.body.reciever)
        res.status(200).send(response)
    } catch (e) {
        res.status(500).send(e)
    }
})


// confirming Request

userRouter.post('/request/confirm', auth, async (req, res) => {
    try {
        const response = await User.confirmingRequest(req.body.sender, req.body.reciever)
        res.status(200).send(response)
    } catch (e) {
        console.log(e)
        res.status(500).send(e)
    }
})

// get all contacts by user name

userRouter.get('/user/contacts/:userName', auth, async (req, res) => {
    try {
        const contacts = await User.getAllContacts(req.params.userName)
        res.status(200).send(contacts)
    } catch (e) {
        console.log(e)
        res.status(500).send(e)
    }
})

const upload = multer({
    // dest: 'images',
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload an image file'))
        }
        cb(undefined, true)
    }
})

userRouter.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    // req.user.avatar = buffer
    const uploadURL = `https://api.imgbb.com/1/upload?key=${process.env.imgbb_key}`
    const formData = {
        "image": buffer.toString('base64')
    }
    request.post({ url: uploadURL, formData: formData }, async (error, response, body) => {
        if (error) {
            return new Error('upload failed:', error);
        } else {
            // req.user.avatarURL = '';
            req.user.avatarURL = await JSON.parse(response.body).data.url;
            await req.user.save()
            res.status(200).send({ "message": "Your profile pic uploaded successfully! " + req.user.avatarURL })
        }
    })
    // req.user.save()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

userRouter.delete('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        req.user.avatarURL = 'https://www.personality-insights.com/wp-content/uploads/2017/12/default-profile-pic-e1513291410505.jpg'
        req.user.save()
        res.status(200).send({ "message": "Your profile pic deleted successfully!" })
    } catch (e) {
        res.status(400).send({ "message": "Something went wrong..... Please try again" })
    }
})

userRouter.get('/user/:userName/avatar', async (req, res) => {
    try {
        const user = await User.findOne({ userName: req.params.userName })
        if (!user) {
            throw new Error()
        }
        res.set('Content-Type', 'image/png')
        res.send(user.avatarURL)
    } catch (error) {
        res.status(403).send(error)
    }
})








//for my profile

userRouter.get('/user/me', auth, async (req, res) => {

    try {
        // const user = await User.find({})
        res.status(200).send(req.user)
    } catch (error) {
        res.status(500).send(error)
    }
})

//updating User details

userRouter.patch('/updateUsers', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdate = ['age', 'name', 'email', 'password']
    const isValidData = updates.every((update) => allowedUpdate.includes(update))
    if (!isValidData) {
        return res.status(404).send({ error: 'Invalid data' })
    }

    try {
        // const user = await User.findById(req.params.id)

        updates.forEach((update) => req.user[update] = req.body[update])

        await req.user.save()

        // const user = await User.findByIdAndUpdate(req.params.id , req.body, {runValidators : true , new : true})
        // if(!user){
        //     return res.status(404).send('No user found')
        // }
        // res.status(201).send(user)
        res.send(req.user)
    } catch (error) {
        res.status(400).send(error)
    }
})

// for logout

userRouter.get('/user/logout', auth, async (req, res) => {
    try {

        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()
        res.send('Log out from this device!')
    } catch (e) {
        res.status(500).send(e)
    }
})


// for logout from all devices

userRouter.get('/user/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send('Logout from all devices!')
    } catch (e) {
        res.status(500).send(e)
    }
})



// userRouter.post('/users' , (req, res) => {
//     const user = new User(req.body)

//     user.save().then(() =>{
//         res.status(201).send(user)
//     }).catch((error) => {
//         res.status(406).send(error)
//     })
//    })



// app.get('/users' , ( req , res )=> {
//     User.find({}).then((user)=>{
//         res.send(user)
//     }).catch((e) => {
//         res.status(500).send()
//     })
// })


// userRouter.get('/users/:id' , async (req, res) => {
//     const _id = req.params.id

//     try{
//         const user = await User.findById(_id)
//         if(!user){
//             return res.status(400).send()
//         }
//         res.send(user)
//     }catch (error) {
//         res.status(401).send(error)
//     }
// })


// userRouter.get('/users/:id' , (req, res) => {
//     const _id = req.params.id
//     User.findById(_id).then((user) => {
//         if(!user){
//             return res.status(400).send()
//         }
//         res.send(user)
//     }).catch((e) => {
//         res.status(401).send()
//     })
// })



// userRouter.get('/name/:name' , async(req, res) => {

//     const names = req.params.name

//     try {
//         const name = await User.findOne({name:names})
//         if(!name){
//             return res.status(400).send(name)
//         }
//         res.status(200).send(name)
//     }catch (error){
//         res.status(500).send(error)
//     }

// })

// userRouter.get('/name/:name' , (req, res) => {

//     const names = req.params.name
//     User.findOne({name: names}).then((user) => {
//         if(!user){
//             return res.status(400).send(user)
//         }
//         res.send(user)
//     }).catch((e) => {
//         res.status(401).send(e)
//     })
// })



module.exports = userRouter