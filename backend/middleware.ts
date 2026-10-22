import { jwtVerify, SignJWT } from 'jose'
import type { Response, Request, NextFunction } from 'express'
import { ResponseStatus,type ResponseStatusType } from './responseStatus'

export const JWT_SECRET = new TextEncoder().encode("ABHINAV"!)

declare global {
    namespace Express {
        interface Request {
            auth?: {
                userId: string;
            };
        }
    }
}

export const signToken = (userId: string) => {
    return new SignJWT({ id: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET)
}

export const linkToken = ( orgId: string) => {
    return new SignJWT({ orgId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30m')
        .sign(JWT_SECRET)
}

export const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    
    if (req.path === '/signin') {
        
        const { email, password } = req.body;
        
        if(!email || !password) {
            return sendResponse(res, ResponseStatus.BAD_REQUEST);
        }
        
        return next()
    }
    const {username, password, email} = req.body;

    if(!username || !password || !email ) {
        return sendResponse(res, ResponseStatus.BAD_REQUEST);
    }
    next();
}

export const profileMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token
    
    if (!token) return sendResponse(res, ResponseStatus.UNAUTHORIZED)

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        
        if(typeof payload.id !== "string" ) return sendResponse(res, ResponseStatus.UNAUTHORIZED)

        req.auth = {
            userId: payload.id
        };
        
        next()
    } catch {
        return sendResponse(res, ResponseStatus.UNAUTHORIZED)
    }
}

export const sendResponse = (res: Response, rs: ResponseStatusType, data?: unknown) => {

    if (rs.status === 204) return res.status(204).send();

    return res.status(rs.status).json({
        status: rs.status,
        code: rs.code,
        message: rs.message,
        ...(data !== undefined && { data }),
    });
}