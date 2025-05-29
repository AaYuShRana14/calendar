const express = require('express');
const User= require('../Models/user');
const { google } = require('googleapis');
const router = express.Router();
const oauthClient = require('../config/googleConfig');
router.get('/google', (req, res) => {
    const authUrl = oauthClient.generateAuthUrl({
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
        const { tokens } = await oauthClient.getToken(code);
        await oauthClient.setCredentials(tokens);
        const people = google.people({ version: 'v1', auth: oauthClient });
        const { data } = await people.people.get({ resourceName: 'people/me', personFields: 'names,emailAddresses' });
        const profile = data.names[0].displayName;
        const email = data.emailAddresses[0].value;
        const user = await User.findOne({ email: email });
        if (!user) {
            const newUser = new User({
                googleId: data.resourceName,
                email: email,
                name: profile,
                accessToken: tokens.access_token,
            });
            await newUser.save();
        }
        else {
            user.googleId = data.resourceName;
            user.email = email;
            user.name = profile;
            user.accessToken = tokens.access_token;
            await user.save();
        }
        const token = tokens.id_token;
        return res.redirect('http://localhost:3000' + "auth-redirect?token=" + token);

    } catch (error) {
        console.error('Error during authentication:', error);
        return res.status(500).send('Authentication failed');
    }
});
module.exports = router;