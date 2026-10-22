import express from 'express';
import z from 'zod'
import { AuthMiddleware, sendResponse, signToken } from '../middleware';
import { ResponseStatus } from '../responseStatus';
import { prisma } from '../db';

const router = express.Router();

const signUpSchema = z.object({
    email: z.email(),
    username: z.string(),
    password: z.string()
})

const signInSchema = z.object({
    email: z.email(),
    password: z.string()
})

router.post('/signup',AuthMiddleware, async(req,res) => {
    const {data, success} = signUpSchema.safeParse(req.body);

    if(!success) {
        return sendResponse(res, ResponseStatus.BAD_REQUEST)
    }
    try {
        const passwordHash = await Bun.password.hash(data.password)

        const userData = await prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                username: data.username
            }
        })

        const token = await signToken(userData.id)
        res.cookie('token', token)
        return sendResponse(res,ResponseStatus.SUCCESS)

    } catch(err) {
        return sendResponse(res, ResponseStatus.INTERNAL_ERROR, err)
    }
})

router.post('/signin',AuthMiddleware, async(req,res) => {
    const {data, success} = signInSchema.safeParse(req.body);

    if(!success) {
        return sendResponse(res, ResponseStatus.BAD_REQUEST)
    }
    try {
        const userData = await prisma.user.findFirst({
            where: {
                email: data.email
            }
        })

        if(!userData) return sendResponse(res, ResponseStatus.INTERNAL_ERROR);

        const verifyPassword = await Bun.password.verify(data.password, userData.passwordHash)

        if(!verifyPassword) return sendResponse(res, ResponseStatus.INTERNAL_ERROR)

        const token = await signToken(userData.id)
        res.cookie('token', token)
        return sendResponse(res,ResponseStatus.SUCCESS)

    } catch(err) {
        return sendResponse(res, ResponseStatus.INTERNAL_ERROR, err)
    }
})

router.post('/logout', async(req,res) => {
    
})


export default router;