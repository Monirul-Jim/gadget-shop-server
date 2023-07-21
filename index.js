const express = require('express');
require('dotenv').config()
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
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
    const fil = client.db("eCommerce-website").collection("filter-collection");
 app.get("/product-collections",async(req,res)=>{
    const result=await product.find().toArray()
    res.send(result)
 })
 app.get("/filter-collections",async(req,res)=>{
    const result=await fil.find().toArray()
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
  