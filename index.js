require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = 5000;
app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.get("/", (req, res) => {
  res.send("pump server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2cofc5d.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJwt = (req, res, next) => {
  console.log("hitting from new");
  console.log();
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, meassage: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(403)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const carsDataBase = client.db("carDoctor").collection("services");
    const bookingDatabase = client.db("carDoctor").collection("bookings");

    // jwt operation from here
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send(JSON.stringify(token));
    });

    // find multiple document from here
    app.get("/services", async (req, res) => {
      const result = await carsDataBase.find().toArray();
      res.send(result);
    });

    // get single data from db
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const query = { _id: new ObjectId(id) };
      const result = await carsDataBase.findOne(query, options);
      res.send(result);
    });

    // post methods from here
    app.post("/bookings", async (req, res) => {
      const bookingData = req.body;
      const result = await bookingDatabase.insertOne(bookingData);
      res.send(result);
    });

    // lets get bookings data from database
    app.get("/bookings", verifyJwt, async (req, res) => {
      // console.log(req.headers);
      const decoded = req.decoded;
      console.log(decoded);
      if (decoded.loggedUser.email !== req.query.email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const result = await bookingDatabase.find(query).toArray();
      res.send(result);
    });
    // lets delete from here
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingDatabase.deleteOne(query);
      res.send(result);
    });
    // booking update info api
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const doc = req.body;
      const filter = { _id: new ObjectId(id) };

      const updatedDoc = {
        $set: {
          status: doc.status,
        },
      };
      const result = await bookingDatabase.updateOne(filter, updatedDoc);
      res.send(result);
    });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("server is running on port", port);
});
