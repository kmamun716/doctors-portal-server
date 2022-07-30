const router = require("express").Router();
const client = require("../config").client;
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { accessMiddleWare } = require("../middlewares/userAccessMiddleware");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

let db;
let serviceCollection;
let bookingCollection;
let usersCollection;
let doctorsCollection;
router.all("*", (req, res, next) => {
  client.connect((err, database) => {
    console.log("database connected");
    // db=client.db('doctors-portal').collection('services');
    db = database.db("doctors-portal");
    serviceCollection = db.collection("services");
    bookingCollection = db.collection("booking");
    usersCollection = db.collection("users");
    doctorsCollection = db.collection("doctors");
    next();
  });
});

router.get("/", (req, res) => {
  res.send("doctors route working");
});

async function run() {
  //verify admin middleware
  const verifyAdmin = async (req, res, next) => {
    const requester = req.user.email;
    const requesterAccount = await usersCollection.findOne({
      email: requester,
    });
    if (requesterAccount.role === "admin") {
      next();
    } else {
      return res.status(403).send({ message: "Forbidden Access" });
    }
  };

  router.get("/services", async (req, res) => {
    const query = {};
    const cursor = serviceCollection.find(query).project({ name: 1 });
    const services = await cursor.toArray();
    res.send(services);
  });

  router.get("/available", async (req, res) => {
    const date = req.query.date;
    const services = await serviceCollection.find({}).toArray();
    const bookings = await bookingCollection.find({ date: date }).toArray();

    services.forEach((service) => {
      const serviceBookings = bookings.filter(
        (booking) => booking.treatment === service.name
      );
      const booked = serviceBookings.map((s) => s.slot);
      const available = service.slots.filter((s) => !booked.includes(s));
      service.slots = available;
    });
    res.send(services);
  });

  //get booking by id
  router.get("/booking", accessMiddleWare, async (req, res) => {
    const user = req.user.email;
    const patient = req.query.patient;
    if (user === patient) {
      const query = { patient: patient };
      const bookings = await bookingCollection.find(query).toArray();
      return res.send(bookings);
    } else {
      return res.status(403).send({ message: "Forbidden Access" });
    }
  });

  //get booking for payment
  router.get('/payment/:id', accessMiddleWare,async(req, res)=>{
    const id = req.params.id;
    const query = {_id: ObjectId(id)};
    const booking = await bookingCollection.findOne(query);
    res.send(booking);
  })

  //post booking
  router.post("/booking", async (req, res) => {
    const booking = req.body;
    const query = {
      treatment: booking.treatment,
      date: booking.date,
      patient: booking.patient,
    };
    const existBooking = await bookingCollection.findOne(query);
    if (existBooking) {
      return res.send({
        success: false,
        booking: existBooking,
        message: "already booked",
      });
    }
    const result = await bookingCollection.insertOne(booking);
    return res.send({ success: true, booking: result });
  });

  //update user data
  router.put("/user/:email", async (req, res) => {
    const email = req.params.email;
    const user = req.body;
    const filter = { email: email };
    const options = { upsert: true };
    const updatedDoc = {
      $set: user,
    };
    const result = await usersCollection.updateOne(filter, updatedDoc, options);
    const token = jwt.sign({ email: email }, process.env.SECRET, {
      expiresIn: "2h",
    });
    res.send({ result, accessToken: token });
  });

  //make admin
  router.put("/user/makeAdmin/:email", accessMiddleWare, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    }
  );

  //remove from admin
  router.put("/user/removeAdmin/:email", accessMiddleWare, verifyAdmin, async (req, res) => {
    const email = req.params.email;
    const filter = { email: email };
    const updatedDoc = {
      $set: { role: "user" },
    };
    const result = await usersCollection.updateOne(filter, updatedDoc);
    res.send(result);
  }
);

  //get all user
  router.get("/users", accessMiddleWare, async (req, res) => {
    const query = {};
    const cursor = usersCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
  });

  //check admin
  router.get("/admin/:email", accessMiddleWare, async (req, res) => {
    const email = req.params.email;
    const accessUser = req.user.email;
    if (email === accessUser) {
      const userDetails = await usersCollection.findOne({ email: email });
      const isAdmin = userDetails.role === "admin";
      if (isAdmin) {
        res.send({ admin: isAdmin });
      } else {
        res.send({ message: "you are not admin" });
      }
    } else {
      res.status(403).send({ message: "Forbidded Access" });
    }
  });

  //add doctor
  router.post("/addDoctor", accessMiddleWare, verifyAdmin, async (req, res) => {
    const doctor = req.body;
    const result = await doctorsCollection.insertOne(doctor);
    res.send(result);
  });

  //delete doctor
  router.delete("/doctor/:id", accessMiddleWare, verifyAdmin, async (req, res) => {
    const doctorId = req.params.id;
    const filter = {_id: ObjectId(doctorId)};
    const result = await doctorsCollection.deleteOne(filter);
    res.send(result);
  });

  //load all doctor
  router.get('/doctors', async(req, res)=>{
    const query = {};
    const cursor = doctorsCollection.find(query);
    const doctors = await cursor.toArray();
    res.send(doctors)
  })

  //payment route
  router.post('/create-payment-intent', accessMiddleWare, async(req, res)=>{
    const {price} = req.body;
    const payment = price * 100;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: payment,
      currency: "usd",
      payment_method_types: [ "card" ]
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  })
}
run().catch(console.dir);

module.exports = router;
