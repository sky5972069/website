const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3
  },
  nickname: {
    type:String,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  blogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog'
  }]
})

module.exports = mongoose.model('User', schema)