const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();
console.log("process.env.DB_URL",process.env.DB_URL)

mongoose.connect(process.env.DB_URL, {
   useNewUrlParser: true,   
    serverSelectionTimeoutMS: 5000,    
    autoIndex: false, // Don't build indexes 
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4 // Use IPv4, skip trying IPv6
                    
})
.then(() => {
   console.log('MongoDB connected successfully');
})
.catch((err) => {
   console.error('MongoDB CONNECTION ERROR =>>: ', err);
});