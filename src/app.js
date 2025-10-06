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
const Razorpay = require("razorpay");
const crypto = require("crypto");


// Razorpay instance
const razorpay = new Razorpay({
  key_id: "rzp_test_RQ3O3IWq0ayjsg",    // aapka Key ID
  key_secret: "RcwuasbTHAdmm1mrZTiigw2x",   // aapka Secret Key
});

app.post("/create-order", async (req, res) => {
  const options = {
    amount: 50000, // ₹500 in paise
    currency: "INR",
    receipt: "receipt#1",
  };

  try {
    const order = await razorpay.orders.create(options);
    console.log("order", order)
    res.json(order);
  } catch (err) {
    console.log(err)
    res.status(500).send(err);
  }
});


//Payment Webhook
// Only for Razorpay webhook route, use raw body
app.post(
  "/api/webhook/razorpay",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const secret = RAZORPAY_WEBHOOK_SECRET;
    const webhookBody = req.body.toString("utf-8"); 
    const signature = req.headers["x-razorpay-signature"];
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(webhookBody)
      .digest("hex");
    if (expectedSignature === signature) {
      console.log("✅ Webhook verified successfully!");
      try {
        const payload = JSON.parse(webhookBody);
        const event = payload.event;
        switch (event) {
          case "payment.captured":
            console.log("💰 Payment captured:", payload.payload.payment.entity.id);
            break;
          case "payment.failed":
            console.log("❌ Payment failed:", payload.payload.payment.entity.id);
            break;
          case "order.paid":
            console.log("📦 Order Paid:", payload.payload.order.entity.id);
            break;
          default:
            console.log("⚠️ Unhandled event:", event);
        }

        res.status(200).json({ status: "ok" });
        
      } catch (error) {
        console.error("Error processing webhook payload:", error.message);
        res.status(500).send("Internal Server Error");
      }

    } else {
      console.log("❌ Invalid signature. Possible tampering!");
      res.status(400).send("Invalid signature");
    }
  }
);


// app.use(express.json({ limit: "2000mb" }));
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

