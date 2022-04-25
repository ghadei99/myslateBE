const mongoose = require('mongoose')

mongoose.connect(process.env.Mongo_Server, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
})