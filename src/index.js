require('./db/mongoose')
// const User = require("./models/user")
const express = require('express')
const app = express()
const port = process.env.PORT || 3000
// const cors = require('cors')

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// app.use(cors({ origin: 'https://clayslate.netlify.app' }))


const cors = require('cors')
app.use(cors())

app.use(cors({
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}))

app.use(function (req, res, next) {


    res.setHeader('Access-Control-Allow-Origin', 'https://clayslate.netlify.app');
    // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:9000');


    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');


    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');


    res.setHeader('Access-Control-Allow-Credentials', true);


    next();
});

const userRoutes = require('./routers/userRouter')
app.use(userRoutes)

const timeLines = require('./routers/timeLineRouter')
app.use(timeLines)

app.listen(port, () => {
    console.log('Server started at ' + port)
})

