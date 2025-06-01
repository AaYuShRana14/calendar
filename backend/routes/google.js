const express = require('express');
const {OAuth2Client} = require('google-auth-library');
require('dotenv').config();
const User= require('../Models/user');
const jwt = require('jsonwebtoken');
const router = express.Router();
const jwtsecret = process.env.JWT_SECRET;
router.get('/google', (req, res) => {
    const authUrl = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    ).generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/calendar',
            'openid'
        ],
    });
    return res.json({ url: authUrl });
});
router.get('/google/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('No code provided');
    }
    try {
        const oauthClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        const { tokens } = await oauthClient.getToken(code);
        oauthClient.setCredentials(tokens);
        const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokens.access_token}`
    );
    const data = await response.json();
    const profile = data.name;
    const email = data.email;
    const user = await User.findOne({ email: email });
    if (!user) {
        const newUser = new User({
            email: email,
            name: profile,
            accessToken: tokens.access_token,
            });
            await newUser.save();
        } else {
            user.email = email;
            user.name = profile;
            user.accessToken = tokens.access_token;
            await user.save();
        }
        console.log('User authenticated:', user);
        const token = jwt.sign(
            { email: user.email},
            jwtsecret,
            { expiresIn: '24h' }
        );
        const url= new URL('https://calendar-seven-gilt.vercel.app/auth-redirect');
        url.searchParams.set('token', token);
        res.redirect(url.toString());

    } catch (error) {
        console.error('Error during authentication:', error);
        return res.status(500).send('Authentication failed');
    }
});
module.exports = router;