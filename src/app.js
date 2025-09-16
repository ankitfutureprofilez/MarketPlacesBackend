const dotenv = require("dotenv");
// require("./mongoconfig");
dotenv.config();

const express = require("express");
const multer = require("multer");
const app = express();
const cors = require("cors");

const corsOptions = {
    origin: "*", // Allowed origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: '*', // Allow all headers
    credentials: true,
    optionsSuccessStatus: 200, // for legacy browsers
}

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Parsing middlewares
app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.REACT_APP_SERVER_DOMIN || 5000; // Add default port

app.get("/", (req, res) => {
    res.json({
        msg: 'Hello World',
        status: 200,
    });
});

// app.use("/api/vendor", require("./route/VendorRoute"));
// app.use("/api/offer", require("./route/OfferRoute"));
// app.use("/api/user", require("./route/UserRoute"));





const server = app.listen(PORT, () => console.log("Server is running at port : " + PORT));
server.timeout = 360000;

