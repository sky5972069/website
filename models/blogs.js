const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
    minlength: 2,
  },
  date: {
    type: Number,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  likes: {
    type: Number,
    required: true,
  }
})

module.exports = mongoose.model('Blog', schema)