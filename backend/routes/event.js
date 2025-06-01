const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const {OAuth2Client} = require('google-auth-library');
const {z}= require('zod');
const User = require('../Models/user');
const isLoggedin = require('../Middleware/isLoggedin');
require('dotenv').config();

const meetingSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must not exceed 15 digits"),
    date: z.string().refine(date => !isNaN(Date.parse(date)), "Invalid date format"),
    time: z.string().refine(time => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time), "Invalid time format")
});

router.post('/create', isLoggedin, async (req, res) => {
    try {
        const { name, phone, date, time } = req.body;
        const data = meetingSchema.safeParse({ name, phone, date, time });
        if (!data.success) {
            return res.status(400).json({ error: data.error.errors[0].message });
        }
        const user = await User.findOne({ email: res.user });
        if (!user || !user.accessToken) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const bookerOAuthClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        bookerOAuthClient.setCredentials({
            access_token: user.accessToken,
        });
        const bookerCalendar = google.calendar({ version: 'v3', auth: bookerOAuthClient });
        const startDateTime = new Date(`${date}T${time}:00`).toISOString();
        const endDateTime = new Date(new Date(`${date}T${time}:00`).getTime() + 60 * 60 * 1000).toISOString();
        const existingEvents = await bookerCalendar.events.list({
            calendarId: 'primary',
            timeMin: startDateTime,
            timeMax: endDateTime,
            singleEvents: true,
        });
        if (existingEvents.data.items && existingEvents.data.items.length > 0) {
            return res.status(409).json({ error: "An event already exists for the specified date and time." });
        }
        const event = {
            summary: `Meeting with ${name}`,
            description: `Phone: ${phone}`,
            start: {
                dateTime: startDateTime,
                timeZone: 'Asia/Kolkata'
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'Asia/Kolkata'
            },
        };
        const bookerEvent = await bookerCalendar.events.insert({
            calendarId: 'primary',
            requestBody: event
        });

        console.log('Event created successfully');
        res.status(200).json({
            message: "Event created successfully",
            bookerEventId: bookerEvent.data.id,
            bookerEventLink: bookerEvent.data.htmlLink,
        });

    } catch (error) {
        console.error('Error creating event:', error);

        if (error.code === 401) {
            return res.status(401).json({ error: "Authentication failed. Please re-authenticate with Google." });
        }

        if (error.code === 403) {
            return res.status(403).json({ error: "Calendar access denied. Please check permissions." });
        }

        if (error.message && error.message.includes('invalid_grant')) {
            return res.status(401).json({ error: "Token expired. Please re-authenticate." });
        }

        res.status(500).json({ error: "Failed to create event" });
    }
});


router.get('/', isLoggedin, async (req, res) => {
    try {
        const user = await User.findOne({ email: res.user });
        if (!user || !user.accessToken) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const oauthClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        oauthClient.setCredentials({
            access_token: user.accessToken,
        });
        const calendar = google.calendar({ version: 'v3', auth: oauthClient });
        const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });
        res.status(200).json(events.data.items);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: "Failed to fetch events" });
    }
});

router.delete('/delete/:eventId', isLoggedin, async (req, res) => {
    try {
        const { eventId } = req.params;
        const user = await User.findOne({ email: res.user });
        if (!user || !user.accessToken) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const oauthClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        oauthClient.setCredentials({
            access_token: user.accessToken,
        });
        const calendar = google.calendar({ version: 'v3', auth: oauthClient });
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });
        res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: "Failed to delete event" });
    }
});
router.put('/update/:eventId', isLoggedin, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { name, phone, date, time } = req.body;
        const data = meetingSchema.safeParse({ name, phone, date, time });
        if (!data.success) {
            return res.status(400).json({ error: data.error.errors[0].message });
        }
        const user = await User.findOne({ email: res.user });
        if (!user || !user.accessToken) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const oauthClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        oauthClient.setCredentials({
            access_token: user.accessToken,
        });
        const calendar = google.calendar({ version: 'v3', auth: oauthClient });
        const event = {
            summary: `Meeting with ${name}`,
            description: `Phone: ${phone}`,
            start: {
                dateTime: new Date(`${date}T${time}:00`).toISOString(),
                timeZone: 'Asia/Kolkata'
            },
            end: {
                dateTime: new Date(new Date(`${date}T${time}:00`).getTime() + 60 * 60 * 1000).toISOString(),
                timeZone: 'Asia/Kolkata'
            },
        };
        await calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            requestBody: event
        });
        res.status(200).json({ message: "Event updated successfully" });
    } catch (error) {
        console.error('Error updating event:');
        res.status(500).json({ error: "Failed to update event" });
    }
});
module.exports = router;