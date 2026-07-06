import express from 'express'
import { iniciarSesion, obtenerPerfil } from '../controllers/authController.js'
import { protegerRuta } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/login', iniciarSesion)
router.get('/perfil', protegerRuta, obtenerPerfil)

export default router
