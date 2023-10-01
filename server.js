import express from 'express'
import sqlite3 from 'sqlite3'
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt'
import session from 'express-session'
import cookieParser from 'cookie-parser';
import { nanoid } from 'nanoid';

const app = express();

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

app.post('/codedocs', (req, res) => {
    db.run(`
        INSERT INTO codedocs (id, filename, userid, code, created)
        VALUES('${nanoid()}', '${req.body.filename}', '${req.body.userid}', "${req.body.code}", '${Date.now()}')
    `, (err) => {
        if (err) console.log(err)
        else console.log('codedoc saved')
    })

    res.send('codedoc saved')
})

// app.post('/events', (req, res) => {
//     return res.send('event created');
// });

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
