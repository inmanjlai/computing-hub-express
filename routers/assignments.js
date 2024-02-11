import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt'
import session from 'express-session'
import cookieParser from 'cookie-parser';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient()

const app = Router();

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

app.post('/user_assignments/:assignment_id/:user_id', async(req, res) => {
    if (!req.session.user) return res.redirect('/login');

    console.log("assignment_id", req.params.assignment_id)
    console.log("user_id", req.params.user_id)

    let user_assignment_to_update = await prisma.user_assignments.findFirst({
        where: {
            user_id: req.params.user_id,
            assignment_id: +req.params.assignment_id
        }
    })

    await prisma.user_assignments.update({
        where: {
            id: user_assignment_to_update.id
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

export default app;
