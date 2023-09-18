const express = require('express');
require('dotenv').config()
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json());



const jsonWebToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASS}@cluster0.dsd2lyy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const product = client.db("eCommerce-website").collection("product-collection");
    const filterImage = client.db("eCommerce-website").collection("filter-collection");
    const AllUserCollection = client.db("eCommerce-website").collection("all-userCollection");



    // create jwt token to secure api
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await AllUserCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }







    // all user collection in database is here
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const alreadyExistUser = await AllUserCollection.findOne(query)
      if (alreadyExistUser) {
        return res.send({ message: 'user already in the database' })
      }
      const result = await AllUserCollection.insertOne(user)
      res.send(result)
    })
    // get all user from database
    app.get('/users', jsonWebToken, verifyAdmin, async (req, res) => {
      const result = await AllUserCollection.find().toArray();
      res.send(result);
    });
    // make a user admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await AllUserCollection.updateOne(filter, updateDoc);
      res.send(result);

    })
    app.get('/users/admin/:email', jsonWebToken, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ admin: false })
      }
      const query = { email: email }
      const user = await AllUserCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })



    // make user instructor
    app.patch('/users/seller/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'seller'
        },
      };

      const result = await AllUserCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    app.get('/users/seller/:email', jsonWebToken, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false })
      }
      const query = { email: email }
      const user = await AllUserCollection.findOne(query);
      const result = { admin: user?.role === 'seller' }
      res.send(result);
    })


    // delete user by admin
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await AllUserCollection.deleteOne(query);
      res.send(result);
    })




    app.get("/product-collections", async (req, res) => {
      const result = await product.find().toArray()
      res.send(result)
    })
    //  get product by unique id and get it by single product
    app.get('/unique-product/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await product.findOne(query)
      res.send(result)


      // const id = req.params.id;
      // const query = { _id: new ObjectId(id) };
      // const result = await details.findOne(query);
      // res.send(result);
    })
    app.get("/filter-collections", async (req, res) => {
      const result = await filterImage.find().toArray()
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('helle there')
})

app.listen(port, () => {
  console.log(`Student do their homework PORT ${port}`);
})
