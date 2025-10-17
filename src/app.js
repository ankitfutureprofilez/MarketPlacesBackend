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
const crypto = require("crypto");
const Payment = require("./model/Payment");
const OfferBuy = require("./model/OfferBuy");
//Payment Webhook
console.log("Webhook Payment")

app.post("/api/webhook/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  console.log("🔥 Webhook triggered");

  const secret = "my_super_secret_key_123";
  const body = req.body.toString("utf-8");
  const signature = req.headers["x-razorpay-signature"];
  console.log("Received Signature:", signature);

  const expectedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  console.log("Expected Signature:", expectedSignature);

  if (signature === expectedSignature) {
    console.log("✅ Signature matched");
    try {
      console.log("Raw body:", body);
      const payload = JSON.parse(body);
      console.log("Parsed payload:", payload);

      const paymentEntity = payload.payload.payment?.entity;
      console.log("Payment entity extracted:", paymentEntity);

      const orderId = paymentEntity.order_id;
      console.log("Order ID:", orderId || "Standalone payment");

      const notes = paymentEntity.notes && paymentEntity.notes.length === 0 ? {} : paymentEntity.notes;
      console.log("notes", notes)

      if (!paymentEntity) {
        console.log("⚠️ No payment entity found, ignoring webhook");
        return res.status(200).json({ status: "ignored" });
      }

      if (payload.event === "payment.captured" || payload.event === "order.paid" || payload.event === "payment.authorized") {
        console.log("💰 Payment captured or order paid event");

        const records = new Payment({
          amount: paymentEntity.amount,
          currency: paymentEntity.currency,
          offer_id: paymentEntity.offer_id || "68edff002c5753929286bfac",
          user: paymentEntity.userid || "68edfb9be37a34d7bc1e2412",
          vendor_id: paymentEntity.vendor_id || "68edfeb22c5753929286bfa1",
          payment_status: paymentEntity.status,
          payment_id: paymentEntity.id,
          email: paymentEntity.email,
          contact: paymentEntity.contact,
          payment_method: paymentEntity.method,
        });


        console.log("payment record", records)

        const data = await records.save();
        console.log("✅ Payment saved:", data);


        const record = new OfferBuy({
          user: paymentEntity.userid || "68edfb9be37a34d7bc1e2412",
          offer: paymentEntity.offer || "68edff002c5753929286bfac",
          payment_id: paymentEntity.id || "",
          discount: paymentEntity.amount,
          total_amount: paymentEntity.amount + 1500,
          status: "active",
          final_amount: 1500
        });
        console.log("record offer", record)
        const offerData = await record.save();

        console.log("✅ OfferBuy saved:", offerData);

      } else if (payload.event === "payment.failed") {
        console.log("❌ Payment failed event");
        const newPayment = new Payment({
          order_id: orderId || "standalone",
          amount: paymentEntity.amount,
          currency: paymentEntity.currency,
          payment_status: paymentEntity.status,
          payment_id: paymentEntity.id,
          email: paymentEntity.email,
          contact: paymentEntity.contact,
          payment_method: paymentEntity.method,
          // notes may be empty array if standalone
          offer_id: paymentEntity.notes.offer_id || null,
          user: paymentEntity.notes.userid || null,
          vendor_id: paymentEntity.notes.vendor_id || null
        });
        const data = await newPayment.save();
        console.log("✅ Payment (failed) saved:", data);
      }
      console.log("🎉 Webhook processing complete");
      res.status(200).json({ status: "ok" });
    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    console.log("❌ Invalid signature, webhook ignored");
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



