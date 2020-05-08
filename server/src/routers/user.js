import express from 'express';
import EV from 'express-validator';
import * as UserModel from '../models/user.js';
import auth from '../middleware/auth.js';
import { errorHandler500 } from '../utils/errorHandling.js';

const userRouter = express.Router();

userRouter.post(
  '/users',
  [
    EV.check('username').trim().notEmpty().withMessage('field is required'),
    EV.check('password')
      .notEmpty()
      .withMessage('field is required')
      .bail()
      .isLength({ min: 6 })
      .withMessage('password needs to be at least 6 characters long'),
    EV.check('name').trim().notEmpty().withMessage('field is required'),
  ],
  (req, res) => {
    // create a new user

    const validationErrors = EV.validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(400).send({ errors: validationErrors.array() });
    }

    try {
      const { username, name, password, role_id = UserModel.ROLE.USER } = req.body;

      const user = UserModel.createUser({
        username,
        name,
        password,
        role_id,
      });

      res.status(201).send(UserModel.sanitizeUserObject(user));
    } catch (error) {
      errorHandler500(error, res);
    }
  },
);

userRouter.get('/users', auth, (req, res) => {
  // get all users

  if (req.user.role_id === UserModel.ROLE.USER) {
    // forbidden
    return res.status(403).send();
  }

  try {
    const users = UserModel.getAllUsers();

    res.status(200).send(users.map(UserModel.sanitizeUserObject));
  } catch (error) {
    errorHandler500(error, res);
  }
});

userRouter.get('/users/:id', auth, (req, res) => {
  // get user profile

  const userId = req.params.id;

  if (req.user.id !== userId && req.user.role_id === UserModel.ROLE.USER) {
    // forbidden
    return res.status(403).send();
  }

  try {
    const user = UserModel.getUserById(userId);

    if (user) {
      res.status(200).send(UserModel.sanitizeUserObject(user));
    } else {
      res.status(404).send({ error: 'Not found' });
    }
  } catch (error) {
    errorHandler500(error, res);
  }
});

userRouter.patch(
  '/users/:id',
  auth,
  [
    EV.check('name').optional().trim().notEmpty().withMessage('field cannot be empty'),
    EV.check('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('password needs to be at least 6 characters long'),
  ],
  (req, res) => {
    // edit user profile

    const validationErrors = EV.validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(400).send({ errors: validationErrors.array() });
    }

    const userId = req.params.id;

    if (req.user.id !== userId && req.user.role_id === UserModel.ROLE.USER) {
      // forbidden
      return res.status(403).send();
    }

    const { name, password, role_id } = req.body;

    try {
      const user = UserModel.getUserById(userId);

      if (!user || user.archived_at) {
        return res.status(404).send({ error: 'Not found' });
      }

      const updatedUser = UserModel.updateUser(userId, {
        name,
        password,
        role_id,
      });

      res.status(200).send(UserModel.sanitizeUserObject(updatedUser));
    } catch (error) {
      errorHandler500(error, res);
    }
  },
);

userRouter.delete('/users/:id', auth, (req, res) => {
  // delete user profile

  const userId = req.params.id;

  if (req.user.role_id === UserModel.ROLE.USER) {
    // forbidden
    return res.status(403).send();
  }

  try {
    const info = UserModel.deleteUser(userId);

    if (info.changes) {
      res.status(204).send();
    } else {
      res.status(404).send({ error: 'Not found' });
    }
  } catch (error) {
    errorHandler500(error, res);
  }
});

export default userRouter;
