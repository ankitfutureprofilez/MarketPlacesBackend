const dotenv = require("dotenv");
dotenv.config();
require("./monogconfig"); // check spelling

const express = require("express");
const app = express();

const cors = require("cors");
const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "*",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// // Razorpay instance
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("./model/Payment");

const razorpay = new Razorpay({
  key_id: "rzp_test_RQ3O3IWq0ayjsg",    // aapka Key ID
  key_secret: "RcwuasbTHAdmm1mrZTiigw2x",   // aapka Secret Key
});

app.post("/create-order", async (req, res) => {
  try {
    console.log("req.body", req.body);

    // const { amount, currency, receipt, offer_id, auth_id } = req.body;
    const options = { amount: 50000, currency: "INR", receipt: "receipt#1" };
    // const payload = { amount, currency, receipt };
    const order = await razorpay.orders.create(options);

    // Save initial record with PENDING status and extra info
    const record = new Payment({
      order_id: order.id,       // Razorpay order ID
      amount: 50000,
      currency: "INR",
      offer_id: "68de3e977568e0bdf1b0249a",                 // custom field
      auth_id: "68de3f1a8b07ba1cbfea736e",                  // custom field
      payment_status: "PENDING",
    });
    const datat = await record.save();
    console.log("datat", datat)
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

//Payment Webhook
app.post("/api/webhook/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  const secret = "my_super_secret_key_123";
  const body = req.body.toString("utf-8");
  const signature = req.headers["x-razorpay-signature"];
  const expectedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (signature === expectedSignature) {
    try {
      const payload = JSON.parse(body);
      const paymentEntity = payload.payload.payment?.entity;
      if (!paymentEntity) return res.status(200).json({ status: "ignored" });
      if (payload.event === "payment.captured" || payload.event === "order.paid") {
        console.log("paymentEntity" ,paymentEntity)
        await Payment.findOneAndUpdate(
          { order_id: paymentEntity.order_id },
          {
            status: paymentEntity.status,
            payment_id: paymentEntity.id,
            email: paymentEntity.email,
            contact: paymentEntity.contact,
            payment_method: paymentEntity.method,
          }
        );
      } else if (payload.event === "payment.failed") {
        await Payment.findOneAndUpdate(
          { order_id: paymentEntity.order_id },
          { status: paymentEntity.status, payment_id: paymentEntity.id, payment_method: paymentEntity.method, }
        );
      }

      res.status(200).json({ status: "ok" });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    console.log("Invalid signature");
    res.status(400).send("Invalid signature");
  }
});


app.use(express.json({ limit: "2000mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.json({
    msg: "Hello World",
    status: 200,
  });
});

app.use("/api", require("./route/VendorRoute"));
app.use("/api", require("./route/OfferRoute"));
app.use("/api", require("./route/UserRoute"));
app.use("/api", require("./route/salesRoute"));
app.use("/api", require("./route/AdminRoute"));
app.use("/api", require("./route/customerRoutes"));

const server = app.listen(PORT, () =>
  console.log("Server is running at port : " + PORT)
);
server.timeout = 360000;



// const serviceAccount = require('../otpdemo-dc63b-firebase-adminsdk-fbsvc-bc859b783f.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// app.post('/send-notification', async (req, res) => {
//   try {
//     const { token, title, body } = req.body;

//     const message = {
//       token,
//       notification: { title, body },
//       webpush: {
//         fcmOptions: {
//           link: 'http://localhost:3000'
//         }
//       }
//     };

//     const response = await admin.messaging().send(message);
//     res.send({ success: true, response });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send({ success: false, error: err.message });
//   }
// });



