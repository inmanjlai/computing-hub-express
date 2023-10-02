import express from 'express'
import sqlite3 from 'sqlite3'
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt'
import session from 'express-session'
import cookieParser from 'cookie-parser';
import { nanoid } from 'nanoid';
import { PrismaClient } from '@prisma/client'

const app = express();
const prisma = new PrismaClient()

const PORT = 8080;

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: 'SECRET',
    resave: true,
    saveUninitialized: true
}));

app.get('/', async(req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const files = await prisma.codedocs.findMany({
        where: {
            userid: req.session.user.id,
            problem: '',
            filename: {
                not: ''
            }
        }
    })

    res.render('index', { user: req.session.user, files });
});

app.post('/codedocs', async(req, res) => {

    //check if codedoc already exists
    console.log(req.body.userid, req.session.user.id)

    let alreadyExists = await prisma.codedocs.findFirst({ where: { userid: req.body.userid, filename: req.body.filename } })

    if (!alreadyExists) {
        await prisma.codedocs.create({
            data: {
                id: nanoid(),
                code: req.body.code,
                created: Date.now().toString(),
                filename: req.body.filename,
                userid: req.body.userid
            }
        })
    } else {
        // update the record
        await prisma.codedocs.update(
            {
                where: { id: alreadyExists.id },
                data: {
                    code: req.body.code
                }
            }
        )
    }

    const files = await prisma.codedocs.findMany({ where: { userid: req.body.userid, problem: '', filename: { not: '' } }})
    res.send({ message: `${req.body.filename} saved`, files })
})

app.post('/events', async(req, res) => {
    await prisma.events.create({
        data: {...req.body, id: nanoid()}
    })
    return res.send('event created');
});

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

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.clearCookie('userid');
    return res.redirect('/login');
})

app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
