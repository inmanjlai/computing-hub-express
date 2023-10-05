import express, { application } from 'express'
import bodyParser from 'body-parser';
import session from 'express-session'
import cookieParser from 'cookie-parser';
import { nanoid } from 'nanoid';
import { PrismaClient } from '@prisma/client'
import auth from './routers/auth.js'
import admin from './routers/admin.js'
import assignments from './routers/assignments.js'

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
app.use(auth)
app.use(admin)
app.use(assignments)

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

        const assignments = await prisma.assignments.findMany();
        const questions = await prisma.questions.findMany();
        const submissionsPreSorted = await prisma.user_assignments.findMany({
            where: {
                submitted: 1
            },
            include: {
                assignments: true,
                users: true
            }
        })

        let submissions = {}
        for (let submission of submissionsPreSorted) {
            if (submissions[submission.assignments.title] == undefined) {
                submissions[submission.assignments.title] = [submission]
            } else {
                submissions[submission.assignments.title].push(submission)
            }
        }

        const students = await prisma.users.findMany({
            where: {
                isAdmin: false
            }
        })

        return res.render('admin_dashboard', { user: req.session.user, assignments, questions, submissions, students })
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

app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
