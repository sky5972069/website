const jwt = require('jsonwebtoken')
const JWT_SECRET = '617219'
const { ApolloServer, gql, UserInputError, AuthenticationError, PubSub } = require('apollo-server-express')
const mongoose = require('mongoose')
const Blog = require('./models/blogs')
const User = require('./models/users')
const http = require('http');
const express = require('express');
const app = express();
const cors = require('cors')

app.use(cors())

app.use(express.static('build'));
app.use(express.json())

const pubsub = new PubSub()
mongoose.set('useFindAndModify', false)
mongoose.set('useUnifiedTopology', true)
mongoose.set('useCreateIndex', true)

const MONGODB_URI = 'mongodb+srv://admin:sSkKyY3369@cluster0.cheqy.mongodb.net/website?retryWrites=true&w=majority'

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })


const typeDefs = gql`
  type Blog {
    title: String!
    date: String!
    content: String!
    user: User!
    likes: Int!
    id:ID!
  }
  type User {
    username: String!
    password: String!
    nickname: String
    blogs: [Blog]!
    id: ID!
  }
  type Token {
    value: String!
  }
  
  type Query {
    allUsers: [User]!
    allBlogs(username: String): [Blog]!
    me(username: String): User
  }
  type Mutation {
    addBlog(
      title: String!
      content: String
    ): Blog
    editUser(
      username:String
      newNickname:String
    ): User

    createUser(
      username: String!
      password: String!
      nickname: String
    ): User

    login(
      username: String!
      password: String!
    ): Token
  }

  type Subscription {
    blogAdded: Blog!
  }    
`

const resolvers = {
  Query: {
    // bookCount: () => Book.collection.countDocuments(),
    // authorCount: () => Author.collection.countDocuments(),
    me: (root, args) => User.findOne({ username: args.username }),
    allBlogs: async (root, args) => {
      try{
        if (!args.username) {
          const blogs = await Blog.find({}).populate('user')
          return blogs
        } else {
          const user = await User.findOne({username: args.username})
          return Blog.find({ user })
        }
      } catch(e) {
        console.log(e.message)
      }
    },
    allUsers: () => {
      return User.find({})
    }
  },

  Mutation: {
    addBlog: async (root, args, context) => {
      const currentUser = context.currentUser
      // if (!currentUser) {
      //   throw new AuthenticationError("not authenticated")
      // }
      try {
        const blogUser = await User.findOne({ username: '617' })
        let newBlog = new Blog({
          title: args.title,
          content: args.content,
          user: blogUser,
          likes: 0,
          date: new Date(),
        })
        await newBlog.save()
        const savedBlog = await Blog.findOne({title: args.title})
        await blogUser.updateOne({blogs: [...blogUser.blogs, savedBlog ]})
        pubsub.publish('BLOG_ADDED', { blogAdded: newBlog })
        return newBlog
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },


    editUser: async (root, args, context) => {
      const currentUser = context.currentUser

      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }
      try {
        let updateUser = await User.findOneAndUpdate({ username: args.username }, {nickname: args.newNickname}, {new: true})
        // if (!updateAuthor) {
        //   return null
        // }
        return updateUser
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

    },

    // 用户管理
    createUser: (root, args) => {
      const user = new User({ username: args.username, password: args.password, nickname: args.nickname })
      return user.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })
      console.log(args)
      if ( !user || args.password !== '617219' ) {
        throw new UserInputError("wrong credentials")
      }
      const userForToken = {
        username: user.username,
        id: user._id,
      }
  
      return { value: jwt.sign(userForToken, JWT_SECRET) }
    }
  },
  // 订阅
  Subscription: {
    blogAdded: {
      subscribe: () => pubsub.asyncIterator(['BLOG_ADDED'])
    },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      try{
        const decodedToken = jwt.verify(
          auth.substring(7), JWT_SECRET
        )
        const currentUser = await User.findById(decodedToken.id)
        return { currentUser }
      } catch(error) {
        console.log(error.message)
      }

    }
  }
})
const PORT=4000;
server.applyMiddleware({ app });
const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);
httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
  console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`)
})