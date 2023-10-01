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

let db = new sqlite3.Database('./data.db', (err) => {
    if (err) return console.error(err.message);
    else console.log('Connection to database succesfull.');
});

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: 'SECRET',
    resave: true,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('index', { user: req.session.user });
});

app.post('/codedocs', async(req, res) => {

    //check if codedoc already exists
    let alreadyExists = await prisma.codedocs.findFirst({ where: { userid: req.body.userid, filename: req.body.filename } })

    if (!alreadyExists) {
        console.log('creating record')
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
        console.log('updating record')
        await prisma.codedocs.update(
            {
                where: { id: alreadyExists.id },
                data: {
                    code: req.body.code
                }
            }
        )
    }

    res.send('codedoc saved')
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

app.post('/login', (req, res) => {
    if (!req.body.email || !req.body.password) {
        console.log('MADE IT IN HERE')
        return res.render('login', { message: 'Invalid email / password combination' })
    }

    // LOOK FOR USER IN DB BASED ON EMAIL
    db.all(`SELECT * FROM users WHERE email = "${req.body.email}"`, [], (err, rows) => {
        // IF ERROR WITH DB CONSOLE LOG ERROR
        if (err) {
            console.log(err.message)
            return res.render('login', { message: 'Invalid email / password combination' });
        }
        else {
            // CHECK IF USER'S ENTERED PASSWORD MATCHES PASSWORD HASH IN THE DB
            const user = rows[0];

            if (user) {
                bcrypt.compare(req.body.password, user.passwordHash, (err, result) => {
                    if (err) return res.render('login', { message: 'Invalid email / password combination' });

                    if (result) {
                        req.session.user = user;
                        res.cookie('userid', user.id, { maxAge: 900000 })
                    }
                    else return res.render('login', { message: 'Invalid email / password combination' });
                    return res.redirect('/');
                })
            } else {
                return res.render('login', { message: 'Invalid email / password combination' });
            }
        }
    })
})

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.clearCookie('userid');
    return res.redirect('/login');
})

app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
