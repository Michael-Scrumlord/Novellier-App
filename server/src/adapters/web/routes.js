import { Router } from 'express';
import { asyncHandler
    //errorMiddleware 
} from './error-handling.js';


export const createRoutes = ({
    //aiController,
    authController
}) => {
    const router = Router();

    const bind = (controller, method) => asyncHandler(controller[method].bind(controller));

    router.post('/api/auth/login', bind(authController, 'login'));
    router.post('/api/auth/logout', bind(authController, 'logout'));

    // TODO: Express error-handling middleware last

    return router;
};
