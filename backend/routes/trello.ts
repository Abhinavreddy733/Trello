import express from 'express';
import z from 'zod'
import { JWT_SECRET, linkToken, profileMiddleware, sendResponse } from '../middleware';
import { ResponseStatus } from '../responseStatus';
import { prisma } from '../db';
import { Prisma } from '../generated/prisma/client';
import { handlePrismaError } from '../handlePrismaError';
import { jwtVerify } from 'jose';

const router = express.Router();

// Organization
// Board
// Sections
// Issue

const orgCreateSchema = z.object({
    name: z.string()
})

const updateOrgSchema = z.object({
    name: z.string(),
    orgId: z.string()
})

const linkSchema = z.object({
    orgId: z.string()
})

const joinOrgSchema = z.object({
    token: z.string()
})

router.get('/organization',profileMiddleware, async (req,res) => {
    try {
        const userId = req.auth?.userId

        const ownerData = await prisma.membership.findMany({
            where: {
                userId: userId
            }
        })

        if(!ownerData) return res.status(204).json({
            message: "No Organizations Found"
        })
        return sendResponse(res, ResponseStatus.SUCCESS, ownerData)
    } catch(err) {
        if(handlePrismaError(err, res)) return
        return sendResponse(res, ResponseStatus.INTERNAL_ERROR, err)
    }
})

router.post('/organization', profileMiddleware, async (req, res) => {
    const {data, success} = orgCreateSchema.safeParse(req.body);

    if(!success) return sendResponse(res, ResponseStatus.BAD_REQUEST);

    if(!req.auth) return sendResponse(res, ResponseStatus.UNAUTHORIZED)

    try {
        const orgData = await prisma.organization.create({
            data: {
                name: data.name,
                ownerId: req.auth?.userId,
                memberships: {
                    create: {
                        userId: req.auth?.userId,
                        role: "ADMIN"
                    }
                }
            }
        })
        return sendResponse(res, ResponseStatus.SUCCESS, orgData)
    } catch(error) {
        if(handlePrismaError(error, res)) return
        return sendResponse(res, ResponseStatus.INTERNAL_ERROR, error)
    }
})

router.put('/organization', profileMiddleware, async (req, res) => {
    const {data, success} = updateOrgSchema.safeParse(req.body);

    if(!success) return sendResponse(res, ResponseStatus.BAD_REQUEST);

    if(!req.auth) return sendResponse(res, ResponseStatus.UNAUTHORIZED)

    try {
        const orgData = await prisma.organization.findFirst({
            where: { id: data.orgId, ownerId: req.auth.userId }
        })

        if(!orgData) return sendResponse(res, ResponseStatus.NOT_FOUND);

        const updateOrg = await prisma.organization.update({
            where: { id: data.orgId, ownerId: req.auth.userId },
            data: {
                name: data.name
            },
            select: {
                name: true
            }
        })

        return sendResponse(res, ResponseStatus.SUCCESS, updateOrg)
    } catch(error) {
        if(handlePrismaError(error, res)) return
        return sendResponse(res, ResponseStatus.INTERNAL_ERROR, error)
    }
})

router.get('/orgShareLink',profileMiddleware, async (req, res) => {
    const { data, success } = linkSchema.safeParse(req.body);

    if(!success) return sendResponse(res, ResponseStatus.BAD_REQUEST)
    
    if(!req.auth?.userId) return sendResponse(res, ResponseStatus.UNAUTHORIZED)
    
    const userId = req.auth.userId
    try {
        const createLink = await linkToken(data.orgId);

        return sendResponse(res, ResponseStatus.SUCCESS, createLink);
    } catch(error) {
        if(handlePrismaError(error, res)) return
        return sendResponse(res, ResponseStatus.INTERNAL_ERROR, error)
    }
})

router.post('/joinOrg',profileMiddleware, async (req,res) => {
    const { data, success } = joinOrgSchema.safeParse(req.body);

    if(!success) return sendResponse(res, ResponseStatus.BAD_REQUEST);

    if(!req.auth) return sendResponse(res, ResponseStatus.UNAUTHORIZED);

    const token = data.token;
    const userId = req.auth.userId;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);

        if(typeof payload.orgId !== "string" || payload.orgId) return sendResponse(res, ResponseStatus.BAD_REQUEST);

        const OrgId = payload.orgId

        const joinMember = await prisma.membership.create({
            data: {
                orgId: OrgId,
                userId: userId,
                role: "MEMBER"
            }
        })

        return sendResponse(res, ResponseStatus.SUCCESS, joinMember)
    } catch(error) {
        if(handlePrismaError(error, res)) return
        return sendResponse(res, ResponseStatus.INTERNAL_ERROR, error)
    }

})


export default router;