const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Buyer = require('./Schema/Buyer_model');
const Seller = require('./Schema/Seller_model');
const { authenticateBuyer } = require('./middleware');
const { authenticateSeller } = require('./middleware');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
// Connect to MongoDB
mongoose.connect('mongourl')
    .then(() => { console.log("DB Connected") })
    .catch(() => console.log("DB not connected"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'goli.upma@gmail.com',
        pass: 'Assessment@1234',
    },
});

const generateOTP = () => {
    return speakeasy.totp({
        secret: speakeasy.generateSecret().base32,
        encoding: 'base32',
    });
};


app.post('/buyer/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const otp = generateOTP();
        const buyer = await Buyer.findOne({ username: email });
        if (!buyer) {
            return res.status(404).json({ error: 'Buyer not found' });
        }

        buyer.otp = otp;
        await buyer.save();

        const mailOptions = {
            from: 'goli.upma@gmail.com',
            to: email,
            subject: 'Your OTP for Buyer Login',
            text: `Your OTP is ${otp}. It will expire in 2 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/buyer/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const buyer = await Buyer.findOne({ username: email });
        if (!buyer) {
            return res.status(401).json({ error: 'Invalid username for buyer' });
        }

        const isValidOTP = speakeasy.totp.verify({
            secret: buyer.otp,
            encoding: 'base32',
            token: otp,
        });

        if (isValidOTP) {
            await Buyer.findOneAndUpdate({ username: email }, { otp: null });
            let payload = { user: { id: buyer.id, role: 'buyer' } };
            const token = jwt.sign(payload, 'secretkey', { expiresIn: '1h' });
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Register Route for Buyer
app.post('/buyer/register', async (req, res) => {
    try {
        const { name, username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        let exist = await Buyer.findOne({ username });
        if (exist) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        else {
            const buyer = new Buyer({
                name,
                username,
                password: hashedPassword,
            });

            await buyer.save();
            res.status(201).json({ message: 'Buyer registered successfully' });
        }

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register Route for Seller
app.post('/seller/register', async (req, res) => {
    try {
        const { name, username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        let exist = await Seller.findOne({ username });
        if (exist) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        else {
            const seller = new Seller({
                name,
                username,
                password: hashedPassword,
            });

            await seller.save();
            res.status(201).json({ message: 'Seller registered successfully' });
            // alert('Seller registered successfully')
        }

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});




// Login Route for Buyer
app.post('/buyer/login', async (req, res) => {
    try {
        const { username, useOTP, password } = req.body;
        const buyer = await Buyer.findOne({ username });

        if (!buyer) {
            return res.status(401).json({ error: 'Invalid username for buyer' });
        }

        if (useOTP) {
            await axios.post('http://localhost:8080/buyer/send-otp', { email: username });
            res.status(200).json({ message: 'OTP sent successfully. Use it for login.' });
        } else {
            if (!(bcrypt.compare(password, buyer.password))) {
                return res.status(401).json({ error: 'Invalid password for buyer' });
            }

            let payload = { user: { id: buyer.id, role: 'buyer' } };
            const token = jwt.sign(payload, 'secretkey', { expiresIn: '1h' });
            res.json({ token });
        }
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login Route for Seller
app.post('/seller/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const seller = await Seller.findOne({ username });

        if (!seller) {
            return res.status(401).json({ error: 'Invalid username for buyer' });
        }

        if (!(bcrypt.compare(password, seller.password))) {
            return res.status(401).json({ error: 'Invalid password for buyer' });
        }
        let payload = { user: { id: seller.id, role: 'seller' } };
        const token = jwt.sign(payload, 'secretkey', { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/buyer/profile', authenticateBuyer, async (req, res) => {
    try {
        const exist = await Buyer.findById(req.user.id);
        if (!exist) {
            return res.status(401).json({ error: 'Invalid username for buyer' });
        }
        res.json(exist);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/seller/profile', authenticateSeller, async (req, res) => {
    try {
        const exist = await Seller.findById(req.user.id);
        if (!exist) {
            return res.status(401).json({ error: 'Invalid username for seller' });
        }
        res.json(exist);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
