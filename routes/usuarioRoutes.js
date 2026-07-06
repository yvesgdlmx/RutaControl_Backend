import express from 'express'
import { actualizarUsuario, crearUsuario, eliminarUsuario, obtenerUsuarios } from '../controllers/usuarioController.js'

const router = express.Router()

router.get('/', obtenerUsuarios)
router.post('/', crearUsuario)
router.put('/:id', actualizarUsuario)
router.delete('/:id', eliminarUsuario)

export default router
