const dotenv = require("dotenv");
dotenv.config();
require("./monogconfig");
require("./Cron")
const path = require("path");
const logger = require("./utils/Logger");

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

// console.log("Webhook Payment")
app.post("/api/webhook/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      console.log("🔥 Webhook triggered");
      logger.info("🔥 Webhook triggered");

      const secret = "my_super_secret_key_123";
      const body = req.body.toString("utf-8");
      const signature = req.headers["x-razorpay-signature"];

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.log("❌ Invalid signature");
        logger.warn("❌ Invalid signature");
        return res.status(400).send("Invalid signature");
      }

      const payload = JSON.parse(body);
      logger.info("📦 Payload received:", JSON.stringify(payload));
      const paymentEntity = payload.payload?.payment?.entity;

      if (!paymentEntity) {
        return res.status(200).json({ status: "ignored" });
      }

      const paymentId = paymentEntity.id;

      // ✅ Idempotency check
      const existingPayment = await Payment.findOne({
        payment_id: paymentId,
      });
      if (existingPayment) {
        logger.info("⚠️ Duplicate webhook ignored:", paymentId);
        return res.status(200).json({ status: "duplicate" });
      }

      const notes = paymentEntity.notes || {};
      const paymentType = notes.payment_type || "buy";

      // ✅ Only process successful events
      if (payload.event !== "payment.captured") {
        return res.status(200).json({ status: "ignored" });
      }

      /* -------------------------
         SAVE PAYMENT (COMMON)
      ------------------------- */
      const payment = await Payment.create({
        payment_id: paymentEntity.id,
        amount: paymentEntity.amount / 100,
        currency: paymentEntity.currency,
        payment_status: paymentEntity.status,
        payment_method: paymentEntity.method,
        user: notes.userid,
        vendor_id: notes.vendor_id,
        offer_id: notes.new_offer_id || notes.offer_id,
        payment_type: paymentType,
      });

      logger.info("✅ Payment saved:", payment._id);

      /* -------------------------
         BUY FLOW (UNCHANGED)
      ------------------------- */
      if (paymentType === "buy") {
        const offerBuy = await OfferBuy.create({
          user: notes.userid,
          offer: notes.offer_id,
          vendor: notes.vendor_id,
          payment_id: payment._id,
          status: "active",
        });

        logger.info("✅ OfferBuy (BUY) created:", offerBuy._id);
      }

      /* -------------------------
         UPGRADE FLOW (NEW)
      ------------------------- */
      if (paymentType === "upgrade") {
        const {
          old_offer_buy_id,
          new_offer_id,
          upgrade_chain_root,
        } = notes;

        // 1️⃣ Fetch old OfferBuy
        const oldOfferBuy = await OfferBuy.findOne({
          _id: old_offer_buy_id,
          status: "active",
        });

        if (!oldOfferBuy) {
          logger.info("⚠️ Old offer not found or already upgraded");
          return res.status(200).json({ status: "ignored" });
        }

        // 2️⃣ Mark old offer as upgraded
        oldOfferBuy.status = "upgraded";
        await oldOfferBuy.save();

        // 3️⃣ Create new OfferBuy (next in chain)
        const newOfferBuy = await OfferBuy.create({
          user: oldOfferBuy.user,
          offer: new_offer_id,
          vendor: oldOfferBuy.vendor,
          payment_id: payment._id,
          upgraded_from: oldOfferBuy._id,
          upgrade_chain_root:
            upgrade_chain_root || oldOfferBuy._id,
          status: "active",
        });

        logger.info("✅ Offer upgraded:", {
          from: oldOfferBuy._id,
          to: newOfferBuy._id,
        });
      }

      logger.info("🎉 Webhook processing complete");
      res.status(200).json({ status: "ok" });
    } catch (error) {
      console.error("❌ Webhook error:", error);
      logger.error("❌ Webhook error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);


app.use(express.json({ limit: "25000mb" }));
app.use(express.urlencoded({ extended: true }));
// Serving public folder for files
app.use(express.static(path.join(__dirname, "../public")));


const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.json({
    msg: "Backend is running",
    status: 200,
  });
});

app.use("/api", require("./route/VendorRoute"));
app.use("/api", require("./route/OfferRoute"));
app.use("/api", require("./route/UserRoute"));
app.use("/api", require("./route/salesRoute"));
app.use("/api", require("./route/AdminRoute"));
app.use("/api", require("./route/customerRoutes"));
app.use("/api", require("./route/categoryRoutes"));

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



