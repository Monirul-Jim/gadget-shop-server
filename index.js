const express = require('express');
require('dotenv').config()
const SSLCommerzPayment = require('sslcommerz-lts')
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
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

const store_id = process.env.SSL_STOREID
const store_passwd = process.env.SSL_PASS;
const is_live = false;

async function run() {
  try {

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const product = client.db("eCommerce-website").collection("product-collection");
    const userOrderProduct = client.db("eCommerce-website").collection("orderProduct");
    const confirmOrderProduct = client.db("eCommerce-website").collection("confirmProduct");
    const quantityProductCollection = client.db("eCommerce-website").collection("product-quantity");
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

    app.get('/confirmProduct', async (req, res) => {
      const orderedProduct = await confirmOrderProduct.find().toArray();
      const searchEmail = req.query.cus_email;
      const productsByEmail = orderedProduct.filter((order) => order.info.cus_email === searchEmail);

      res.send(productsByEmail);
    });
    app.get('/get-order-product', async (req, res) => {
      const orderedProduct = await confirmOrderProduct.find().toArray();
      res.send(orderedProduct);
    });
    // app.get('/confirmProduct', async (req, res) => {
    //   let query = {}
    //   if (req.query?.email) {
    //     query = { email: req.query.email }
    //   }
    //   const result = await confirmOrderProduct.find(query).toArray()
    //   res.send(result)
    // })

    // generate unique id
    const tran_id = new ObjectId().toString()
    // here i post confirm order element
    app.post('/confirm-order-post', async (req, res) => {
      const initialProduct = await product.findOne({ _id: new ObjectId(req.body.id) })
      const order = req.body
      const email = req.body.email
      const data = {
        total_amount: initialProduct?.price,
        currency: "BDT",   // order.currency
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `https://gadget-shop-server.vercel.app/payment/success/${tran_id}`,
        fail_url: 'https://gadget-shop-server.vercel.app',
        cancel_url: 'https://gadget-shop-server.vercel.app/cancel',
        ipn_url: 'https://gadget-shop-server.vercel.app/ipn',
        shipping_method: 'Courier',
        product_name: order.product,
        pro_img: order.image,
        cus_name: order.name,
        cus_last: order.last,
        ship_name: 'Bangladesh',
        ship_city: 'dhaka',
        product_profile: 'general',
        product_category: 'Mobile',
        cus_email: order.email,
        cus_add1: order.area,
        cus_city: order.division,
        cus_state: order.district,
        cus_postcode: order.post,
        cus_country: 'Bangladesh',
        cus_phone: order.number,
        cus_feed: order.feedback,
        ship_add1: order.address,
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL })
        const finalOrder = {
          initialProduct,
          paid_status: false,
          transactionId: tran_id,
          info: data
        }
        const result = confirmOrderProduct.insertOne(finalOrder)
      });

      app.post('/payment/success/:tranID', async (req, res) => {
        const result = await confirmOrderProduct.updateOne({ transactionId: req.params.tranID }, {
          $set: {
            paid_status: true
          }
        })

        if (result.modifiedCount > 0) {
          res.redirect('https://gadget-shop-server.vercel.app/dashboard-for-all/userOrderedItem')
        }


      })

    })

    const transId = new ObjectId().toString()
    app.post('/customer-double-quantity-order', async (req, res) => {
      // const initialConfirmProduct = await product.findOne({ _id: new ObjectId(req.body.id) })
      const order = req.body
      const data = {
        total_amount: req.body.total,
        currency: 'BDT',
        tran_id: 'REF123', // use unique tran_id for each api call
        success_url: `http://localhost:3030/success/${transId}`,
        fail_url: 'http://localhost:3030/fail',
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: 'Customer Name',
        cus_email: 'customer@example.com',
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        console.log(apiResponse);
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL
        res.send({ url: GatewayPageURL });
        const initialConfirmProductData = {
          order,
          paid_status: false,
          transactionId: transId,
          info: data
        }
        const result = confirmOrderProduct.insertOne(initialConfirmProductData)
      });

      app.post('/payment/success/:tranID', async (req, res) => {
        const result = await confirmOrderProduct.updateOne({ transactionId: req.params.tranID }, {
          $set: {
            paid_status: true
          }
        })

        if (result.modifiedCount > 0) {
          res.redirect('http://localhost:5173/dashboard-for-all/userOrderedItem')
        }


      })
    })











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

    app.get('/confirmProduct', async (req, res) => {
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await confirmOrderProduct.find(query).toArray()
      res.send(result)
    })


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

    app.get('/confirmProduct/:email', async (req, res) => {
      const email = req.params.email;
      const query = { cus_email: email }
      const user = await confirmOrderProduct.findOne(query);
      res.send(user)
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



    // find product from database
    app.get("/product-collections", async (req, res) => {
      const result = await product.find().toArray()
      res.send(result)
    })
    // search product
    app.get('/search-product/:text', async (req, res) => {
      const searchText = req.params.text
      const result = await product.find({
        $or: [
          { product_name: { $regex: searchText, $options: "i" } }
        ],
      }).toArray()
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
    app.post('/quantity-product-added', async (req, res) => {
      const productData = req.body
      const insertQuantityProduct = await quantityProductCollection.insertOne(productData)
      res.send(insertQuantityProduct)
    })
    app.get("/filter-collections", async (req, res) => {
      const result = await filterImage.find().toArray()
      res.send(result)
    })



    // seller add product to database
    app.post('/seller-added-product', async (req, res) => {
      const addedProduct = req.body
      const sellerInsertProduct = await product.insertOne(addedProduct)
      res.send(sellerInsertProduct)
    })

    // here i make handleAddCart operation
    app.post('/product-added-database', async (req, res) => {
      const product = req.body
      product.quantity = 1
      product.initialPrice = req.body.price
      const insertProduct = await userOrderProduct.insertOne(product)
      res.send(insertProduct)
    })

    // here i update the increment or decrement value 
    app.put('/update-product-quantity/:productId', async (req, res) => {
      const productId = req.params.productId;
      const newQuantity = req.body.quantity;
      const newInitialPrice = req.body.initialPrice;
      await userOrderProduct.findOneAndUpdate(
        { _id: new ObjectId(productId) },
        { $set: { quantity: newQuantity, initialPrice: newInitialPrice } },
        { returnOriginal: false }
      );

      res.send({ message: 'Product quantity updated successfully' });
    });
    // find user product by specific email
    app.get('/product-added-database', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ error: true, message: 'forbidden access' })
      // }

      const query = { email: email };
      const result = await userOrderProduct.find(query).toArray();
      res.send(result);
    })
    // delete product by user
    app.delete('/product-delete/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await userOrderProduct.deleteMany(query)
      res.send(result)
    })
    // here i update seller product info
    app.put('/seller-update-product/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateProduct = req.body
      const updateProducts = {
        $set: {
          product_url: updateProduct?.product_url,
          product_name: updateProduct?.product_name,
          ram_rom: updateProduct?.ram_rom,
          price: updateProduct?.price,
          category: updateProduct?.category,
          sub_category: updateProduct?.sub_category,
          best: updateProduct?.best
        }
      }
      const updateProductInfo = product.updateOne(filter, updateProducts, options)
      res.send(updateProductInfo)
    })
    app.get('/seller-update-product/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await product.findOne(query)
      res.send(result)
    })

    app.delete('/seller-delete/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await product.deleteOne(query)
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
