import express, { application } from 'express'
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

app.get('/dashboard', async(req, res) => {

    if (!req.session.user) return res.redirect('/login');

    if (!req.session.user.isAdmin) {

        const user = await prisma.users.findFirst({
            where: {
                id: req.session.user.id
            },
            include: {
                user_assignments: {
                    include: {
                        assignments: true
                    }
                }
            }
        });

        const assignments = user.user_assignments;

        return res.render('dashboard', { user, assignments })
    } else {
        return res.render('admin_dashboard', { user: req.session.user })
    }

});

app.post('/codedocs', async(req, res) => {

    //check if codedoc already exists
    let alreadyExists = await prisma.codedocs.findFirst({ where: { userid: req.body.userid, filename: req.body.filename } })

    if (!alreadyExists) {
        const savedFile = await prisma.codedocs.create({
            data: {
                id: nanoid(),
                code: req.body.code,
                created: Date.now().toString(),
                filename: req.body.filename,
                userid: req.body.userid
            }

        })
        const files = await prisma.codedocs.findMany({ where: { userid: req.body.userid, problem: '', filename: { not: '' } }})
        res.send({ message: `${req.body.filename} saved`, files, savedFile })
    } else {
        // update the record
        const savedFile = await prisma.codedocs.update(
            {
                where: { id: alreadyExists.id },
                data: {
                    code: req.body.code
                }
            }
        )

        const files = await prisma.codedocs.findMany({ where: { userid: req.body.userid, problem: '', filename: { not: '' } }})
        res.send({ message: `${req.body.filename} saved`, files, savedFile })
    }

})

app.post('/assignment', async(req, res) => {
    if (!req.session.user) return res.redirect('/')

    const currentAssignment = await prisma.assignments.findFirst({ where: { id: +req.body.id },
        include: {
            user_assignments: true,
            assignment_questions: {
                include: {
                    questions: true
                }
            }
        }
    })

    if (!currentAssignment.user_assignments.submitted) {
        return res.render('assignment', { currentAssignment, user: req.session.user })
    }

});

app.get('/assignment_code/:userid/:assignmentid/:questionid', async(req, res) => {
    const question = await prisma.questions.findFirst({ where: {
        id: +req.params.questionid
    }})

    const codedocExists = await prisma.codedocs.findFirst({ where: {
        userid: req.params.userid,
        problem: req.params.questionid,
        assignment_id: +req.params.assignmentid
    } })

    if (codedocExists) {
        return res.send({codedoc: codedocExists, question, message: 'codedoc already exists'})
    } else {
        const createCodedoc = await prisma.codedocs.create({
            data: {
                id: nanoid(),
                userid: req.params.userid,
                problem: req.params.questionid,
                filename: `${req.params.userid}:${question.title}`,
                created: Date.now().toLocaleString(),
                assignment_id: +req.params.assignmentid
            }
         })

         return res.send({codedoc: createCodedoc, question, message: 'codedoc created'})
    }
});

app.put('/assignments', async(req, res) => {
    if (!req.session.user) return res.redirect('/login')

    console.log(req.body)

    const codedocToUpdate = await prisma.codedocs.findFirst({
        where: {
            userid: req.body.userid,
            problem: req.body.question_id.toString(),
            assignment_id: req.body.assignment_id
        }
    })

    if (codedocToUpdate) {
        await prisma.codedocs.update({
            where: {
                id: codedocToUpdate.id
            },
            data: {
                code: req.body.code
            }
        })

        const question = await prisma.questions.findFirst({
            where: {
                id: req.body.question_id
            }
        })

        return res.send({ message: `${question.title} saved`})
    } else {
        return res.send({ message: "ERROR: codedoc does not exist"})
    }
});

app.post('/user_assignments/:user_assignment_id', async(req, res) => {
    if (!req.session.user) return res.redirect('/login');

    await prisma.user_assignments.update({
        where: {
            id: +req.params.user_assignment_id
        },
        data: {
            submitted: 1
        }
    })

    return res.redirect('/dashboard')
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
