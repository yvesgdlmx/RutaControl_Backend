import express from 'express'
import { crearChofer, obtenerChoferes } from '../controllers/choferController.js'

const router = express.Router()

router.get('/', obtenerChoferes)
router.post('/', crearChofer)

export default router
