const express= require('express');
const cors= require('cors');
const app= express();
app.use(cors());
const connectDB = require('./config/db');
app.use(express.json());
app.use('/auth', require('./routes/google'));
app.use('/event', require('./routes/event'));

connectDB();
app.listen(8000, () => {
    console.log('Server is running on port 8000');
}
);