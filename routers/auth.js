import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt'
import session from 'express-session'
import cookieParser from 'cookie-parser';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient()

const app = Router();

app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login');
});

app.get('/signup', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('signup');
})

app.post('/login', async(req, res) => {
    if (!req.body.email || !req.body.password) {
        return res.render('login', { message: 'Please fill out all required fields' })
    }

    // find user if exists
    let user = await prisma.users.findFirst({
        where: {
            email: req.body.email
        }
    });

    // if user exists, then try to log in based on password provided
    if (user) {
        let correctPassword = bcrypt.compare(req.body.password, user.passwordHash);

        if (correctPassword) {
            req.session.user = user;
            res.cookie('userid', user.id, { maxAge: 900000 })
            return res.redirect('/')
        } else {
            return res.render('login', { message: "Invalid email / password combination" })
        }
    }

    return res.render('login', { message: "Invalid email / password combination" })
})

app.post('/signup', async(req, res) => {
    if (req.body.password != req.body['confirm-password']) return res.render('signup', {message: 'Both password fields must match'})

    bcrypt.hash(req.body.password, 10, async(err, hash) => {
        if (err) return res.render('signup', {message: err})
        let passwordHash = hash;
        let createdUser = await prisma.users.create({
            data: {
                id: nanoid(),
                username: req.body.username,
                name: req.body.name,
                email: req.body.email,
                passwordHash: passwordHash
            }
        })

        req.session.user = createdUser;
        res.cookie('userid', req.session.user.id, { maxAge: 900000 })
        return res.redirect('/')
    })
})

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.clearCookie('userid');
    return res.redirect('/login');
})

export default app;