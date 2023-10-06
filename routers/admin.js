import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt'
import session from 'express-session'
import cookieParser from 'cookie-parser';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient()

const app = Router();

app.post('/assignments/create', async(req, res) => {
    if (!req.session.user) return res.redirect('/login')

    if (!req.body.questions) {
        return res.status(400).send({message: "ERROR: Please assign at least one question to the assignment"})
    }

    const newAssignment = await prisma.assignments.create({
        data: {
            title: req.body.title
        }
    })


    req.body.questions.forEach(async(id) => {
        let newAssociation = await prisma.assignment_questions.create({
            data: {
                assignment_id: newAssignment.id,
                question_id: +id
            }
        })

    })

    if (req.body.users) {
        req.body.users.forEach(async(id) => {
            let newAssociation = await prisma.user_assignments.create({
                data: {
                    assignment_id: newAssignment.id,
                    user_id: id
                }
            })

        })
    }

    return res.redirect('/dashboard')

});

app.post('/questions/create', async(req, res) => {
    if (!req.session.user) return res.redirect('/login')

    await prisma.questions.create({
        data: {
            title: req.body.title,
            description: req.body.description,
            points: +req.body.points
        }
    })

    return res.redirect('/dashboard')
});

export default app;

app.post('/assignments/delete', async(req, res) => {

    try {
        await prisma.assignments.delete({
            where: {
                id: +req.body.id
            }
        })
    } catch (err) {
        console.log(err)
    }

    return res.redirect('/dashboard')

});

app.post('/questions/delete', async(req, res) => {

    try {
        await prisma.questions.delete({
            where: {
                id: +req.body.id
            }
        })
    } catch (err) {
        console.log(err)
    }

    return res.redirect('/dashboard')

});

app.get('/questions/:assignment_id', async(req, res) => {
    if (!req.session.user) return res.redirect('/login')

    const questions = await prisma.assignment_questions.findMany({
        where: {
            assignment_id: +req.params.assignment_id
        },
        include: {
            questions: true
        }
    })

    const questionsToSend = []

    for (let i = 0; i < questions.length; i++) {
        let question = questions[i];

        let codedoc = await prisma.codedocs.findFirst({
            where: {
                problem: question.question_id.toString(),
                assignment_id: +question.assignment_id
            }
        })

        let reworkedQuestion = {...question, codedoc}
        console.log(reworkedQuestion)
        questionsToSend.push(reworkedQuestion)
    }


    console.log("HERE", questionsToSend)
    return res.send(questionsToSend)

});
